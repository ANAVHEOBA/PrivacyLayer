/**
 * ZK-098: Manifest-Aware Off-Chain Verification Helper
 *
 * Off-chain verification is more useful when it can explain *why* it failed.
 * This module adds a pre-verification layer that checks artifact provenance
 * and public-input schema before delegating to the cryptographic backend.
 *
 * Failure categories (OfflineVerificationFailureCategory):
 *
 *   BAD_ARTIFACT — The supplied artifact set does not match the manifest.
 *                  Indicates a bytecode, ABI, circuit-ID, or path mismatch.
 *                  Detected before any cryptography is attempted.
 *
 *   BAD_SCHEMA   — The manifest's declared public-input schema is
 *                  incompatible with the SDK's WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
 *                  or the caller passed a raw string[] instead of named fields
 *                  so canonical field ordering cannot be enforced.
 *
 *   BAD_PROOF    — The artifact set and schema are consistent but the
 *                  Groth16 / Barretenberg backend rejected the proof.
 *
 * The entry-point function `verifyWithManifest` only resolves (returns true)
 * when all three layers pass.  Every failure path throws an
 * `OfflineVerificationError` with a stable `category` field so callers can
 * branch on failure kind without string-matching error messages.
 *
 * @see sdk/src/backends/noir.ts  — assertManifestMatchesNoirArtifacts
 * @see sdk/src/encoding.ts       — WITHDRAWAL_PUBLIC_INPUT_SCHEMA
 * @see sdk/src/withdraw.ts       — buildWithdrawalPublicInputLayout
 */

import { VerifyingBackend, PreparedWitness } from './proof';
import { WithdrawalPublicInputs, WITHDRAWAL_PUBLIC_INPUT_SCHEMA } from './encoding';
import { buildWithdrawalPublicInputLayout } from './withdraw';
import {
  NoirArtifacts,
  ZkArtifactManifest,
  ZkArtifactManifestCircuit,
  assertManifestMatchesNoirArtifacts,
  ArtifactManifestError,
} from './backends/noir';

// ---------------------------------------------------------------------------
// Failure taxonomy
// ---------------------------------------------------------------------------

/**
 * Stable failure categories emitted by `verifyWithManifest`.
 *
 * | Category       | Root cause                                             |
 * |----------------|--------------------------------------------------------|
 * | BAD_ARTIFACT   | Bytecode/ABI/path/circuit-ID mismatch vs manifest      |
 * | BAD_SCHEMA     | Public-input schema incompatible with manifest/SDK     |
 * | BAD_PROOF      | Cryptographic verification rejected the proof          |
 */
export type OfflineVerificationFailureCategory =
  | 'BAD_ARTIFACT'
  | 'BAD_SCHEMA'
  | 'BAD_PROOF';

/**
 * Thrown by `verifyWithManifest` for all failure paths.
 * Inspect `.category` to determine the failure kind without
 * parsing error messages.
 */
export class OfflineVerificationError extends Error {
  constructor(
    message: string,
    public readonly category: OfflineVerificationFailureCategory,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OfflineVerificationError';
  }
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface OfflineVerifyOptions {
  /**
   * Optional artifact file path to cross-check against the manifest entry.
   * When supplied, the manifest's `path` field for the circuit must match.
   * Omit to skip path validation.
   */
  artifactPath?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compares the manifest's declared public-input schema against the SDK's
 * canonical `WITHDRAWAL_PUBLIC_INPUT_SCHEMA`.
 * Throws `OfflineVerificationError(BAD_SCHEMA)` if they diverge.
 */
function assertSchemaCompatible(
  circuitName: string,
  manifestCircuit: ZkArtifactManifestCircuit,
): void {
  const { public_input_schema: manifestSchema } = manifestCircuit;
  if (!manifestSchema || manifestSchema.length === 0) {
    // Manifest does not declare a schema — skip comparison.
    return;
  }

  const sdkSchema = Array.from(WITHDRAWAL_PUBLIC_INPUT_SCHEMA);

  if (
    manifestSchema.length !== sdkSchema.length ||
    manifestSchema.some((field, i) => field !== sdkSchema[i])
  ) {
    throw new OfflineVerificationError(
      `Public-input schema mismatch for circuit "${circuitName}": ` +
        `manifest declares [${manifestSchema.join(', ')}] ` +
        `but SDK expects [${sdkSchema.join(', ')}]`,
      'BAD_SCHEMA',
    );
  }
}

/**
 * Guard that rejects a raw `string[]` at the public-inputs boundary.
 * A named-field object is required so canonical schema ordering can be
 * enforced without ambiguity.
 */
function assertNamedPublicInputs(
  publicInputs: WithdrawalPublicInputs | PreparedWitness | string[],
): asserts publicInputs is WithdrawalPublicInputs | PreparedWitness {
  if (Array.isArray(publicInputs)) {
    throw new OfflineVerificationError(
      'Public inputs must be provided as named fields (WithdrawalPublicInputs or PreparedWitness), ' +
        'not a raw string[]. Schema ordering cannot be enforced without field names.',
      'BAD_SCHEMA',
    );
  }
}

// ---------------------------------------------------------------------------
// Primary entry point
// ---------------------------------------------------------------------------

/**
 * verifyWithManifest
 *
 * Manifest-aware off-chain verification helper (ZK-098).
 *
 * Performs three ordered checks before accepting a proof as valid:
 *
 * 1. **Artifact check** — Validates bytecode, ABI, circuit-ID, name, and
 *    (optionally) artifact path against the loaded manifest.  Throws
 *    `OfflineVerificationError('BAD_ARTIFACT')` on any mismatch.
 *
 * 2. **Schema check** — If the manifest circuit entry carries a
 *    `public_input_schema`, it must exactly match
 *    `WITHDRAWAL_PUBLIC_INPUT_SCHEMA`.  Raw `string[]` inputs are also
 *    rejected here.  Throws `OfflineVerificationError('BAD_SCHEMA')`.
 *
 * 3. **Cryptographic check** — Delegates to the injected `VerifyingBackend`.
 *    Both a `false` return value and a thrown exception are normalised to
 *    `OfflineVerificationError('BAD_PROOF')`.
 *
 * @param proof         Proof bytes to verify.
 * @param publicInputs  Named withdrawal public inputs (not raw string[]).
 * @param artifacts     Compiled circuit artifacts (bytecode / ABI / vkey).
 * @param manifest      Loaded ZK artifact manifest.
 * @param circuitName   Key in `manifest.circuits` to validate against.
 * @param backend       Verifying backend instance.
 * @param options       Optional artifact path for extra manifest cross-check.
 *
 * @returns `true` — only resolves when all three checks pass.
 * @throws  `OfflineVerificationError` for any failure.
 */
export async function verifyWithManifest(
  proof: Uint8Array,
  publicInputs: WithdrawalPublicInputs | PreparedWitness | string[],
  artifacts: NoirArtifacts,
  manifest: ZkArtifactManifest,
  circuitName: string,
  backend: VerifyingBackend,
  options: OfflineVerifyOptions = {},
): Promise<true> {
  // ------------------------------------------------------------------
  // Step 1: Artifact provenance check
  // ------------------------------------------------------------------
  let manifestCircuit: ZkArtifactManifestCircuit;
  try {
    manifestCircuit = assertManifestMatchesNoirArtifacts(
      manifest,
      circuitName,
      artifacts,
      options.artifactPath,
    );
  } catch (err) {
    if (err instanceof ArtifactManifestError) {
      throw new OfflineVerificationError(err.message, 'BAD_ARTIFACT', err);
    }
    // Re-wrap unexpected errors so callers always receive OfflineVerificationError.
    throw new OfflineVerificationError(
      `Unexpected artifact validation error: ${err instanceof Error ? err.message : String(err)}`,
      'BAD_ARTIFACT',
      err,
    );
  }

  // ------------------------------------------------------------------
  // Step 2: Public-input schema check
  // ------------------------------------------------------------------
  assertNamedPublicInputs(publicInputs);
  assertSchemaCompatible(circuitName, manifestCircuit);

  // ------------------------------------------------------------------
  // Step 3: Cryptographic verification
  // ------------------------------------------------------------------
  const inputLayout = buildWithdrawalPublicInputLayout(publicInputs);

  let verified: boolean;
  try {
    verified = await backend.verifyProof(proof, inputLayout.fields, artifacts);
  } catch (err) {
    throw new OfflineVerificationError(
      `Proof verification backend error: ${err instanceof Error ? err.message : String(err)}`,
      'BAD_PROOF',
      err,
    );
  }

  if (!verified) {
    throw new OfflineVerificationError(
      'Proof verification failed: proof is invalid for the supplied public inputs',
      'BAD_PROOF',
    );
  }

  return true;
}

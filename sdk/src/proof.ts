/**
 * proof.ts
 *
 * ZK-029: Extended withdrawal proof schema with an explicit `pool_id` public input.
 *
 * All proof generation / verification helpers for PrivacyLayer live here.
 */

import { groth16 } from "snarkjs";
import { buildWithdrawWitness } from "./witness";
import { WithdrawParams, ProofArtifacts } from "./withdraw";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Public inputs that are embedded in (and verified against) a withdrawal proof.
 *
 * ZK-029 adds `pool_id` so that proof semantics are unambiguous and
 * pool-scoped values do not depend on off-chain conventions alone.
 */
export interface WithdrawPublicInputs {
  /** Unique spend tag – prevents double-spending.  Derived as H(secret, pool_id). */
  nullifier_hash: string;
  /** Commitment Merkle-tree root at prove-time. */
  merkle_root: string;
  /** Withdrawal destination (hex address or felt252). */
  recipient: string;
  /** Amount being withdrawn (decimal string). */
  amount: string;
  /**
   * ZK-029 – Explicit pool identifier.
   * Domain-separates nullifiers and proof semantics across pools.
   */
  pool_id: string;
}

/**
 * Full witness / input bundle handed to the prover backend.
 * Combines public inputs with private witnesses.
 */
export interface WithdrawProofInputs extends WithdrawPublicInputs {
  // ── Private witnesses ───────────────────────────────────────────────────
  /** Note secret (pre-image of the commitment leaf). */
  secret: string;
  /** Sibling hashes along the Merkle authentication path. */
  path_elements: string[];
  /** Left/right selector bits for each Merkle level (0 = left, 1 = right). */
  path_indices: number[];
}

/**
 * A fully-generated withdrawal proof ready for on-chain submission.
 */
export interface WithdrawProof {
  /** Groth16 / UltraPlonk proof bytes (backend-specific encoding). */
  proof: Uint8Array | string;
  /** Ordered public inputs as decimal strings. */
  publicInputs: string[];
  /** Structured public inputs for convenience / ABI encoding. */
  publicSignals: WithdrawPublicInputs;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Ordered list of public input names – must match the circuit's main() signature. */
export const WITHDRAW_PUBLIC_INPUT_FIELDS: Array<keyof WithdrawPublicInputs> = [
  "nullifier_hash",
  "merkle_root",
  "recipient",
  "amount",
  "pool_id", // ZK-029
];

// ---------------------------------------------------------------------------
// Proof generation
// ---------------------------------------------------------------------------

/**
 * Generate a Groth16 withdrawal proof.
 *
 * @param inputs  - Complete witness bundle including the new `pool_id` field.
 * @param wasmPath - Path (or URL) to the circuit WASM.
 * @param zkeyPath - Path (or URL) to the proving key.
 */
export async function generateWithdrawProof(
  inputs: WithdrawProofInputs,
  wasmPath: string,
  zkeyPath: string
): Promise<WithdrawProof> {
  validateWithdrawProofInputs(inputs);

  // snarkjs expects all field values as decimal strings.
  const snarkInputs = serializeForSnarkjs(inputs);

  const { proof, publicSignals } = await groth16.fullProve(
    snarkInputs,
    wasmPath,
    zkeyPath
  );

  const publicInputs = WITHDRAW_PUBLIC_INPUT_FIELDS.map((field) =>
    inputs[field].toString()
  );

  const publicSignalsStructured: WithdrawPublicInputs = {
    nullifier_hash: publicSignals[0],
    merkle_root: publicSignals[1],
    recipient: publicSignals[2],
    amount: publicSignals[3],
    pool_id: publicSignals[4], // ZK-029
  };

  return {
    proof: encodeProof(proof),
    publicInputs,
    publicSignals: publicSignalsStructured,
  };
}

/**
 * Verify a Groth16 withdrawal proof off-chain.
 *
 * @param verificationKey - The circuit verification key object.
 * @param withdrawProof   - The proof bundle returned by `generateWithdrawProof`.
 */
export async function verifyWithdrawProof(
  verificationKey: object,
  withdrawProof: WithdrawProof
): Promise<boolean> {
  const { proof, publicSignals } = deserializeProof(withdrawProof);
  return groth16.verify(verificationKey, publicSignals, proof);
}

// ---------------------------------------------------------------------------
// Witness / input preparation
// ---------------------------------------------------------------------------

/**
 * Build a complete `WithdrawProofInputs` bundle from higher-level parameters.
 *
 * ZK-029: `pool_id` is now a required field in `WithdrawParams`.
 */
export async function prepareWithdrawProofInputs(
  params: WithdrawParams
): Promise<WithdrawProofInputs> {
  // buildWithdrawWitness is responsible for computing nullifier_hash,
  // deriving path data, etc.  It receives pool_id so the nullifier is
  // domain-separated correctly.
  const witness = await buildWithdrawWitness(params);

  return {
    nullifier_hash: witness.nullifier_hash,
    merkle_root: witness.merkle_root,
    recipient: params.recipient,
    amount: params.amount.toString(),
    pool_id: params.pool_id, // ZK-029
    secret: witness.secret,
    path_elements: witness.path_elements,
    path_indices: witness.path_indices,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateWithdrawProofInputs(inputs: WithdrawProofInputs): void {
  const required: Array<keyof WithdrawProofInputs> = [
    "nullifier_hash",
    "merkle_root",
    "recipient",
    "amount",
    "pool_id", // ZK-029
    "secret",
    "path_elements",
    "path_indices",
  ];

  for (const field of required) {
    if (inputs[field] === undefined || inputs[field] === null || inputs[field] === "") {
      throw new Error(
        `WithdrawProofInputs: missing required field "${field}". ` +
          `ZK-029 requires pool_id to be set for all withdrawal proofs.`
      );
    }
  }

  if (
    !Array.isArray(inputs.path_elements) ||
    inputs.path_elements.length === 0
  ) {
    throw new Error("WithdrawProofInputs: path_elements must be a non-empty array.");
  }

  if (
    !Array.isArray(inputs.path_indices) ||
    inputs.path_indices.length !== inputs.path_elements.length
  ) {
    throw new Error(
      "WithdrawProofInputs: path_indices length must match path_elements length."
    );
  }
}

/**
 * Serialize proof inputs to plain objects with decimal-string values
 * as expected by snarkjs.
 */
function serializeForSnarkjs(inputs: WithdrawProofInputs): Record<string, unknown> {
  return {
    nullifier_hash: inputs.nullifier_hash,
    merkle_root: inputs.merkle_root,
    recipient: inputs.recipient,
    amount: inputs.amount,
    pool_id: inputs.pool_id, // ZK-029
    secret: inputs.secret,
    path_elements: inputs.path_elements,
    path_indices: inputs.path_indices,
  };
}

/** Encode a snarkjs proof object to a hex string for on-chain submission. */
function encodeProof(proof: object): string {
  return Buffer.from(JSON.stringify(proof)).toString("hex");
}

/** Decode a hex-encoded proof back to snarkjs format. */
function deserializeProof(withdrawProof: WithdrawProof): {
  proof: object;
  publicSignals: string[];
} {
  const proofStr =
    typeof withdrawProof.proof === "string"
      ? withdrawProof.proof
      : Buffer.from(withdrawProof.proof).toString("hex");

  const proof = JSON.parse(Buffer.from(proofStr, "hex").toString("utf8"));
  const publicSignals = WITHDRAW_PUBLIC_INPUT_FIELDS.map(
    (field) => withdrawProof.publicSignals[field]
  );

  return { proof, publicSignals };
}

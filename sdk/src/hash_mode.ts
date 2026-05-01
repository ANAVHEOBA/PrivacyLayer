/**
 * ZK-106: Explicit hash mode abstraction for SDK helpers.
 *
 * Several SDK helpers compute nullifier hashes and Stellar address field
 * encodings using SHA-256 as a **structural stand-in** for the BN254
 * Poseidon2/Pedersen hash functions used by the Noir withdrawal circuit.
 * These are labelled "mock" hash implementations:
 *
 *   - They preserve the correct input order and domain-separation layout.
 *   - They produce DIFFERENT output values than the Noir circuit.
 *   - They are suitable for unit tests that verify schema ordering, field
 *     encoding, and structural invariants.
 *   - They are INCOMPATIBLE with real Noir/Barretenberg proof generation:
 *     a witness built from SHA-256 nullifier hashes will fail circuit
 *     verification even if the Groth16 proof otherwise looks correct.
 *
 * LIVE mode is reserved for when a real BN254 Pedersen/Poseidon implementation
 * is wired in (see ZK-009, ZK-017). Until then, all proof generation that
 * passes through `ProofGenerator.generate()` must explicitly opt in with
 * `{ testOnlyAllowMockHash: true }` to confirm the test knowingly operates
 * on structural stand-in hashes.
 *
 * Affected functions (mock-hash):
 *   - encoding.ts :: computeNullifierHash        (SHA-256 ≠ circuit Pedersen)
 *   - encoding.ts :: stellarAddressToField        (SHA-256 — matches on-chain, but labelled for audit)
 *   - public_inputs.ts :: encodeNullifierHash     (SHA-256 ≠ circuit Pedersen)
 *
 * @see sdk/src/encoding.ts
 * @see sdk/src/public_inputs.ts
 * @see sdk/src/proof.ts (ProofGenerator.prepareWitness, ProofGenerator.generate)
 */

/**
 * HashMode discriminates between SHA-256 structural stand-ins (mock) and
 * the real BN254 Poseidon2/Pedersen hash path (live).
 *
 * - `'mock'` — SHA-256-based implementations.  Fast, deterministic, but
 *   incompatible with the on-chain withdrawal circuit.  Use in tests only.
 * - `'live'` — Real BN254 implementations required for valid on-chain proofs.
 *   Not yet fully wired; tracked by ZK-009 and ZK-017.
 */
export type HashMode = 'mock' | 'live';

/**
 * Sentinel constant for test files.
 *
 * Import `MOCK_HASH_CONTEXT` and pass it to `testOnlyAllowMockHash` to make
 * mock-hash intent explicit at the call site.  Using a named import is
 * intentionally more visible than a bare `true` literal.
 *
 * @example
 * ```ts
 * import { MOCK_HASH_CONTEXT } from '../src/hash_mode';
 * // HASH_MODE: mock (ZK-106) — SHA-256 structural stand-ins
 * const proof = await generateWithdrawalProof(
 *   request,
 *   backend,
 *   { testOnlyAllowMockHash: MOCK_HASH_CONTEXT },
 * );
 * ```
 */
export const MOCK_HASH_CONTEXT: true = true;

/**
 * Guard: throw a descriptive error when a mock-hash witness is about to enter
 * a proof-generation path without an explicit test-only opt-in.
 *
 * This prevents production code from accidentally producing proofs whose
 * public inputs were derived from SHA-256 rather than the BN254 Pedersen/
 * Poseidon hash that the Noir circuit expects.
 *
 * @param mode    - HashMode recorded on the PreparedWitness ('mock' | 'live' | undefined).
 * @param location - Human-readable callsite label (e.g. 'ProofGenerator.generate').
 * @param allowed  - When true (tests pass `testOnlyAllowMockHash: true`), the
 *                   guard is bypassed so structural/integration tests can run.
 */
export function assertNotMockHashMode(
  mode: HashMode | undefined,
  location: string,
  allowed: boolean = false,
): void {
  if (mode === 'mock' && !allowed) {
    throw new Error(
      `[ZK-106] ${location}: witness was prepared with mock-hash mode ` +
        `(SHA-256 structural stand-ins). ` +
        `A real Noir/Barretenberg prover requires Poseidon2/Pedersen nullifier hashes — ` +
        `a SHA-256-derived nullifier_hash will not satisfy the circuit constraints. ` +
        `If this is a test, pass { testOnlyAllowMockHash: true } explicitly. ` +
        `For production proof generation, rebuild the witness with a live hash implementation.`,
    );
  }
}

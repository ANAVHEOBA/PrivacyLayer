/**
 * PrivacyLayer SDK – Commitment Hash Computation
 *
 * The on-chain commitment is Hash(nullifier, secret) using the same hash
 * function as the Noir withdrawal circuit. The contract's Merkle tree and
 * the circuit MUST agree on the hash function.
 *
 * Current implementation: Poseidon2 on BN254 (Protocol 25 native).
 *
 * The hash is deliberately pluggable via `setHashFunction()` so the SDK
 * can be upgraded without breaking existing callers if the circuit changes
 * from Pedersen → Poseidon2 → other in the future.
 *
 * References:
 *  - circuits/lib/src/hash/mod.nr (circuit hash)
 *  - contracts/privacy_pool/src/crypto/merkle.rs (on-chain hash)
 *  - CAP-0075: Poseidon hash host functions
 */

import { createHash } from 'crypto';
import { bigIntToBuffer, bufferToBigInt, BN254_FIELD_PRIME } from './note';

// ─── Hash Function Interface ──────────────────────────────────────────────────

/**
 * A function that computes Hash(a, b) over the BN254 field.
 * Both inputs and the output are 254-bit field elements (bigint).
 *
 * Replace the default with a proper Poseidon2/Pedersen library in production.
 */
export type HashFunction = (a: bigint, b: bigint) => Promise<Uint8Array>;

// ─── Default Hash Implementation ─────────────────────────────────────────────

/**
 * Default hash function — SHA-256(big-endian(a) || big-endian(b)) mod BN254_FIELD_PRIME.
 *
 * ⚠️  This is a STAND-IN for SDK development and testing only.
 *
 * BEFORE MAINNET: Replace this with one of:
 *   1. A Poseidon2 JS implementation (e.g. @noir-lang/barretenberg/poseidon2)
 *      that produces the exact same output as the Noir circuit.
 *   2. A call to Soroban simulation that returns the on-chain Poseidon2 result.
 *
 * The stand-in preserves two critical properties that the tests rely on:
 *  - Determinism: same inputs → same output
 *  - Non-symmetry: H(a,b) ≠ H(b,a) (uses ordered concatenation)
 *
 * It does NOT match the circuit's actual hash and therefore cannot be used
 * to generate real withdrawal proofs.
 */
async function defaultHashFn(a: bigint, b: bigint): Promise<Uint8Array> {
  const buf = Buffer.concat([
    Buffer.from(bigIntToBuffer(a)),
    Buffer.from(bigIntToBuffer(b)),
  ]);
  const digest = createHash('sha256').update(buf).digest();
  // Reduce mod BN254 field prime to stay within the field
  const raw = bufferToBigInt(digest) % BN254_FIELD_PRIME;
  return bigIntToBuffer(raw);
}

// Singleton — replaced via setHashFunction()
let _hashFn: HashFunction = defaultHashFn;

/**
 * Override the global hash function used by `computeCommitment` and
 * `computeNullifierHash`.
 *
 * Call this once at SDK initialisation, before any note generation:
 *
 * @example
 * ```ts
 * import { setHashFunction } from '@privacylayer/sdk';
 * import { poseidon2Hash } from 'your-poseidon2-library';
 *
 * setHashFunction(async (a, b) => poseidon2Hash([a, b]));
 * ```
 */
export function setHashFunction(fn: HashFunction): void {
  _hashFn = fn;
}

/**
 * Get the currently active hash function (useful for testing).
 */
export function getHashFunction(): HashFunction {
  return _hashFn;
}

// ─── Core Hash Operations ─────────────────────────────────────────────────────

/**
 * Compute the note commitment: commitment = Hash(nullifier, secret).
 *
 * This is the value stored in the on-chain Merkle tree during deposit.
 * MUST be computed with the same hash function as the withdrawal circuit.
 *
 * @param nullifier - 254-bit random field element (private)
 * @param secret    - 254-bit random field element (private)
 * @returns 32-byte big-endian commitment
 */
export async function computeCommitment(
  nullifier: bigint,
  secret: bigint
): Promise<Uint8Array> {
  validateFieldElement(nullifier, 'nullifier');
  validateFieldElement(secret, 'secret');
  return _hashFn(nullifier, secret);
}

/**
 * Compute the nullifier hash: nullifier_hash = Hash(nullifier, root).
 *
 * Bound to a specific Merkle root to prevent cross-pool replay attacks.
 * This value is submitted publicly during withdrawal to mark a note as spent.
 *
 * @param nullifier  - 254-bit field element (private)
 * @param merkleRoot - 32-byte big-endian Merkle root (public)
 * @returns 32-byte big-endian nullifier hash
 */
export async function computeNullifierHash(
  nullifier: bigint,
  merkleRoot: Uint8Array
): Promise<Uint8Array> {
  validateFieldElement(nullifier, 'nullifier');
  if (merkleRoot.length !== 32) {
    throw new RangeError(`merkleRoot must be 32 bytes, got ${merkleRoot.length}`);
  }
  const rootBigInt = bufferToBigInt(merkleRoot);
  return _hashFn(nullifier, rootBigInt);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Assert a value is a non-negative bigint within the BN254 scalar field.
 */
export function validateFieldElement(value: bigint, name: string): void {
  if (typeof value !== 'bigint') {
    throw new TypeError(`${name} must be a bigint`);
  }
  if (value < 0n) {
    throw new RangeError(`${name} must be non-negative`);
  }
  if (value >= BN254_FIELD_PRIME) {
    throw new RangeError(`${name} is outside the BN254 scalar field`);
  }
}

/**
 * Assert a 32-byte array is a non-zero commitment.
 * Matches the `Error::ZeroCommitment` check in the Soroban contract
 * (contracts/privacy_pool/src/core/deposit.rs).
 */
export function validateCommitment(commitment: Uint8Array): void {
  if (commitment.length !== 32) {
    throw new RangeError(`Commitment must be 32 bytes, got ${commitment.length}`);
  }
  if (commitment.every((b) => b === 0)) {
    throw new Error('Commitment must not be the zero value');
  }
}

/**
 * Poseidon2 Typed Boundary for PrivacyLayer SDK
 *
 * This module provides a typed boundary around the @zkpassport/poseidon2 dependency,
 * ensuring consistent TypeScript compilation across Node and browser environments.
 *
 * @module poseidon
 * @see https://github.com/zkpassport/poseidon2
 *
 * @remarks
 * ## Runtime Surface
 *
 * The Poseidon2 hash function operates on the BN254 curve field elements:
 * - **Input**: Array of `bigint` values, each must be < BN254 field modulus
 * - **Output**: Single `bigint` representing the hash result in the field
 * - **Field Modulus**: 21888242871839275222246405745257275088548364400416034343698204186575808495617n
 *
 * ## Environment Compatibility
 *
 * This boundary is designed to work identically in:
 * - **Node.js**: Uses native BigInt support (ES2020+)
 * - **Browser**: Modern browsers with BigInt support (Chrome 67+, Firefox 68+, Safari 14+)
 *
 * ## Usage
 *
 * ```typescript
 * import { poseidonHash, computeNoteCommitmentBytes } from './poseidon';
 *
 * // Direct hashing
 * const inputs = [1n, 2n, 3n];
 * const hash = poseidonHash(inputs);
 *
 * // Note commitment (canonical API)
 * const commitment = computeNoteCommitmentBytes(nullifier, secret, poolId, denomination);
 * ```
 */

import { poseidon2Hash } from '@zkpassport/poseidon2';
import {
  fieldToBuffer,
  fieldToHex,
  hexToField,
  noteScalarToField,
  poolIdToField,
} from './encoding';

/**
 * BN254 field modulus for Poseidon2 operations.
 * All inputs to Poseidon2 must be strictly less than this value.
 *
 * @constant {bigint}
 * @see https://eips.ethereum.org/EIPS/eip-196
 */
export const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Validates that a bigint value is a valid BN254 field element.
 *
 * @param value - The value to validate
 * @param label - A label for error messages (e.g., "poseidon input[0]")
 * @throws {RangeError} If the value is >= FIELD_MODULUS
 * @returns {bigint} The validated value
 */
function validateFieldElement(value: bigint, label: string): bigint {
  if (value < 0n) {
    throw new RangeError(`${label} must be non-negative, got ${value}`);
  }
  if (value >= FIELD_MODULUS) {
    throw new RangeError(`${label} must be < BN254 field modulus (${FIELD_MODULUS}), got ${value}`);
  }
  return value;
}

/**
 * Converts a hex string to a validated field element.
 *
 * @param value - Hex string (with or without 0x prefix)
 * @param label - A label for error messages
 * @returns {bigint} The validated field element
 * @throws {RangeError} If the value is not a valid field element
 * @throws {SyntaxError} If the value is not valid hex
 */
function toBigIntInput(value: string, index: number): bigint {
  const field = hexToField(value, `poseidon input[${index}]`);
  return validateFieldElement(field, `poseidon input[${index}]`);
}

/**
 * Computes the Poseidon2 hash of the given field elements.
 *
 * @param inputs - Array of bigint values, each must be < FIELD_MODULUS
 * @returns {bigint} The hash result as a field element
 * @throws {RangeError} If any input is not a valid field element
 *
 * @example
 * ```typescript
 * const hash = poseidonHash([1n, 2n, 3n]);
 * ```
 */
export function poseidonHash(inputs: readonly bigint[]): bigint {
  // Validate all inputs before hashing
  inputs.forEach((value, index) => validateFieldElement(value, `poseidon input[${index}]`));
  return poseidon2Hash([...inputs]);
}

/**
 * Computes the Poseidon2 hash and returns the result as a hex string.
 *
 * @param inputs - Array of hex strings representing field elements
 * @returns {string} The hash result as a hex string (without 0x prefix)
 * @throws {RangeError} If any input is not a valid field element
 * @throws {SyntaxError} If any input is not valid hex
 *
 * @example
 * ```typescript
 * const hashHex = poseidonFieldHex([
 *   '0x1',
 *   '0x2',
 *   '0x3'
 * ]);
 * ```
 */
export function poseidonFieldHex(inputs: readonly string[]): string {
  return fieldToHex(
    poseidonHash(inputs.map((value, index) => toBigIntInput(value, index)))
  );
}

/**
 * Computes the Poseidon2 hash and returns the result as a Buffer.
 *
 * @param inputs - Array of hex strings representing field elements
 * @returns {Buffer} The hash result as a Buffer
 * @throws {RangeError} If any input is not a valid field element
 * @throws {SyntaxError} If any input is not valid hex
 *
 * @example
 * ```typescript
 * const hashBuffer = poseidonFieldBuffer([
 *   '0x1',
 *   '0x2',
 *   '0x3'
 * ]);
 * ```
 */
export function poseidonFieldBuffer(inputs: readonly string[]): Buffer {
  return fieldToBuffer(
    poseidonHash(inputs.map((value, index) => toBigIntInput(value, index)))
  );
}

/**
 * Computes the commitment field hex for a note.
 *
 * The commitment is computed as:
 * `Poseidon2(nullifier_field, secret_field, pool_id_field, denomination_field)`
 *
 * @param nullifier - The note's nullifier (Buffer or Uint8Array, must be valid note scalar)
 * @param secret - The note's secret (Buffer or Uint8Array, must be valid note scalar)
 * @param poolId - The pool ID as a hex string (64 characters, 32 bytes)
 * @param denomination - The denomination as a bigint (must be < FIELD_MODULUS)
 * @returns {string} The commitment as a hex string (without 0x prefix)
 * @throws {RangeError} If any input is not a valid field element
 *
 * @example
 * ```typescript
 * const commitmentHex = computeNoteCommitmentField(
 *   nullifierBuffer,
 *   secretBuffer,
 *   'a1b2c3...',
 *   1000000n
 * );
 * ```
 */
export function computeNoteCommitmentField(
  nullifier: Buffer | Uint8Array,
  secret: Buffer | Uint8Array,
  poolId: string,
  denomination: bigint = 0n
): string {
  return poseidonFieldHex([
    noteScalarToField(Buffer.from(nullifier)),
    noteScalarToField(Buffer.from(secret)),
    poolIdToField(poolId),
    fieldToHex(denomination),
  ]);
}

/**
 * Computes the commitment bytes for a note.
 *
 * This is the canonical API for computing note commitments in the PrivacyLayer SDK.
 * The commitment is computed as:
 * `Poseidon2(nullifier_field, secret_field, pool_id_field, denomination_field)`
 *
 * @param nullifier - The note's nullifier (Buffer or Uint8Array, must be valid note scalar)
 * @param secret - The note's secret (Buffer or Uint8Array, must be valid note scalar)
 * @param poolId - The pool ID as a hex string (64 characters, 32 bytes)
 * @param denomination - The denomination as a bigint (must be < FIELD_MODULUS)
 * @returns {Buffer} The commitment as a Buffer
 * @throws {RangeError} If any input is not a valid field element
 *
 * @example
 * ```typescript
 * const commitment = computeNoteCommitmentBytes(
 *   nullifierBuffer,
 *   secretBuffer,
 *   'a1b2c3...',
 *   1000000n
 * );
 * ```
 */
export function computeNoteCommitmentBytes(
  nullifier: Buffer | Uint8Array,
  secret: Buffer | Uint8Array,
  poolId: string,
  denomination: bigint = 0n
): Buffer {
  return Buffer.from(computeNoteCommitmentField(nullifier, secret, poolId, denomination), 'hex');
}

/**
 * Type-safe interface for Poseidon2 hash operations.
 *
 * @remarks
 * This interface documents the expected runtime behavior of the Poseidon2 boundary.
 * All implementations must satisfy this contract for cross-environment compatibility.
 */
export interface IPoseidonBoundary {
  /**
   * Hash an array of field elements.
   * @param inputs - Field elements as bigints
   * @returns Hash result as a field element
   */
  poseidonHash(inputs: readonly bigint[]): bigint;

  /**
   * Hash an array of hex strings and return hex result.
   * @param inputs - Field elements as hex strings
   * @returns Hash result as a hex string
   */
  poseidonFieldHex(inputs: readonly string[]): string;

  /**
   * Hash an array of hex strings and return Buffer result.
   * @param inputs - Field elements as hex strings
   * @returns Hash result as a Buffer
   */
  poseidonFieldBuffer(inputs: readonly string[]): Buffer;

  /**
   * Compute a note commitment as a hex field string.
   */
  computeNoteCommitmentField(
    nullifier: Buffer | Uint8Array,
    secret: Buffer | Uint8Array,
    poolId: string,
    denomination?: bigint
  ): string;

  /**
   * Compute a note commitment as bytes (Buffer).
   */
  computeNoteCommitmentBytes(
    nullifier: Buffer | Uint8Array,
    secret: Buffer | Uint8Array,
    poolId: string,
    denomination?: bigint
  ): Buffer;
}

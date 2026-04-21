import { randomBytes, createHash } from 'crypto';
import { FIELD_SIZE } from '../constants';

/**
 * Generate a random field element
 * @returns Random BigInt within the field size
 */
export function randomFieldElement(): bigint {
  const bytes = randomBytes(32);
  const value = BigInt('0x' + bytes.toString('hex'));
  return value % FIELD_SIZE;
}

/**
 * Generate a random hex string
 * @param length Length in bytes
 * @returns Hex string
 */
export function randomHex(length: number): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a value using Poseidon hash (simplified version)
 * In production, this should use the actual Poseidon hash implementation
 * @param inputs Array of BigInt values to hash
 * @returns Hash as BigInt
 */
export function poseidonHash(inputs: bigint[]): bigint {
  // Simplified hash for now - in production, use actual Poseidon implementation
  const combined = inputs.map((i) => i.toString()).join('');
  const hash = createHash('sha256').update(combined).digest('hex');
  return BigInt('0x' + hash) % FIELD_SIZE;
}

/**
 * Hash two values together
 * @param left Left value
 * @param right Right value
 * @returns Hash as BigInt
 */
export function hashPair(left: bigint, right: bigint): bigint {
  return poseidonHash([left, right]);
}

/**
 * Compute commitment from nullifier and secret
 * commitment = hash(nullifier, secret)
 * @param nullifier Nullifier value
 * @param secret Secret value
 * @returns Commitment as BigInt
 */
export function computeCommitment(nullifier: bigint, secret: bigint): bigint {
  return poseidonHash([nullifier, secret]);
}

/**
 * Compute nullifier hash
 * nullifierHash = hash(nullifier)
 * @param nullifier Nullifier value
 * @returns Nullifier hash as BigInt
 */
export function computeNullifierHash(nullifier: bigint): bigint {
  return poseidonHash([nullifier]);
}

/**
 * Validate that a value is within the field size
 * @param value Value to validate
 * @returns True if valid
 */
export function isValidFieldElement(value: bigint): boolean {
  return value >= BigInt(0) && value < FIELD_SIZE;
}

/**
 * Convert BigInt to hex string with padding
 * @param value BigInt value
 * @param length Desired length in bytes
 * @returns Hex string
 */
export function bigIntToHex(value: bigint, length: number = 32): string {
  const hex = value.toString(16);
  return hex.padStart(length * 2, '0');
}

/**
 * Convert hex string to BigInt
 * @param hex Hex string
 * @returns BigInt value
 */
export function hexToBigInt(hex: string): bigint {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex);
}

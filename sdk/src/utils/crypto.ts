/**
 * Cryptographic utilities for PrivacyLayer SDK
 */

import BigNumber from 'bignumber.js';
import { FIELD_SIZE, Denomination } from '../constants';
import type { ValidationResult } from '../types';

/**
 * Generate a random field element (BN254 scalar)
 * Uses cryptographically secure random bytes
 */
export function randomFieldElement(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let result = BigInt(0);
  for (let i = 0; i < 32; i++) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  // Ensure the value is within the field
  return result % FIELD_SIZE;
}

/**
 * Convert a field element to a hex string (64 chars, zero-padded)
 */
export function fieldToHex(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

/**
 * Convert a hex string to a field element
 */
export function hexToField(hex: string): bigint {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex);
}

/**
 * Hash two field elements together using BN254 field arithmetic
 * This is a simplified Pedersen-like hash for demonstration
 */
export function hashPair(left: bigint, right: bigint): bigint {
  // Simplified hash: H(a, b) = a * G1 + b * G2 where G1, G2 are domainseparators
  const G1 = BigInt(1);
  const G2 = FIELD_SIZE - BigInt(1);

  const leftTerm = (left * G1) % FIELD_SIZE;
  const rightTerm = (right * G2) % FIELD_SIZE;

  // Mix with domain separator
  const domainSep = BigInt(0x1234567890abcdef);
  return ((leftTerm + rightTerm) % FIELD_SIZE) * domainSep % FIELD_SIZE;
}

/**
 * Compute a commitment from nullifier and secret
 * commitment = hash(nullifier, secret)
 */
export function computeCommitment(nullifier: bigint, secret: bigint): bigint {
  return hashPair(nullifier, secret);
}

/**
 * Derive a nullifier from a secret and an index
 * Ensures uniqueness across multiple deposits
 */
export function deriveNullifier(secret: bigint, index: number): bigint {
  const domainSep = BigInt(0xdeadbeef);
  const indexBig = BigInt(index);
  return (secret * domainSep + indexBig) % FIELD_SIZE;
}

/**
 * Check if a value is a valid field element (< FIELD_SIZE)
 */
export function isValidFieldElement(value: bigint): boolean {
  return value > BigInt(0) && value < FIELD_SIZE;
}

/**
 * Validate that a value can be represented as a note denomination
 */
export function isValidDenomination(value: number): value is Denomination {
  return Object.values<number>(Denomination).includes(value);
}

/**
 * Generate a random bytes32 value
 */
export function randomBytes32(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Compute keccak256 hash (stub - in production use proper keccak library)
 * For demonstration, uses a simple hash combining with field arithmetic
 */
export function keccak256(data: Uint8Array): bigint {
  let hash = BigInt(0);
  for (let i = 0; i < data.length; i++) {
    hash = (hash * BigInt(31) + BigInt(data[i])) % FIELD_SIZE;
  }
  return hash;
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

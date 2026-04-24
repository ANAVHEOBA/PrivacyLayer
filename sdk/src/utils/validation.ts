import { Denomination } from '../types';
import { FIELD_SIZE } from '../constants';

/**
 * Validate Stellar address
 * @param address Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  // Stellar addresses start with G and are 56 characters long
  const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
  return stellarAddressRegex.test(address);
}

/**
 * Validate amount
 * @param amount Amount to validate
 * @returns True if valid
 */
export function isValidAmount(amount: number): boolean {
  return (
    amount > 0 &&
    Number.isFinite(amount) &&
    Object.values(Denomination).includes(amount as Denomination)
  );
}

/**
 * Validate field element
 * @param value Value to validate
 * @returns True if valid
 */
export function isValidFieldElement(value: bigint): boolean {
  return value >= BigInt(0) && value < FIELD_SIZE;
}

/**
 * Validate hex string
 * @param hex Hex string to validate
 * @param length Expected length in bytes (optional)
 * @returns True if valid
 */
export function isValidHex(hex: string, length?: number): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Check if it's valid hex
  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    return false;
  }
  
  // Check length if specified
  if (length !== undefined && cleanHex.length !== length * 2) {
    return false;
  }
  
  return true;
}

/**
 * Validate commitment
 * @param commitment Commitment to validate
 * @returns True if valid
 */
export function isValidCommitment(commitment: string): boolean {
  return isValidHex(commitment, 32);
}

/**
 * Validate nullifier
 * @param nullifier Nullifier to validate
 * @returns True if valid
 */
export function isValidNullifier(nullifier: string): boolean {
  return isValidHex(nullifier, 32);
}

/**
 * Validate secret
 * @param secret Secret to validate
 * @returns True if valid
 */
export function isValidSecret(secret: string): boolean {
  return isValidHex(secret, 32);
}

/**
 * Validate denomination
 * @param denomination Denomination to validate
 * @returns True if valid
 */
export function isValidDenomination(denomination: number): boolean {
  return Object.values(Denomination).includes(denomination as Denomination);
}

/**
 * Validate note structure
 * @param note Note object to validate
 * @returns True if valid
 */
export function isValidNote(note: unknown): note is {
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: Denomination;
} {
  if (typeof note !== 'object' || note === null) {
    return false;
  }
  
  const n = note as Record<string, unknown>;
  
  return (
    typeof n.nullifier === 'string' &&
    isValidNullifier(n.nullifier) &&
    typeof n.secret === 'string' &&
    isValidSecret(n.secret) &&
    typeof n.commitment === 'string' &&
    isValidCommitment(n.commitment) &&
    typeof n.denomination === 'number' &&
    isValidDenomination(n.denomination)
  );
}

/**
 * Validate transaction hash
 * @param hash Transaction hash to validate
 * @returns True if valid
 */
export function isValidTransactionHash(hash: string): boolean {
  return isValidHex(hash, 32);
}

/**
 * Validate leaf index
 * @param index Leaf index to validate
 * @param maxLeaves Maximum number of leaves
 * @returns True if valid
 */
export function isValidLeafIndex(index: number, maxLeaves: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < maxLeaves;
}

/**
 * Validate network configuration
 * @param config Network configuration to validate
 * @returns True if valid
 */
export function isValidNetworkConfig(config: unknown): boolean {
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  const c = config as Record<string, unknown>;
  
  return (
    typeof c.rpcUrl === 'string' &&
    c.rpcUrl.startsWith('http') &&
    typeof c.networkPassphrase === 'string' &&
    c.networkPassphrase.length > 0 &&
    typeof c.contractId === 'string'
  );
}

/**
 * Assert that a condition is true, throw error otherwise
 * @param condition Condition to check
 * @param message Error message
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Validate and sanitize input
 * @param value Value to sanitize
 * @param type Expected type
 * @returns Sanitized value
 */
export function sanitizeInput<T>(value: unknown, type: string): T {
  if (typeof value !== type) {
    throw new Error(`Expected ${type}, got ${typeof value}`);
  }
  return value as T;
}

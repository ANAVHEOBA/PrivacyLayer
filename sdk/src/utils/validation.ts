/**
 * Input validation utility functions for PrivacyLayer.
 * @module @privacylayer/sdk/utils/validation
 */

import { Denomination, type Note, type MerkleProof } from '../types';
import { FIELD_SIZE, MERKLE_TREE_DEPTH } from '../constants';
import { hexToBigint } from './encoding';

/**
 * Validate a Stellar address format.
 * Stellar addresses are 56 characters and use base32 encoding.
 * G-prefixed addresses are standard public keys.
 * M-prefixed addresses are muxed accounts.
 *
 * @param address - Stellar address to validate
 * @returns True if valid Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses are 56 characters, start with G (public) or M (muxed)
  // and use base32 alphabet (A-Z, 2-7)
  if (!/^[GM][A-Z2-7]{55}$/.test(address)) {
    return false;
  }
  return true;
}

/**
 * Validate a hex string.
 * @param hex - Hex string to validate
 * @param expectedLength - Expected byte length (optional)
 * @returns True if valid hex string
 */
export function isValidHex(hex: string, expectedLength?: number): boolean {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;

  // Check for valid hex characters
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    return false;
  }

  // Check expected length if specified
  if (expectedLength !== undefined && clean.length !== expectedLength * 2) {
    return false;
  }

  return true;
}

/**
 * Validate that a value is within the BN254 scalar field.
 * @param value - BigInt value to check
 * @returns True if 0 <= value < FIELD_SIZE
 */
export function isFieldElement(value: bigint): boolean {
  return value >= 0n && value < FIELD_SIZE;
}

/**
 * Validate that a hex string represents a valid field element.
 * @param hex - Hex string to validate
 * @returns True if the value is a valid field element
 */
export function isValidFieldElementHex(hex: string): boolean {
  if (!isValidHex(hex)) {
    return false;
  }
  try {
    const value = hexToBigint(hex);
    return isFieldElement(value);
  } catch {
    return false;
  }
}

/**
 * Validate a denomination value.
 * @param value - Value to check
 * @returns True if value is a valid Denomination enum value
 */
export function isValidDenomination(value: number): value is Denomination {
  return Object.values(Denomination).includes(value as Denomination);
}

/**
 * Validate an amount is positive and within reasonable bounds.
 * @param amount - Amount to validate
 * @param maxAmount - Maximum allowed amount (optional)
 * @returns True if amount is valid
 */
export function isValidAmount(amount: number | bigint, maxAmount?: bigint): boolean {
  const bigAmount = typeof amount === 'number' ? BigInt(amount) : amount;

  if (bigAmount <= 0n) {
    return false;
  }

  if (maxAmount !== undefined && bigAmount > maxAmount) {
    return false;
  }

  // Default max: 15 digits
  const defaultMax = BigInt('999999999999999');
  return bigAmount <= defaultMax;
}

/**
 * Validate a complete Note object.
 * @param note - Note to validate
 * @returns True if note has all required valid fields
 */
export function isValidNote(note: unknown): note is Note {
  if (typeof note !== 'object' || note === null) {
    return false;
  }

  const n = note as Record<string, unknown>;

  // Check required fields exist
  if (
    typeof n.nullifier !== 'string' ||
    typeof n.secret !== 'string' ||
    typeof n.commitment !== 'string' ||
    typeof n.denomination !== 'number'
  ) {
    return false;
  }

  // Validate hex strings are 32 bytes
  if (!isValidHex(n.nullifier, 32)) {
    return false;
  }
  if (!isValidHex(n.secret, 32)) {
    return false;
  }
  if (!isValidHex(n.commitment, 32)) {
    return false;
  }

  // Validate denomination
  if (!isValidDenomination(n.denomination)) {
    return false;
  }

  // Validate field elements
  if (!isValidFieldElementHex(n.nullifier)) {
    return false;
  }
  if (!isValidFieldElementHex(n.secret)) {
    return false;
  }

  return true;
}

/**
 * Validate a Merkle proof.
 * @param proof - Merkle proof to validate
 * @param treeDepth - Expected tree depth (default: MERKLE_TREE_DEPTH)
 * @returns True if proof structure is valid
 */
export function isValidMerkleProof(proof: unknown, treeDepth = MERKLE_TREE_DEPTH): boolean {
  if (typeof proof !== 'object' || proof === null) {
    return false;
  }

  const p = proof as Record<string, unknown>;

  // Check required fields
  if (
    typeof p.root !== 'string' ||
    typeof p.leaf !== 'string' ||
    !Array.isArray(p.pathElements) ||
    !Array.isArray(p.pathIndices)
  ) {
    return false;
  }

  // Validate root and leaf are 32-byte hex
  if (!isValidHex(p.root, 32) || !isValidHex(p.leaf, 32)) {
    return false;
  }

  // Validate path length matches tree depth
  if (p.pathElements.length !== treeDepth || p.pathIndices.length !== treeDepth) {
    return false;
  }

  // Validate path elements are hex strings
  for (const elem of p.pathElements) {
    if (typeof elem !== 'string' || !isValidHex(elem, 32)) {
      return false;
    }
  }

  // Validate indices are 0 or 1
  for (const idx of p.pathIndices) {
    if (idx !== 0 && idx !== 1) {
      return false;
    }
  }

  return true;
}

/**
 * Validate a contract ID format (Stellar contract addresses are 32 bytes hex).
 * @param contractId - Contract ID to validate
 * @returns True if valid contract ID format
 */
export function isValidContractId(contractId: string): boolean {
  return isValidHex(contractId, 32);
}

/**
 * Assert a condition and throw an error if false.
 * @param condition - Condition to check
 * @param message - Error message if condition is false
 * @throws Error if condition is false
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Validate withdrawal parameters.
 * @param params - Withdrawal parameters to validate
 * @throws Error if validation fails
 */
export function validateWithdrawParams(params: {
  note: Note;
  merkleProof: MerkleProof;
  recipient: string;
  relayer?: string;
  relayerFee?: bigint;
}): void {
  assert(isValidNote(params.note), 'Invalid note');
  assert(isValidMerkleProof(params.merkleProof), 'Invalid merkle proof');
  assert(isValidStellarAddress(params.recipient), 'Invalid recipient address');

  if (params.relayer) {
    assert(isValidStellarAddress(params.relayer), 'Invalid relayer address');
  }

  if (params.relayerFee !== undefined) {
    assert(isValidAmount(params.relayerFee), 'Invalid relayer fee');
  }

  // Verify proof leaf matches note commitment
  assert(
    params.merkleProof.leaf === params.note.commitment,
    'Merkle proof leaf does not match note commitment'
  );
}
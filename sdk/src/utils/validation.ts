/**
 * Input validation utilities for PrivacyLayer SDK
 */

import { FIELD_SIZE, Denomination } from '../constants';
import type { ValidationResult } from '../types';
import { isValidHex, normalizeHex } from './encoding';
import { isValidFieldElement } from './crypto';

/**
 * Validate a Stellar address (G... for public, S... for secret)
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string' };
  }

  if (address.length !== 56) {
    return { valid: false, error: 'Stellar address must be 56 characters' };
  }

  if (!/^[GABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\=]+$/.test(address)) {
    return { valid: false, error: 'Invalid character in Stellar address' };
  }

  // Check version byte (first character encodes the type)
  const versionByte = base32DecodeChar(address.charCodeAt(0));
  if (versionByte < 0) {
    return { valid: false, error: 'Invalid base32 character in address' };
  }

  return { valid: true };
}

/**
 * Decode a single base32 character
 */
function base32DecodeChar(charCode: number): number {
  if (charCode >= 65 && charCode <= 90) return charCode - 65; // A-Z
  if (charCode >= 50 && charCode <= 55) return charCode - 24; // 2-7
  if (charCode >= 97 && charCode <= 122) return charCode - 97; // a-z
  return -1;
}

/**
 * Validate an amount value
 */
export function validateAmount(amount: number | string): ValidationResult {
  if (amount === '' || amount === null || amount === undefined) {
    return { valid: false, error: 'Amount is required' };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (!Number.isFinite(numAmount)) {
    return { valid: false, error: 'Amount must be a finite number' };
  }

  return { valid: true };
}

/**
 * Validate a denomination value
 */
export function validateDenomination(denomination: Denomination): ValidationResult {
  const validDenominations = Object.values(Denomination).filter(
    (v) => typeof v === 'number'
  ) as number[];

  if (!validDenominations.includes(denomination)) {
    return {
      valid: false,
      error: `Invalid denomination. Must be one of: ${validDenominations.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate a field element (bigint)
 */
export function validateFieldElement(value: bigint, fieldName = 'Value'): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!isValidFieldElement(value)) {
    return { valid: false, error: `${fieldName} must be a valid field element (0 < value < FIELD_SIZE)` };
  }

  return { valid: true };
}

/**
 * Validate a hex string
 */
export function validateHex(hex: string, fieldName = 'Hex string'): ValidationResult {
  if (!hex || typeof hex !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (!isValidHex(hex)) {
    return { valid: false, error: `${fieldName} must be a valid hex string` };
  }

  return { valid: true };
}

/**
 * Validate a commitment hash
 */
export function validateCommitment(commitment: string): ValidationResult {
  const hexResult = validateHex(commitment, 'Commitment');
  if (!hexResult.valid) return hexResult;

  const normalized = normalizeHex(commitment);
  const value = BigInt(normalized);

  return validateFieldElement(value, 'Commitment');
}

/**
 * Validate a nullifier hash
 */
export function validateNullifier(nullifier: string): ValidationResult {
  const hexResult = validateHex(nullifier, 'Nullifier');
  if (!hexResult.valid) return hexResult;

  const normalized = normalizeHex(nullifier);
  const value = BigInt(normalized);

  return validateFieldElement(value, 'Nullifier');
}

/**
 * Validate a transaction hash
 */
export function validateTransactionHash(hash: string): ValidationResult {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, error: 'Transaction hash is required' };
  }

  // Stellar transaction hashes are 64 hex characters
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
  if (cleanHash.length !== 64) {
    return { valid: false, error: 'Transaction hash must be 64 hex characters (32 bytes)' };
  }

  if (!isValidHex(cleanHash)) {
    return { valid: false, error: 'Transaction hash must be a valid hex string' };
  }

  return { valid: true };
}

/**
 * Validate contract ID
 */
export function validateContractId(contractId: string): ValidationResult {
  if (!contractId || typeof contractId !== 'string') {
    return { valid: false, error: 'Contract ID is required' };
  }

  // Contract IDs are 56 characters (similar to Stellar addresses)
  if (contractId.length !== 56) {
    return { valid: false, error: 'Contract ID must be 56 characters' };
  }

  return { valid: true };
}

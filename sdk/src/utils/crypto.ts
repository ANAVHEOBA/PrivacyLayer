/**
 * Cryptographic utilities for PrivacyLayer SDK
 */

import { randomBytes } from 'crypto';
import { FIELD_SIZE, ZERO_BYTES_32 } from '../constants';

/**
 * Generate a random field element (0 < element < FIELD_SIZE)
 * Returns hex string without 0x prefix
 */
export function randomFieldElement(): string {
  const byteLength = 32;
  let bytes: Buffer;
  
  do {
    bytes = randomBytes(byteLength);
  } while (bytesToBigInt(bytes) >= FIELD_SIZE || bytesToBigInt(bytes) === BigInt(0));
  
  return bytes.toString('hex');
}

/**
 * Convert hex string to Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Convert Buffer to hex string
 */
export function bufferToHex(buffer: Buffer, withPrefix: boolean = false): string {
  const hex = buffer.toString('hex');
  return withPrefix ? `0x${hex}` : hex;
}

/**
 * Convert bytes to BigInt
 */
export function bytesToBigInt(bytes: Buffer): bigint {
  return BigInt(`0x${bytes.toString('hex')}`);
}

/**
 * Convert BigInt to hex string
 */
export function bigIntToHex(num: bigint, withPrefix: boolean = false): string {
  const hex = num.toString(16).padStart(64, '0');
  return withPrefix ? `0x${hex}` : hex;
}

/**
 * Check if a hex string represents a valid field element
 */
export function isValidFieldElement(hex: string): boolean {
  try {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
      return false;
    }
    const value = BigInt(`0x${cleanHex}`);
    return value > BigInt(0) && value < FIELD_SIZE;
  } catch {
    return false;
  }
}

/**
 * Generate a random note (nullifier and secret)
 */
export function generateNote(denomination: number): { nullifier: string; secret: string; commitment: string } {
  const nullifier = randomFieldElement();
  const secret = randomFieldElement();
  
  // In a real implementation, this would compute Poseidon2(nullifier || secret)
  // For now, we'll create a mock commitment by hashing the concatenation
  const combined = `${nullifier}${secret}`;
  const mockHash = Buffer.from(combined).toString('hex').slice(0, 64);
  
  return {
    nullifier,
    secret,
    commitment: mockHash
  };
}

/**
 * Check if a string is a valid 32-byte hex string
 */
export function isValidBytes32(hex: string): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]{64}$/.test(cleanHex);
}

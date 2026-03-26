/**
 * Encoding utility functions for PrivacyLayer.
 * @module @privacylayer/sdk/utils/encoding
 */

import { Buffer } from 'buffer';

/**
 * Convert a hex string to a Buffer.
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Buffer containing the decoded bytes
 */
export function hexToBytes(hex: string): Buffer {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(clean, 'hex');
}

/**
 * Convert a Buffer to a hex string.
 * @param bytes - Buffer to encode
 * @param prefix - Whether to include 0x prefix (default: false)
 * @returns Hex-encoded string
 */
export function bytesToHex(bytes: Buffer, prefix = false): string {
  const hex = bytes.toString('hex');
  return prefix ? '0x' + hex : hex;
}

/**
 * Encode a string to base64.
 * @param input - String to encode
 * @returns Base64-encoded string
 */
export function toBase64(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64');
}

/**
 * Decode a base64 string.
 * @param input - Base64-encoded string
 * @returns Decoded string
 */
export function fromBase64(input: string): string {
  return Buffer.from(input, 'base64').toString('utf-8');
}

/**
 * Convert a bigint to a hex string suitable for on-chain use.
 * @param value - BigInt value
 * @param byteLength - Desired byte length for zero-padding (default: 32)
 * @returns Hex string without 0x prefix
 */
export function bigintToHex(value: bigint, byteLength = 32): string {
  const hex = value.toString(16);
  return hex.padStart(byteLength * 2, '0');
}

/**
 * Convert a hex string to a bigint.
 * @param hex - Hex string (with or without 0x prefix)
 * @returns BigInt value
 */
export function hexToBigint(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + clean);
}

/**
 * Convert a number array to a hex string.
 * @param arr - Array of numbers (0-255)
 * @returns Hex string without 0x prefix
 */
export function arrayToHex(arr: number[]): string {
  return arr.map((n) => n.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert a hex string to a number array.
 * @param hex - Hex string
 * @returns Array of numbers (0-255)
 */
export function hexToArray(hex: string): number[] {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const arr: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    arr.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return arr;
}

/**
 * Concatenate multiple hex strings.
 * @param hexStrings - Hex strings to concatenate
 * @returns Concatenated hex string
 */
export function concatHex(...hexStrings: string[]): string {
  return hexStrings.map((h) => (h.startsWith('0x') ? h.slice(2) : h)).join('');
}

/**
 * Compare two hex strings for equality.
 * Handles different lengths and 0x prefixes.
 * @param a - First hex string
 * @param b - Second hex string
 * @returns True if equal
 */
export function hexEquals(a: string, b: string): boolean {
  const cleanA = a.startsWith('0x') ? a.slice(2).toLowerCase() : a.toLowerCase();
  const cleanB = b.startsWith('0x') ? b.slice(2).toLowerCase() : b.toLowerCase();
  return cleanA === cleanB;
}

/**
 * Pad a hex string to a specific byte length.
 * @param hex - Hex string to pad
 * @param byteLength - Target byte length
 * @param padStart - Pad from start (default: true)
 * @returns Padded hex string
 */
export function padHex(hex: string, byteLength: number, padStart = true): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const targetLength = byteLength * 2;
  if (padStart) {
    return clean.padStart(targetLength, '0');
  }
  return clean.padEnd(targetLength, '0');
}

/**
 * Strip leading zeros from a hex string.
 * @param hex - Hex string
 * @returns Hex string without leading zeros
 */
export function stripLeadingZeros(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return clean.replace(/^0+/, '') || '0';
}

/**
 * Ensure a hex string has a specific format.
 * @param hex - Hex string
 * @param options - Format options
 * @returns Formatted hex string
 */
export function formatHex(
  hex: string,
  options: {
    prefix?: boolean;
    byteLength?: number;
    lowercase?: boolean;
  } = {}
): string {
  const { prefix = false, byteLength, lowercase = false } = options;
  let clean = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (lowercase) {
    clean = clean.toLowerCase();
  }

  if (byteLength) {
    clean = clean.padStart(byteLength * 2, '0');
  }

  return prefix ? '0x' + clean : clean;
}
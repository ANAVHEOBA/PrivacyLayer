/**
 * Encoding and decoding utilities
 */

import { Buffer } from 'buffer';

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const matches = cleanHex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array, withPrefix: boolean = false): string {
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return withPrefix ? `0x${hex}` : hex;
}

/**
 * Convert base64 string to hex
 */
export function base64ToHex(base64: string): string {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.toString('hex');
}

/**
 * Convert hex to base64 string
 */
export function hexToBase64(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = Buffer.from(cleanHex, 'hex');
  return bytes.toString('base64');
}

/**
 * Convert string to hex representation
 */
export function stringToHex(str: string): string {
  return Buffer.from(str, 'utf8').toString('hex');
}

/**
 * Convert hex to string
 */
export function hexToString(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex').toString('utf8');
}

/**
 * Pad hex string to specified byte length
 */
export function padHex(hex: string, byteLength: number, withPrefix: boolean = false): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(byteLength * 2, '0');
  return withPrefix ? `0x${padded}` : padded;
}

/**
 * Check if string is valid hex
 */
export function isHex(value: string): boolean {
  const cleanValue = value.startsWith('0x') ? value.slice(2) : value;
  return /^[0-9a-fA-F]+$/.test(cleanValue);
}

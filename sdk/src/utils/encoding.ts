/**
 * Encoding utilities for PrivacyLayer SDK
 */

/**
 * Convert a byte array to a hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string to a byte array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert a bigint to a byte array (little-endian)
 */
export function bigintToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = 0; i < length; i++) {
    bytes[i] = Number(v & BigInt(0xff));
    v >>= BigInt(8);
  }
  return bytes;
}

/**
 * Convert a byte array to a bigint (little-endian)
 */
export function bytesToBigint(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert a hex string to a base64 string
 */
export function hexToBase64(hex: string): string {
  const bytes = hexToBytes(hex);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string to a hex string
 */
export function base64ToHex(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytesToHex(bytes);
}

/**
 * Encode a string to UTF-8 bytes
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode UTF-8 bytes to a string
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Check if a string is a valid hex string
 */
export function isValidHex(hex: string): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0;
}

/**
 * Ensure a hex string has even length and 0x prefix
 */
export function normalizeHex(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    return '0x0' + cleanHex;
  }
  return '0x' + cleanHex;
}

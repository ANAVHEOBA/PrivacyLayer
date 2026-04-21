import { Buffer } from 'buffer';

/**
 * Convert hex string to bytes
 * @param hex Hex string (with or without 0x prefix)
 * @returns Buffer
 */
export function hexToBytes(hex: string): Buffer {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Convert bytes to hex string
 * @param bytes Buffer or Uint8Array
 * @param prefix Whether to include 0x prefix
 * @returns Hex string
 */
export function bytesToHex(bytes: Buffer | Uint8Array, prefix: boolean = false): string {
  const hex = Buffer.from(bytes).toString('hex');
  return prefix ? '0x' + hex : hex;
}

/**
 * Convert string to hex
 * @param str String to convert
 * @param prefix Whether to include 0x prefix
 * @returns Hex string
 */
export function stringToHex(str: string, prefix: boolean = false): string {
  const hex = Buffer.from(str, 'utf8').toString('hex');
  return prefix ? '0x' + hex : hex;
}

/**
 * Convert hex to string
 * @param hex Hex string
 * @returns UTF-8 string
 */
export function hexToString(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex').toString('utf8');
}

/**
 * Encode data to base64
 * @param data Data to encode
 * @returns Base64 string
 */
export function toBase64(data: string | Buffer): string {
  if (typeof data === 'string') {
    return Buffer.from(data).toString('base64');
  }
  return data.toString('base64');
}

/**
 * Decode base64 to buffer
 * @param base64 Base64 string
 * @returns Buffer
 */
export function fromBase64(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Pad hex string to specified length
 * @param hex Hex string
 * @param length Desired length in bytes
 * @returns Padded hex string
 */
export function padHex(hex: string, length: number): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return cleanHex.padStart(length * 2, '0');
}

/**
 * Convert BigInt to bytes
 * @param value BigInt value
 * @param length Length in bytes
 * @returns Buffer
 */
export function bigIntToBytes(value: bigint, length: number = 32): Buffer {
  const hex = value.toString(16).padStart(length * 2, '0');
  return Buffer.from(hex, 'hex');
}

/**
 * Convert bytes to BigInt
 * @param bytes Buffer or Uint8Array
 * @returns BigInt value
 */
export function bytesToBigInt(bytes: Buffer | Uint8Array): bigint {
  const hex = Buffer.from(bytes).toString('hex');
  return BigInt('0x' + hex);
}

/**
 * Concatenate multiple buffers
 * @param buffers Array of buffers
 * @returns Concatenated buffer
 */
export function concatBuffers(...buffers: Buffer[]): Buffer {
  return Buffer.concat(buffers);
}

/**
 * Split buffer into chunks
 * @param buffer Buffer to split
 * @param chunkSize Size of each chunk
 * @returns Array of buffers
 */
export function splitBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize));
  }
  return chunks;
}

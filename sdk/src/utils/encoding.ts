/**
 * Encoding utility functions for PrivacyLayer.
 * @module @privacylayer/sdk/utils/encoding
 */

import { Buffer } from "buffer";

/**
 * Convert a hex string to a Buffer.
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Buffer containing the decoded bytes
 */
export function hexToBytes(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}

/**
 * Convert a Buffer to a hex string.
 * @param bytes - Buffer to encode
 * @param prefix - Whether to include 0x prefix (default: false)
 * @returns Hex-encoded string
 */
export function bytesToHex(bytes: Buffer, prefix = false): string {
  const hex = bytes.toString("hex");
  return prefix ? "0x" + hex : hex;
}

/**
 * Encode a string to base64.
 * @param input - String to encode
 * @returns Base64-encoded string
 */
export function toBase64(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64");
}

/**
 * Decode a base64 string.
 * @param input - Base64-encoded string
 * @returns Decoded string
 */
export function fromBase64(input: string): string {
  return Buffer.from(input, "base64").toString("utf-8");
}

/**
 * Convert a bigint to a hex string suitable for on-chain use.
 * @param value - BigInt value
 * @param byteLength - Desired byte length (zero-padded)
 * @returns Hex string without 0x prefix
 */
export function bigintToHex(value: bigint, byteLength = 32): string {
  const hex = value.toString(16);
  return hex.padStart(byteLength * 2, "0");
}

/**
 * Convert a hex string to a bigint.
 * @param hex - Hex string (with or without 0x prefix)
 * @returns BigInt value
 */
export function hexToBigint(hex: string): bigint {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return BigInt("0x" + clean);
}

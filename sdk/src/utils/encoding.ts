import { Buffer } from 'buffer';

import { BYTES32_HEX_LENGTH } from '../constants';

export function stripHexPrefix(value: string): string {
  return value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
}

export function normalizeHex(value: string): string {
  return stripHexPrefix(value).toLowerCase();
}

export function addHexPrefix(value: string): string {
  return `0x${normalizeHex(value)}`;
}

export function bytesToHex(bytes: Uint8Array, prefixed = false): string {
  const hex = Buffer.from(bytes).toString('hex');
  return prefixed ? `0x${hex}` : hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = normalizeHex(hex);
  if (normalized.length % 2 !== 0) {
    throw new Error('Hex string must have an even number of characters.');
  }
  if (!/^[0-9a-f]*$/i.test(normalized)) {
    throw new Error('Hex string contains non-hex characters.');
  }
  return Uint8Array.from(Buffer.from(normalized, 'hex'));
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

export function bigintToBytes32(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error('Cannot encode a negative bigint as bytes32.');
  }
  const hex = value.toString(16).padStart(BYTES32_HEX_LENGTH, '0');
  if (hex.length > BYTES32_HEX_LENGTH) {
    throw new Error('Bigint exceeds 32 bytes.');
  }
  return hexToBytes(hex);
}

export function bigintToHex32(value: bigint): string {
  return bytesToHex(bigintToBytes32(value));
}

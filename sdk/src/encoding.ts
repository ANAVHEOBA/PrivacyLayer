import { createHash } from 'crypto';
import { FIELD_MODULUS, MERKLE_NODE_BYTE_LENGTH, NOTE_SCALAR_BYTE_LENGTH, NULLIFIER_DOMAIN_SEP_HEX } from './zk_constants';
import { StrKey } from '@stellar/stellar-base';
import { WitnessValidationError } from './errors';

const FIELD_HEX = /^[0-9a-fA-F]{64}$/;
const HEX_PAYLOAD = /^[0-9a-fA-F]+$/;

function stripHexPrefix(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

function assertHexPayload(hex: string, label: string): string {
  const clean = stripHexPrefix(hex);
  if (clean.length === 0 || !HEX_PAYLOAD.test(clean) || clean.length % 2 !== 0) {
    throw new Error(`${label} must be an even-length hex string`);
  }
  return clean.toLowerCase();
}

function assertCanonicalFieldHex(value: string, label: string): string {
  const clean = stripHexPrefix(value);
  if (!FIELD_HEX.test(clean)) {
    throw new Error(`${label} must be a 64-digit hex string`);
  }
  const n = BigInt('0x' + clean);
  if (n >= FIELD_MODULUS) {
    throw new RangeError(`${label} must be < BN254 field modulus`);
  }
  return clean.toLowerCase();
}

function assertByteLength(buf: Buffer, expectedLength: number, label: string): void {
  if (buf.length !== expectedLength) {
    throw new Error(`${label} must be ${expectedLength} bytes, got ${buf.length}`);
  }
}

function bigintToFixedBytes(value: bigint, byteLength: number, label: string): Buffer {
  const max = 1n << (BigInt(byteLength) * 8n);
  if (value < 0n || value >= max) {
    throw new RangeError(`${label} must fit in ${byteLength} bytes`);
  }
  const out = Buffer.alloc(byteLength);
  let cursor = value;
  for (let i = byteLength - 1; i >= 0; i--) {
    out[i] = Number(cursor & 0xffn);
    cursor >>= 8n;
  }
  return out;
}

export function hexToBytes(
  value: string,
  label: string = 'hex value',
  expectedByteLength?: number
): Buffer {
  const clean = assertHexPayload(value, label);
  const bytes = Buffer.from(clean, 'hex');
  if (expectedByteLength !== undefined) {
    assertByteLength(bytes, expectedByteLength, label);
  }
  return bytes;
}

export function bytesToHex(value: Buffer | Uint8Array): string {
  return Buffer.from(value).toString('hex');
}

export type PoolTokenIdentity =
  | { kind: 'native'; assetCode: string }
  | { kind: 'contract'; contractId: string };

const POOL_ID_DOMAIN_TAG = 'PrivacyLayerPoolId:v1';
const NETWORK_DOMAIN_BYTES = 32;
const DENOMINATION_BYTES = 16;
const TOKEN_LENGTH_PREFIX_BYTES = 2;

function poolTokenIdentityBytes(token: PoolTokenIdentity): Buffer {
  if (token.kind === 'native') {
    const code = token.assetCode.trim().toLowerCase();
    if (!code) {
      throw new Error('native assetCode must be non-empty');
    }
    return Buffer.from(`native:${code}`, 'utf8');
  }
  const contractId = token.contractId.trim().toLowerCase();
  if (!contractId) {
    throw new Error('contractId must be non-empty');
  }
  return Buffer.from(`contract:${contractId}`, 'utf8');
}

/**
 * Derive a canonical 32-byte pool identifier from:
 * - token identity (native asset code or contract identifier)
 * - fixed denomination
 * - network domain (32-byte hex string, e.g. Stellar network id)
 *
 * Formula (v1):
 *   digest = SHA256(
 *     "PrivacyLayerPoolId:v1" || network_domain(32) || denomination(16be) ||
 *     token_len(2be) || token_identity_bytes
 *   )
 *   pool_id = 0x00 || digest[1..32]
 *
 * Leading zero keeps the pool identifier inside a strict 31-byte field range.
 */
export function deriveCanonicalPoolId(
  token: PoolTokenIdentity,
  denomination: bigint,
  networkDomainHex: string
): string {
  const networkDomain = hexToBytes(networkDomainHex, 'networkDomainHex', NETWORK_DOMAIN_BYTES);
  const tokenBytes = poolTokenIdentityBytes(token);
  if (tokenBytes.length > 0xffff) {
    throw new Error('token identity encoding exceeds 65535 bytes');
  }

  const tokenLength = bigintToFixedBytes(BigInt(tokenBytes.length), TOKEN_LENGTH_PREFIX_BYTES, 'token identity length');
  const denominationBytes = bigintToFixedBytes(denomination, DENOMINATION_BYTES, 'denomination');

  const digest = createHash('sha256')
    .update(Buffer.from(POOL_ID_DOMAIN_TAG, 'utf8'))
    .update(networkDomain)
    .update(denominationBytes)
    .update(tokenLength)
    .update(tokenBytes)
    .digest();

  const poolId = Buffer.alloc(32);
  poolId[0] = 0;
  digest.copy(poolId, 1, 1, 32);
  return poolId.toString('hex');
}

/**
 * Convert a bigint field element to a canonical 64-character hex string (32 bytes).
 * Throws if the value lies outside the BN254 scalar field.
 */
export function fieldToHex(n: bigint): string {
  if (n < 0n || n >= FIELD_MODULUS) {
    throw new RangeError(`Field element out of BN254 range: ${n}`);
  }
  return n.toString(16).padStart(64, '0');
}

/**
 * Parse a canonical field hex string into a bigint.
 */
export function hexToField(hex: string, label: string = 'field'): bigint {
  return BigInt('0x' + assertCanonicalFieldHex(hex, label));
}

/**
 * Interpret bytes as a big-endian field element without applying modular reduction.
 */
export function bufferToField(buf: Buffer, label: string = 'field bytes'): bigint {
  if (buf.length === 0) {
    throw new Error('Cannot convert empty buffer to field element');
  }
  const n = BigInt('0x' + bytesToHex(buf));
  if (n >= FIELD_MODULUS) {
    throw new RangeError(`${label} must be < BN254 field modulus`);
  }
  return n;
}

/**
 * Serialize a field element to a fixed-length Buffer (big-endian).
 * Useful when building raw byte payloads for Soroban host calls.
 */
export function fieldToBuffer(n: bigint, byteLength: number = 32): Buffer {
  if (n < 0n || n >= FIELD_MODULUS) {
    throw new RangeError(`Field element out of BN254 range: ${n}`);
  }
  const buf = Buffer.alloc(byteLength);
  let val = n;
  for (let i = byteLength - 1; i >= 0; i--) {
    buf[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return buf;
}

export function fieldHexToBuffer(value: string, label: string = 'field'): Buffer {
  return Buffer.from(assertCanonicalFieldHex(value, label), 'hex');
}

/**
 * Encode a 31-byte note scalar (nullifier or secret) as a 64-char circuit field hex string.
 * Note scalars are 31 bytes so they fit unconditionally within the BN254 field (< 2^248 < r).
 */
export function noteScalarToField(buf: Buffer): string {
  assertByteLength(buf, NOTE_SCALAR_BYTE_LENGTH, 'Note scalar');
  return fieldToHex(BigInt('0x' + bytesToHex(buf)));
}

/**
 * Encoding Module - Consolidated from public_inputs.ts
 * 
 * This module now serves as a compatibility layer that re-exports
 * all functionality from the consolidated public_inputs.ts module.
 * 
 * For new code, prefer importing directly from './public_inputs'.
 */

// Re-export everything from public_inputs for backward compatibility
export * from './public_inputs';

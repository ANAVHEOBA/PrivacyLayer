import { createHash } from 'crypto';
import { FIELD_MODULUS, MERKLE_NODE_BYTE_LENGTH, NOTE_SCALAR_BYTE_LENGTH, NULLIFIER_DOMAIN_SEP_HEX } from './zk_constants';
import { StrKey } from '@stellar/stellar-base';
import { WitnessValidationError } from './errors';

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
 * Parse a hex string (with or without 0x prefix) into a bigint field element.
 * Reduces modulo the field prime so callers can pass raw hash digests.
 */
export function hexToField(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length === 0) throw new Error('Empty hex string');
  const n = BigInt('0x' + clean) % FIELD_MODULUS;
  return n;
}

/**
 * Interpret a Buffer as a big-endian unsigned integer and return it reduced
 * modulo the BN254 field prime.
 */
export function bufferToField(buf: Buffer): bigint {
  if (buf.length === 0) throw new Error('Cannot convert empty buffer to field element');
  return BigInt('0x' + buf.toString('hex')) % FIELD_MODULUS;
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

/**
 * Encode a 31-byte note scalar (nullifier or secret) as a 64-char circuit field hex string.
 * Note scalars are 31 bytes so they fit unconditionally within the BN254 field (< 2^248 < r).
 */
export function noteScalarToField(buf: Buffer): string {
  if (buf.length !== NOTE_SCALAR_BYTE_LENGTH) {
    throw new Error(`Note scalar must be ${NOTE_SCALAR_BYTE_LENGTH} bytes, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Encode a 32-byte Merkle node (root or path element) as a circuit field hex string.
 * Values are reduced modulo the field prime before encoding.
 */
export function merkleNodeToField(buf: Buffer): string {
  if (buf.length !== MERKLE_NODE_BYTE_LENGTH) {
    throw new Error(`Merkle node must be ${MERKLE_NODE_BYTE_LENGTH} bytes, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Encode a Stellar public key (G… Strkey address) as a circuit field element.
 *
 * The Stellar address is hashed with SHA-256 and the digest is reduced modulo
 * the BN254 field prime, producing a deterministic field-sized value.  This
 * mirrors the on-chain address_decoder used in the Soroban contract.
 */
export function stellarAddressToField(address: string): string {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new WitnessValidationError(`Invalid Stellar public key: ${address}`, 'ADDRESS', 'structure');
  }
  const digest = createHash('sha256').update(Buffer.from(address, 'utf8')).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Compute the domain-separated nullifier hash: H(DOMAIN, nullifier, root).
 *
 * The withdrawal circuit defines (circuits/lib/src/hash/nullifier.nr):
 *   nullifier_hash = pedersen_hash([NULLIFIER_DOMAIN_SEP, nullifier, root])
 *
 * The domain separator prevents cross-domain hash conflation between the
 * nullifier and commitment hash domains.
 *
 * This SDK implementation uses SHA-256 as a structural stand-in for the
 * BN254 Pedersen hash.  Replace with a real BN254 Pedersen implementation
 * (e.g. @noir-lang/barretenberg) before running against a real prover.
 * The input layout (domain ‖ nullifier ‖ root) mirrors the Noir circuit
 * so that both stacks are structurally equivalent.
 */
export function computeNullifierHash(nullifierField: string, rootField: string): string {
  const input = Buffer.concat([
    Buffer.from(NULLIFIER_DOMAIN_SEP_HEX, 'hex'),
    Buffer.from(nullifierField.padStart(64, '0'), 'hex'),
    Buffer.from(rootField.padStart(64, '0'), 'hex'),
  ]);
  const digest = createHash('sha256').update(input).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Encode a 32-byte pool identifier (hex string) as a circuit field hex string.
 * Values are reduced modulo the field prime.
 */
export function poolIdToField(poolId: string): string {
  const buf = Buffer.from(poolId, 'hex');
  if (buf.length !== MERKLE_NODE_BYTE_LENGTH) {
    throw new Error(`Pool ID must be ${MERKLE_NODE_BYTE_LENGTH} bytes hex, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Canonical public-input ordering for the withdrawal circuit (ZK-032).
 *
 * Mirrors the `pub` parameter declaration order in circuits/withdraw/src/main.nr.
 * Any change here must be reflected in witness preparation, proof formatting,
 * and the on-chain verifier.  Golden tests pin this order so accidental
 * reordering causes a test failure.
 */
export const WITHDRAWAL_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
] as const;

export type WithdrawalPublicInputKey = (typeof WITHDRAWAL_PUBLIC_INPUT_SCHEMA)[number];
export type WithdrawalPublicInputs = Record<WithdrawalPublicInputKey, string>;

export interface SerializedWithdrawalPublicInputs {
  values: WithdrawalPublicInputs;
  fields: string[];
  bytes: Buffer;
}

function assertCanonicalFieldHex(value: string, label: WithdrawalPublicInputKey): string {
  const clean = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`${label} must be a 64-digit hex string`);
  }
  return clean.toLowerCase();
}

function assertCanonicalFieldDecimal(value: string, label: WithdrawalPublicInputKey): bigint {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a non-negative decimal string`);
  }
  return BigInt(value);
}

function encodeWithdrawalPublicInputValue(
  key: WithdrawalPublicInputKey,
  value: string
): Buffer {
  switch (key) {
    case 'amount':
    case 'fee':
      return fieldToBuffer(assertCanonicalFieldDecimal(value, key));
    default:
      return Buffer.from(assertCanonicalFieldHex(value, key), 'hex');
  }
}

export function collectWithdrawalPublicInputs(
  source: WithdrawalPublicInputs
): WithdrawalPublicInputs {
  const values = {} as WithdrawalPublicInputs;

  for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
    const value = source[key];
    if (typeof value !== 'string') {
      throw new Error(`Missing public input: ${key}`);
    }
    values[key] = value;
  }

  return values;
}

/**
 * Serialize the named withdrawal public inputs into the exact canonical
 * field order and 32-byte big-endian byte layout consumed by verifier boundaries.
 */
export function serializeWithdrawalPublicInputs(
  source: WithdrawalPublicInputs
): SerializedWithdrawalPublicInputs {
  const values = collectWithdrawalPublicInputs(source);
  const fields = WITHDRAWAL_PUBLIC_INPUT_SCHEMA.map((key) => values[key]);
  const bytes = Buffer.concat(
    WITHDRAWAL_PUBLIC_INPUT_SCHEMA.map((key) => encodeWithdrawalPublicInputValue(key, values[key]))
  );

  return { values, fields, bytes };
}

/**
 * Pack the public inputs of the withdrawal circuit in the canonical order
 * defined by WITHDRAWAL_PUBLIC_INPUT_SCHEMA:
 *
 *   pool_id | root | nullifier_hash | recipient | amount | relayer | fee
 */
export function packWithdrawalPublicInputs(
  poolId: string,
  root: string,
  nullifierHash: string,
  recipient: string,
  amount: bigint,
  relayer: string,
  fee: bigint
): string[] {
  return serializeWithdrawalPublicInputs({
    pool_id: poolId,
    root,
    nullifier_hash: nullifierHash,
    recipient,
    amount: amount.toString(),
    relayer,
    fee: fee.toString(),
  }).fields;
}

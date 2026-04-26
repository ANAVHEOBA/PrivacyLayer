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
 * Encode a 32-byte Merkle node (root or path element) as a canonical field hex string.
 */
export function merkleNodeToField(buf: Buffer): string {
  assertByteLength(buf, MERKLE_NODE_BYTE_LENGTH, 'Merkle node');
  return fieldToHex(bufferToField(buf, 'Merkle node'));
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
    fieldHexToBuffer(NULLIFIER_DOMAIN_SEP_HEX, 'NULLIFIER_DOMAIN_SEP_HEX'),
    fieldHexToBuffer(nullifierField, 'nullifier'),
    fieldHexToBuffer(rootField, 'root'),
  ]);
  const digest = createHash('sha256').update(input).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Encode a 32-byte pool identifier (hex string) as a canonical field hex string.
 */
export function poolIdToField(poolId: string): string {
  const bytes = hexToBytes(poolId, 'Pool ID', MERKLE_NODE_BYTE_LENGTH);
  return fieldToHex(bufferToField(bytes, 'Pool ID'));
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

export function collectWithdrawalPublicInputs(
  source: WithdrawalPublicInputs
): WithdrawalPublicInputs {
  const values = {} as WithdrawalPublicInputs;

  for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
    const value = source[key];
    if (typeof value !== 'string') {
      throw new Error(`Missing public input: ${key}`);
    }
    values[key] = assertCanonicalFieldHex(value, key);
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
  const bytes = Buffer.concat(fields.map((value, index) =>
    fieldHexToBuffer(value, WITHDRAWAL_PUBLIC_INPUT_SCHEMA[index])
  ));

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
    pool_id: assertCanonicalFieldHex(poolId, 'pool_id'),
    root: assertCanonicalFieldHex(root, 'root'),
    nullifier_hash: assertCanonicalFieldHex(nullifierHash, 'nullifier_hash'),
    recipient: assertCanonicalFieldHex(recipient, 'recipient'),
    amount: fieldToHex(amount),
    relayer: assertCanonicalFieldHex(relayer, 'relayer'),
    fee: fieldToHex(fee),
  }).fields;
}

/**
 * Withdrawal Public Input Encoding (ZK-008)
 *
 * This module provides a dedicated encoding layer for withdrawal public inputs,
 * consolidating all encoding logic into a single, testable API. All public-input
 * encoding should be routed through this module to ensure consistency between
 * the SDK, fixtures, and contract verifier.
 *
 * Public Input Order (matching circuits/withdraw/src/main.nr):
 * 1. pool_id        - Unique identifier for the shielded pool
 * 2. root           - Merkle root proving membership
 * 3. nullifier_hash - Hash(nullifier, pool_id) preventing double-spend (ZK-035)
 * 4. recipient      - Stellar address hash preventing front-running
 * 5. amount         - Withdrawal amount
 * 6. relayer        - Optional relayer address hash (0 if none)
 * 7. fee            - Relayer fee (0 if no relayer)
 * 8. denomination   - Fixed denomination of the pool (ZK-030)
 *
 * Contract Verifier Order (contracts/privacy_pool/src/crypto/verifier.rs):
 * The contract verifier expects a subset of these inputs in a specific order:
 * 1. root
 * 2. nullifier_hash
 * 3. recipient
 * 4. amount
 * 5. relayer
 * 6. fee
 *
 * Note: pool_id and denomination are SDK-only inputs used for validation
 * but not passed to the contract verifier.
 */

import { createHash } from 'crypto';
import { FIELD_MODULUS, MERKLE_NODE_BYTE_LENGTH, NOTE_SCALAR_BYTE_LENGTH, NULLIFIER_DOMAIN_SEP_HEX } from './zk_constants';
import { StrKey } from '@stellar/stellar-base';
import { WitnessValidationError } from './errors';

// ============================================================
// Utility Functions
// ============================================================

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

function assertByteLength(buf: Buffer, expectedLength: number, label: string): void {
  if (buf.length !== expectedLength) {
    throw new Error(`${label} must be ${expectedLength} bytes, got ${buf.length}`);
  }
}

/**
 * Convert hex string to Buffer with validation.
 */
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

/**
 * Convert Buffer to hex string.
 */
export function bytesToHex(value: Buffer | Uint8Array): string {
  return Buffer.from(value).toString('hex');
}

/**
 * Convert a canonical field hex string to Buffer.
 */
export function fieldHexToBuffer(value: string, label: string = 'field'): Buffer {
  const clean = stripHexPrefix(value);
  if (!FIELD_HEX.test(clean)) {
    throw new Error(`${label} must be a 64-digit hex string`);
  }
  return Buffer.from(clean, 'hex');
}

// ============================================================
// Field Element Encoding
// ============================================================

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
export function hexToField(hex: string, _label: string = 'field'): bigint {
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

// ============================================================
// Public Input Encoding Functions
// ============================================================

/**
 * Encodes pool_id as a canonical field hex string.
 * Pool IDs are 32-byte hex strings representing unique pool identifiers.
 */
export function encodePoolId(poolId: string): string {
  const buf = Buffer.from(poolId, 'hex');
  if (buf.length !== 32) {
    throw new Error(`Pool ID must be 32 bytes hex, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Encodes Merkle root as a canonical field hex string.
 * Roots are 32-byte values from the Merkle tree.
 */
export function encodeMerkleRoot(root: Buffer): string {
  if (root.length !== MERKLE_NODE_BYTE_LENGTH) {
    throw new Error(`Merkle root must be ${MERKLE_NODE_BYTE_LENGTH} bytes, got ${root.length}`);
  }
  return fieldToHex(bufferToField(root));
}

/**
 * Encodes nullifier as a canonical field hex string.
 * Nullifiers are 31-byte note scalars.
 */
export function encodeNullifier(nullifier: Buffer): string {
  if (nullifier.length !== NOTE_SCALAR_BYTE_LENGTH) {
    throw new Error(`Nullifier must be ${NOTE_SCALAR_BYTE_LENGTH} bytes, got ${nullifier.length}`);
  }
  return fieldToHex(bufferToField(nullifier));
}

/**
 * Encodes secret as a canonical field hex string.
 * Secrets are 31-byte note scalars.
 */
export function encodeSecret(secret: Buffer): string {
  if (secret.length !== NOTE_SCALAR_BYTE_LENGTH) {
    throw new Error(`Secret must be ${NOTE_SCALAR_BYTE_LENGTH} bytes, got ${secret.length}`);
  }
  return fieldToHex(bufferToField(secret));
}

/**
 * Encodes a Stellar public key (G… Strkey address) as a circuit field element.
 *
 * The Stellar address is hashed with SHA-256 and the digest is reduced modulo
 * the BN254 field prime, producing a deterministic field-sized value.  This
 * mirrors the on-chain address_decoder used in the Soroban contract.
 */
export function encodeStellarAddress(address: string): string {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new WitnessValidationError(`Invalid Stellar public key: ${address}`, 'ADDRESS', 'structure');
  }
  const digest = createHash('sha256').update(Buffer.from(address, 'utf8')).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Encodes amount as a canonical field hex string.
 * Amounts are bigint values representing the withdrawal amount.
 * 
 * ZK-082: Canonical representation is 64-character hex string (32 bytes, big-endian).
 * Decimal strings are NOT accepted at the SDK boundary.
 */
export function encodeAmount(amount: bigint): string {
  if (amount < 0n) {
    throw new Error(`Amount must be non-negative, got ${amount}`);
  }
  return fieldToHex(amount);
}

/**
 * Encodes fee as a canonical field hex string.
 * Fees are bigint values representing the relayer fee.
 * 
 * ZK-082: Canonical representation is 64-character hex string (32 bytes, big-endian).
 * Decimal strings are NOT accepted at the SDK boundary.
 */
export function encodeFee(fee: bigint): string {
  if (fee < 0n) {
    throw new Error(`Fee must be non-negative, got ${fee}`);
  }
  return fieldToHex(fee);
}

/**
 * Encodes denomination as a canonical field hex string.
 * Denominations are bigint values representing the pool's fixed denomination.
 * 
 * ZK-082: Canonical representation is 64-character hex string (32 bytes, big-endian).
 * Decimal strings are NOT accepted at the SDK boundary.
 */
export function encodeDenomination(denomination: bigint): string {
  if (denomination <= 0n) {
    throw new Error(`Denomination must be positive, got ${denomination}`);
  }
  return fieldToHex(denomination);
}

// ============================================================
// Additional Utility Functions (Consolidated from encoding.ts)
// ============================================================

/**
 * Computes the domain-separated nullifier hash: H(DOMAIN, nullifier, pool_id) (ZK-035).
 *
 * The withdrawal circuit defines (circuits/lib/src/hash/nullifier.nr):
 *   nullifier_hash = pedersen_hash([NULLIFIER_DOMAIN_SEP, nullifier, pool_id])
 *
 * The domain separator prevents cross-domain hash conflation between the
 * nullifier and commitment hash domains.
 *
 * ZK-035: Changed from root-bound to pool-scoped nullifier derivation.
 * Spend identifiers remain stable across historical roots for the same note and pool.
 * Cross-pool replays are rejected by construction since pool_id is part of the hash.
 *
 * @mock-hash ZK-106 — This implementation uses **SHA-256 as a structural stand-in**
 * for the BN254 Pedersen hash used by the Noir withdrawal circuit.  The input layout
 * (DOMAIN ‖ nullifier ‖ pool_id) mirrors the circuit, but the hash function differs,
 * so outputs diverge from what a real prover expects.  Do NOT use the result in a
 * witness for a real Barretenberg/Noir prover.  See {@link HashMode} in hash_mode.ts
 * and ZK-009/ZK-017 for the live-hash replacement path.
 */
export function encodeNullifierHash(nullifierField: string, poolIdField: string): string {
  const input = Buffer.concat([
    Buffer.from(NULLIFIER_DOMAIN_SEP_HEX, 'hex'),
    Buffer.from(nullifierField.padStart(64, '0'), 'hex'),
    Buffer.from(poolIdField.padStart(64, '0'), 'hex'),
  ]);
  const digest = createHash('sha256').update(input).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

// ============================================================
// Public Input Schema and Serialization
// ============================================================

/**
 * Canonical order of withdrawal public inputs.
 * Matches the circuit parameter declaration order in circuits/withdraw/src/main.nr.
 */
export const WITHDRAWAL_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
  'denomination',
] as const;

/**
 * Order of public inputs expected by the contract verifier.
 * Matches the circuit's parameter order for BN254 pairing checks.
 */
export const CONTRACT_VERIFIER_INPUT_SCHEMA = WITHDRAWAL_PUBLIC_INPUT_SCHEMA;

export type WithdrawalPublicInputKey = (typeof WITHDRAWAL_PUBLIC_INPUT_SCHEMA)[number];
export type ContractVerifierInputKey = (typeof CONTRACT_VERIFIER_INPUT_SCHEMA)[number];

export type WithdrawalPublicInputs = Record<WithdrawalPublicInputKey, string>;
export type ContractVerifierInputs = Record<ContractVerifierInputKey, string>;

export interface SerializedWithdrawalPublicInputs {
  values: WithdrawalPublicInputs;
  fields: string[];
  bytes: Buffer;
}

export interface SerializedContractVerifierInputs {
  values: ContractVerifierInputs;
  fields: string[];
  bytes: Buffer;
}

/**
 * Validates that a value is a canonical 64-character hex string.
 * 
 * ZK-082: All withdrawal public inputs including amount, fee, and denomination
 * must use canonical field hex representation (64-char hex, 32 bytes, big-endian).
 */
function assertCanonicalFieldHex(value: string, label: string): string {
  const clean = value.startsWith('0x') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`${label} must be a 64-digit hex string (canonical field encoding)`);
  }
  return clean.toLowerCase();
}

/**
 * Encodes a withdrawal public input value as a 32-byte big-endian buffer.
 * 
 * ZK-082: All public inputs use canonical field hex representation.
 * Amount, fee, and denomination must be 64-char hex strings, NOT decimal strings.
 */
function encodeWithdrawalPublicInputValue(
  key: WithdrawalPublicInputKey,
  value: string
): Buffer {
  // ZK-082: Reject decimal strings for amount, fee, denomination
  // A decimal string is one that is NOT a 64-char hex string but contains only digits
  if (key === 'amount' || key === 'fee' || key === 'denomination') {
    if (value.length !== 64 && /^\d+$/.test(value)) {
      throw new Error(
        `${key} must be a canonical 64-character field hex string, not a decimal string. ` +
        `Use encode${key.charAt(0).toUpperCase() + key.slice(1)}() to convert bigint to canonical hex.`
      );
    }
  }
  return Buffer.from(assertCanonicalFieldHex(value, key), 'hex');
}

/**
 * Collects and validates all withdrawal public inputs.
 */
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
 * Serializes withdrawal public inputs into canonical field order and byte layout.
 *
 * This function produces the exact format consumed by verifier boundaries:
 * - Fields array: ordered 64-char hex strings
 * - Bytes: concatenated 32-byte big-endian values (256 bytes total)
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
 * Serializes contract verifier inputs into canonical field order and byte layout.
 *
 * This produces the subset of inputs expected by the Soroban contract verifier.
 * Excludes pool_id and denomination which are SDK-only validation inputs.
 */
export function serializeContractVerifierInputs(
  source: WithdrawalPublicInputs
): SerializedContractVerifierInputs {
  const values: ContractVerifierInputs = {
    pool_id: source.pool_id,
    root: source.root,
    nullifier_hash: source.nullifier_hash,
    recipient: source.recipient,
    amount: source.amount,
    relayer: source.relayer,
    fee: source.fee,
    denomination: source.denomination,
  };

  const fields = CONTRACT_VERIFIER_INPUT_SCHEMA.map((key) => values[key]);
  const bytes = Buffer.concat(
    CONTRACT_VERIFIER_INPUT_SCHEMA.map((key) => encodeWithdrawalPublicInputValue(key as WithdrawalPublicInputKey, values[key]))
  );

  return { values, fields, bytes };
}

/**
 * Packs withdrawal public inputs for circuit consumption.
 *
 * This is a convenience function that takes individual values and produces
 * the serialized format expected by the circuit.
 * 
 * ZK-082: Amount, fee, and denomination are converted to canonical field hex.
 * All other fields must already be canonical 64-character hex strings.
 */
export function packWithdrawalPublicInputs(
  poolId: string,
  root: string,
  nullifierHash: string,
  recipient: string,
  amount: bigint,
  relayer: string,
  fee: bigint,
  denomination: bigint
): string[] {
  return serializeWithdrawalPublicInputs({
    pool_id: poolId,
    root,
    nullifier_hash: nullifierHash,
    recipient,
    amount: encodeAmount(amount),
    relayer,
    fee: encodeFee(fee),
    denomination: encodeDenomination(denomination),
  }).fields;
}

// ============================================================
// Legacy Aliases for Backward Compatibility
// ============================================================

/**
 * @deprecated Use encodeNullifier instead
 */
export function noteScalarToField(buf: Buffer): string {
  return encodeNullifier(buf);
}

/**
 * @deprecated Use encodeMerkleRoot instead
 */
export function merkleNodeToField(buf: Buffer): string {
  return encodeMerkleRoot(buf);
}

/**
 * @deprecated Use encodeStellarAddress instead
 */
export function stellarAddressToField(address: string): string {
  return encodeStellarAddress(address);
}

/**
 * @deprecated Use encodePoolId instead
 */
export function poolIdToField(poolId: string): string {
  return encodePoolId(poolId);
}

/**
 * @deprecated Use encodeNullifierHash instead
 */
export function computeNullifierHash(nullifierField: string, poolIdField: string): string {
  return encodeNullifierHash(nullifierField, poolIdField);
}

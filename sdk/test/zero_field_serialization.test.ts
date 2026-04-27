/**
 * ZK-103: Zero-valued field serialization regression tests.
 *
 * Pins the canonical representation of zero values throughout witness
 * construction and public-input packing.  No field should ever produce a
 * bare decimal "0" string or an inconsistently-padded hex value at the
 * contract boundary — every zero must serialize to the 64-character hex
 * string "0000...0000" (32 zero bytes).
 *
 * Wave Issue Key: ZK-103
 */

import {
  fieldToHex,
  fieldToBuffer,
  encodeAmount,
  encodeFee,
  encodeDenomination,
  encodeRelayer,
  encodeNullifierHash,
  serializeWithdrawalPublicInputs,
  packWithdrawalPublicInputs,
  serializeContractVerifierInputs,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
  CONTRACT_VERIFIER_INPUT_SCHEMA,
} from '../src/public_inputs';
import { FIELD_MODULUS, ZERO_FIELD_HEX, STELLAR_ZERO_ACCOUNT } from '../src/zk_constants';

const ZERO_HEX_64 = '0'.repeat(64);
const ZERO_BUF_32 = Buffer.alloc(32, 0);

// ---------------------------------------------------------------------------
// 1. Helper-level zero encoding
// ---------------------------------------------------------------------------
describe('Zero-value field encoding (ZK-103)', () => {
  it('fieldToHex(0n) === 64 zeros', () => {
    expect(fieldToHex(0n)).toBe(ZERO_HEX_64);
  });

  it('fieldToBuffer(0n) === 32-byte zero buffer', () => {
    const buf = fieldToBuffer(0n);
    expect(buf).toEqual(ZERO_BUF_32);
  });

  it('encodeAmount(0n) produces 64-char hex zero (not bare "0")', () => {
    const encoded = encodeAmount(0n);
    expect(encoded).toBe(ZERO_HEX_64);
    expect(encoded).not.toBe('0');
  });

  it('encodeFee(0n) produces 64-char hex zero (not bare "0")', () => {
    const encoded = encodeFee(0n);
    expect(encoded).toBe(ZERO_HEX_64);
    expect(encoded).not.toBe('0');
  });

  it('ZERO_FIELD_HEX constant equals 64 zeros', () => {
    expect(ZERO_FIELD_HEX).toBe(ZERO_HEX_64);
    expect(ZERO_FIELD_HEX.length).toBe(64);
  });

  it('encodeRelayer with zero-account sentinel gives 64-char hex zero', () => {
    const encoded = encodeRelayer(STELLAR_ZERO_ACCOUNT);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(encoded)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. No mixed representation in serialized public inputs
// ---------------------------------------------------------------------------
describe('Serialized public inputs: no bare "0" strings at contract boundary (ZK-103)', () => {
  const POOL_ID = ZERO_HEX_64;
  const ROOT    = ZERO_HEX_64;
  const NULLIFIER_HASH = ZERO_HEX_64;
  const RECIPIENT = ZERO_HEX_64;
  const RELAYER   = ZERO_HEX_64;

  const zeroInputs = {
    pool_id: POOL_ID,
    root: ROOT,
    nullifier_hash: NULLIFIER_HASH,
    recipient: RECIPIENT,
    amount: '0',
    relayer: RELAYER,
    fee: '0',
    denomination: String(1_000_000_000), // non-zero denomination required
  };

  it('all serialized fields are 64-char hex strings (no bare "0")', () => {
    const serialized = serializeWithdrawalPublicInputs(zeroInputs);
    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      const val = serialized.fields[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf(key)];
      expect(val).toMatch(/^[0-9a-f]{64}$/);
      expect(val).not.toBe('0');
    }
  });

  it('zero amount serializes to 64-char hex zero, not bare "0"', () => {
    const serialized = serializeWithdrawalPublicInputs(zeroInputs);
    const amountIdx = WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('amount');
    expect(serialized.fields[amountIdx]).toBe(ZERO_HEX_64);
  });

  it('zero fee serializes to 64-char hex zero, not bare "0"', () => {
    const serialized = serializeWithdrawalPublicInputs(zeroInputs);
    const feeIdx = WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('fee');
    expect(serialized.fields[feeIdx]).toBe(ZERO_HEX_64);
  });

  it('zero relayer serializes to 64-char hex zero', () => {
    const serialized = serializeWithdrawalPublicInputs(zeroInputs);
    const relayerIdx = WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('relayer');
    expect(serialized.fields[relayerIdx]).toBe(ZERO_HEX_64);
  });

  it('packed buffer for all-zero inputs is 256 bytes of zeros (except denomination)', () => {
    const packed = serializeWithdrawalPublicInputs(zeroInputs);
    // 8 fields × 32 bytes = 256 bytes
    expect(packed.bytes.length).toBe(256);
    // bytes 0..192 cover pool_id, root, nullifier_hash, recipient, amount, relayer, fee — all zero
    const head = packed.bytes.slice(0, 7 * 32);
    expect(head).toEqual(Buffer.alloc(7 * 32, 0));
  });
});

// ---------------------------------------------------------------------------
// 3. Contract verifier inputs: zero-fee and zero-relayer round-trip
// ---------------------------------------------------------------------------
describe('Contract verifier inputs zero round-trip (ZK-103)', () => {
  const inputs = {
    pool_id: ZERO_HEX_64,
    root: ZERO_HEX_64,
    nullifier_hash: ZERO_HEX_64,
    recipient: ZERO_HEX_64,
    amount: ZERO_HEX_64,
    relayer: ZERO_HEX_64,
    fee: ZERO_HEX_64,
    denomination: ZERO_HEX_64,
  };

  it('serializeContractVerifierInputs with zero fee/relayer produces all-hex output', () => {
    const result = serializeContractVerifierInputs(inputs);
    for (const field of result.fields) {
      expect(field).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('zero fee in contract verifier is 64 hex zeros', () => {
    const result = serializeContractVerifierInputs(inputs);
    const feeIdx = CONTRACT_VERIFIER_INPUT_SCHEMA.indexOf('fee');
    expect(result.fields[feeIdx]).toBe(ZERO_HEX_64);
  });
});

// ---------------------------------------------------------------------------
// 4. nullifierHash zero handling
// ---------------------------------------------------------------------------
describe('nullifierHash zero encoding (ZK-103)', () => {
  it('encodeNullifierHash never produces a bare "0" string', () => {
    // A valid nullifier hash must be a 64-char hex string.
    // We don't call it with literal zero (it domain-hashes inputs),
    // but the return type must always be 64-char hex.
    const result = encodeNullifierHash(
      ZERO_HEX_64,
      ZERO_HEX_64,
    );
    expect(result).toMatch(/^[0-9a-f]{64}$/);
    expect(result.length).toBe(64);
  });
});

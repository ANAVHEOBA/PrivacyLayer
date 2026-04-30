/**
 * ZK-001: Canonical BN254 field encoding contract tests.
 *
 * Pins the encoding path for field values, 31-byte note scalars, pool IDs,
 * and public inputs so drift between Noir and the SDK is caught early.
 */
import {
  fieldToHex,
  hexToField,
  bufferToField,
  fieldToBuffer,
  noteScalarToField,
  merkleNodeToField,
  poolIdToField,
  stellarAddressToField,
  computeNullifierHash,
  serializeWithdrawalPublicInputs,
  packWithdrawalPublicInputs,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
} from '../src/encoding';
import { FIELD_MODULUS, NOTE_SCALAR_BYTE_LENGTH, MERKLE_NODE_BYTE_LENGTH } from '../src/zk_constants';

// ---------------------------------------------------------------------------
// Test fixtures (deterministic, no randomness)
// ---------------------------------------------------------------------------

const ZERO_FIELD = '0'.repeat(64);
const MAX_VALID_FIELD = (FIELD_MODULUS - 1n).toString(16).padStart(64, '0');
// A random valid 31-byte note scalar (all bits set in 31 bytes = 2^248 - 1 < FIELD_MODULUS)
const MAX_NOTE_SCALAR = Buffer.alloc(NOTE_SCALAR_BYTE_LENGTH, 0xff);
const ZERO_NOTE_SCALAR = Buffer.alloc(NOTE_SCALAR_BYTE_LENGTH, 0x00);
const SAMPLE_NOTE_SCALAR = Buffer.from('deadbeef' + '00'.repeat(27), 'hex');

const SAMPLE_POOL_ID = 'a'.repeat(64); // 32 bytes hex
const ZERO_POOL_ID = '0'.repeat(64);

const SAMPLE_MERKLE_NODE = Buffer.alloc(MERKLE_NODE_BYTE_LENGTH, 0xab);
const ZERO_MERKLE_NODE = Buffer.alloc(MERKLE_NODE_BYTE_LENGTH, 0x00);

// Valid Stellar public keys for testing
const SAMPLE_STELLAR_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const SAMPLE_STELLAR_ADDRESS_2 = 'GB775243GWUR2VM74SGFIBLRIMQCVJ73D426X62B2MR4L6KTQU2XSX3G';

// ---------------------------------------------------------------------------
// fieldToHex
// ---------------------------------------------------------------------------

describe('fieldToHex — valid inputs', () => {
  it('encodes zero', () => {
    expect(fieldToHex(0n)).toBe(ZERO_FIELD);
  });

  it('encodes one', () => {
    expect(fieldToHex(1n)).toBe('0'.repeat(63) + '1');
  });

  it('encodes the maximum valid field element (FIELD_MODULUS - 1)', () => {
    const result = fieldToHex(FIELD_MODULUS - 1n);
    expect(result).toHaveLength(64);
    expect(result).toBe(MAX_VALID_FIELD);
  });

  it('always returns a 64-character lowercase hex string', () => {
    const cases = [0n, 1n, 255n, 0xdeadn, FIELD_MODULUS - 1n];
    for (const n of cases) {
      const hex = fieldToHex(n);
      expect(hex).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe('fieldToHex — invalid inputs', () => {
  it('rejects negative values', () => {
    expect(() => fieldToHex(-1n)).toThrow(RangeError);
  });

  it('rejects FIELD_MODULUS itself', () => {
    expect(() => fieldToHex(FIELD_MODULUS)).toThrow(RangeError);
  });

  it('rejects values larger than FIELD_MODULUS', () => {
    expect(() => fieldToHex(FIELD_MODULUS + 1n)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// hexToField — round-trip
// ---------------------------------------------------------------------------

describe('hexToField', () => {
  it('parses zero hex', () => {
    expect(hexToField(ZERO_FIELD)).toBe(0n);
  });

  it('parses a canonical field hex and round-trips with fieldToHex', () => {
    const n = 12345678901234567890n;
    const hex = fieldToHex(n);
    expect(hexToField(hex)).toBe(n);
  });

  it('reduces values >= FIELD_MODULUS modulo the prime', () => {
    // FIELD_MODULUS in hex should reduce to 0
    const modHex = FIELD_MODULUS.toString(16);
    expect(hexToField(modHex)).toBe(0n);
  });

  it('strips 0x prefix', () => {
    const hex = '0x' + '1'.padStart(64, '0');
    expect(hexToField(hex)).toBe(1n);
  });

  it('throws on empty string', () => {
    expect(() => hexToField('')).toThrow();
  });

  it('round-trips for boundary values', () => {
    const boundaries = [0n, 1n, FIELD_MODULUS - 1n];
    for (const n of boundaries) {
      expect(hexToField(fieldToHex(n))).toBe(n);
    }
  });
});

// ---------------------------------------------------------------------------
// bufferToField / fieldToBuffer — round-trip
// ---------------------------------------------------------------------------

describe('bufferToField / fieldToBuffer round-trip', () => {
  it('converts a 32-byte all-zero buffer to 0n', () => {
    expect(bufferToField(Buffer.alloc(32, 0))).toBe(0n);
  });

  it('converts a 32-byte all-ones buffer and reduces mod field prime', () => {
    const buf = Buffer.alloc(32, 0xff);
    const n = bufferToField(buf);
    expect(n).toBeGreaterThanOrEqual(0n);
    expect(n).toBeLessThan(FIELD_MODULUS);
  });

  it('throws on empty buffer', () => {
    expect(() => bufferToField(Buffer.alloc(0))).toThrow();
  });

  it('fieldToBuffer produces big-endian bytes', () => {
    const n = 0x01n;
    const buf = fieldToBuffer(n, 4);
    expect(buf).toEqual(Buffer.from([0, 0, 0, 1]));
  });

  it('fieldToBuffer rejects out-of-range values', () => {
    expect(() => fieldToBuffer(FIELD_MODULUS)).toThrow(RangeError);
    expect(() => fieldToBuffer(-1n)).toThrow(RangeError);
  });

  it('bufferToField(fieldToBuffer(n)) round-trips for valid n', () => {
    const cases = [0n, 1n, 0xdeadbeefn, FIELD_MODULUS - 1n];
    for (const n of cases) {
      // fieldToBuffer pads to 32 bytes and bufferToField reduces mod prime
      // For values < FIELD_MODULUS, round-trip is identity
      expect(bufferToField(fieldToBuffer(n))).toBe(n);
    }
  });
});

// ---------------------------------------------------------------------------
// noteScalarToField
// ---------------------------------------------------------------------------

describe('noteScalarToField', () => {
  it('encodes a zero 31-byte scalar', () => {
    expect(noteScalarToField(ZERO_NOTE_SCALAR)).toBe(ZERO_FIELD);
  });

  it('encodes all-ones 31-byte scalar without field overflow', () => {
    // 2^248 - 1 < FIELD_MODULUS, so no reduction needed
    const result = noteScalarToField(MAX_NOTE_SCALAR);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
    const n = hexToField(result);
    expect(n).toBeLessThan(FIELD_MODULUS);
  });

  it('encodes a sample scalar deterministically', () => {
    const a = noteScalarToField(SAMPLE_NOTE_SCALAR);
    const b = noteScalarToField(SAMPLE_NOTE_SCALAR);
    expect(a).toBe(b);
  });

  it('rejects scalars shorter than 31 bytes', () => {
    expect(() => noteScalarToField(Buffer.alloc(30))).toThrow();
  });

  it('rejects scalars longer than 31 bytes', () => {
    expect(() => noteScalarToField(Buffer.alloc(32))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// merkleNodeToField
// ---------------------------------------------------------------------------

describe('merkleNodeToField', () => {
  it('encodes a zero Merkle node', () => {
    expect(merkleNodeToField(ZERO_MERKLE_NODE)).toBe(ZERO_FIELD);
  });

  it('encodes a sample Merkle node as a 64-char hex string', () => {
    const result = merkleNodeToField(SAMPLE_MERKLE_NODE);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects buffers that are not 32 bytes', () => {
    expect(() => merkleNodeToField(Buffer.alloc(31))).toThrow();
    expect(() => merkleNodeToField(Buffer.alloc(33))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// poolIdToField
// ---------------------------------------------------------------------------

describe('poolIdToField', () => {
  it('encodes a zero pool ID', () => {
    expect(poolIdToField(ZERO_POOL_ID)).toBe(ZERO_FIELD);
  });

  it('encodes a sample pool ID as a 64-char hex string', () => {
    const result = poolIdToField(SAMPLE_POOL_ID);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects pool IDs that are not 64 hex chars (32 bytes)', () => {
    expect(() => poolIdToField('aa'.repeat(31))).toThrow();
    expect(() => poolIdToField('aa'.repeat(33))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// stellarAddressToField
// ---------------------------------------------------------------------------

describe('stellarAddressToField', () => {
  it('encodes a valid Stellar address as a 64-char hex field', () => {
    const result = stellarAddressToField(SAMPLE_STELLAR_ADDRESS);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same address', () => {
    const a = stellarAddressToField(SAMPLE_STELLAR_ADDRESS);
    const b = stellarAddressToField(SAMPLE_STELLAR_ADDRESS);
    expect(a).toBe(b);
  });

  it('rejects invalid Stellar addresses', () => {
    expect(() => stellarAddressToField('not-a-stellar-address')).toThrow();
    expect(() => stellarAddressToField('')).toThrow();
  });

  it('produces different field values for different addresses', () => {
    const a = stellarAddressToField(SAMPLE_STELLAR_ADDRESS);
    const b = stellarAddressToField(SAMPLE_STELLAR_ADDRESS_2);
    expect(a).not.toBe(b);
  });

  it('produces a value within the BN254 field', () => {
    const hex = stellarAddressToField(SAMPLE_STELLAR_ADDRESS);
    const n = BigInt('0x' + hex);
    expect(n).toBeGreaterThanOrEqual(0n);
    expect(n).toBeLessThan(FIELD_MODULUS);
  });
});

// ---------------------------------------------------------------------------
// computeNullifierHash
// ---------------------------------------------------------------------------

describe('computeNullifierHash', () => {
  const nullifierField = '0'.repeat(64);
  const rootField = '1'.padStart(64, '0');

  it('produces a 64-char lowercase hex string', () => {
    const result = computeNullifierHash(nullifierField, rootField);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(computeNullifierHash(nullifierField, rootField))
      .toBe(computeNullifierHash(nullifierField, rootField));
  });

  it('produces different hashes for different inputs', () => {
    const h1 = computeNullifierHash(nullifierField, rootField);
    const h2 = computeNullifierHash(rootField, nullifierField);
    expect(h1).not.toBe(h2);
  });

  it('result is within the BN254 field', () => {
    const hex = computeNullifierHash(nullifierField, rootField);
    expect(BigInt('0x' + hex)).toBeLessThan(FIELD_MODULUS);
  });
});

// ---------------------------------------------------------------------------
// WITHDRAWAL_PUBLIC_INPUT_SCHEMA ordering (ZK-001 canonical contract)
// ---------------------------------------------------------------------------

describe('WITHDRAWAL_PUBLIC_INPUT_SCHEMA — canonical ordering', () => {
  it('contains exactly the seven expected keys', () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA).toHaveLength(7);
  });

  it('starts with pool_id (anchor field)', () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA[0]).toBe('pool_id');
  });

  it('has root as second field', () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA[1]).toBe('root');
  });

  it('has nullifier_hash as third field', () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA[2]).toBe('nullifier_hash');
  });

  it('has the complete expected order', () => {
    expect([...WITHDRAWAL_PUBLIC_INPUT_SCHEMA]).toEqual([
      'pool_id',
      'root',
      'nullifier_hash',
      'recipient',
      'amount',
      'relayer',
      'fee',
    ]);
  });
});

// ---------------------------------------------------------------------------
// serializeWithdrawalPublicInputs — round-trip
// ---------------------------------------------------------------------------

describe('serializeWithdrawalPublicInputs', () => {
  const validInputs = {
    pool_id: SAMPLE_POOL_ID,
    root: '0'.repeat(64),
    nullifier_hash: 'f'.repeat(64),
    recipient: 'a'.repeat(64),
    amount: '1000000',
    relayer: '0'.repeat(64),
    fee: '0',
  };

  it('serializes in canonical order', () => {
    const result = serializeWithdrawalPublicInputs(validInputs);
    expect(result.fields).toHaveLength(7);
    expect(result.fields[0]).toBe(validInputs.pool_id.toLowerCase());
  });

  it('produces 7 * 32 = 224 bytes', () => {
    const result = serializeWithdrawalPublicInputs(validInputs);
    expect(result.bytes.byteLength).toBe(224);
  });

  it('throws when a required key is missing', () => {
    const { pool_id: _, ...incomplete } = validInputs;
    expect(() => serializeWithdrawalPublicInputs(incomplete as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// packWithdrawalPublicInputs — canonical field array
// ---------------------------------------------------------------------------

describe('packWithdrawalPublicInputs', () => {
  it('returns an array of 7 strings', () => {
    const fields = packWithdrawalPublicInputs(
      SAMPLE_POOL_ID,
      '0'.repeat(64),
      'f'.repeat(64),
      'a'.repeat(64),
      1000000n,
      '0'.repeat(64),
      0n,
    );
    expect(fields).toHaveLength(7);
    for (const f of fields) {
      expect(typeof f).toBe('string');
    }
  });

  it('matches serializeWithdrawalPublicInputs output', () => {
    const amount = 5000000n;
    const fee = 500n;
    const serialized = serializeWithdrawalPublicInputs({
      pool_id: SAMPLE_POOL_ID,
      root: '0'.repeat(64),
      nullifier_hash: 'e'.repeat(64),
      recipient: 'b'.repeat(64),
      amount: amount.toString(),
      relayer: 'c'.repeat(64),
      fee: fee.toString(),
    });
    const packed = packWithdrawalPublicInputs(
      SAMPLE_POOL_ID,
      '0'.repeat(64),
      'e'.repeat(64),
      'b'.repeat(64),
      amount,
      'c'.repeat(64),
      fee,
    );
    expect(packed).toEqual(serialized.fields);
  });
});

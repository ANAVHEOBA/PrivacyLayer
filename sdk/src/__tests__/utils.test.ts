import { Denomination } from '../types';
import { computeCommitment, computeNullifierHash, generateNote } from '../utils/crypto';
import {
  addHexPrefix,
  bigintToHex32,
  bytesToBase64,
  bytesToHex,
  hexToBytes,
  normalizeHex,
} from '../utils/encoding';
import {
  amountForDenomination,
  assertHex32,
  assertNonZeroHex32,
  isHex32,
  validateNote,
} from '../utils/validation';

describe('encoding utilities', () => {
  it('round-trips hex and base64 values', () => {
    const bytes = Uint8Array.from([1, 2, 3, 255]);
    const hex = bytesToHex(bytes);

    expect(hex).toBe('010203ff');
    expect(Array.from(hexToBytes(hex))).toEqual([1, 2, 3, 255]);
    expect(bytesToBase64(bytes)).toBe('AQID/w==');
  });

  it('normalizes prefixed hex and encodes bigint bytes32', () => {
    expect(normalizeHex('0xABCD')).toBe('abcd');
    expect(addHexPrefix('ABCD')).toBe('0xabcd');
    expect(bigintToHex32(10n)).toBe(`${'0'.repeat(63)}a`);
  });
});

describe('validation utilities', () => {
  it('validates bytes32 values', () => {
    const hex32 = 'a'.repeat(64);
    expect(isHex32(hex32)).toBe(true);
    expect(() => assertHex32(hex32)).not.toThrow();
    expect(() => assertNonZeroHex32('0'.repeat(64))).toThrow('must not be zero');
  });

  it('returns denomination amounts in stroops or token microunits', () => {
    expect(amountForDenomination(Denomination.XLM_10)).toBe(100_000_000n);
    expect(amountForDenomination(Denomination.USDC_100)).toBe(100_000_000n);
  });
});

describe('crypto utilities', () => {
  it('computes deterministic commitment and nullifier hashes', () => {
    const nullifier = '1'.repeat(64);
    const secret = '2'.repeat(64);
    const root = '3'.repeat(64);

    expect(computeCommitment(nullifier, secret)).toHaveLength(64);
    expect(computeCommitment(nullifier, secret)).toBe(computeCommitment(nullifier, secret));
    expect(computeNullifierHash(nullifier, root)).toHaveLength(64);
  });

  it('generates a valid note', () => {
    const note = generateNote(Denomination.XLM_100);

    expect(note.nullifier).toHaveLength(64);
    expect(note.secret).toHaveLength(64);
    expect(note.commitment).toHaveLength(64);
    expect(note.denomination).toBe(Denomination.XLM_100);
    expect(() => validateNote(note)).not.toThrow();
  });
});

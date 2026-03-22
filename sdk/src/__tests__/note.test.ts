// ============================================================
// PrivacyLayer SDK — Note Generation Tests
// ============================================================

import {
  generateNote,
  validateNote,
  computeCommitment,
  generateRandomFieldElement,
  isValidFieldElement,
  isZeroCommitment,
  serializeNote,
  deserializeNote,
} from '../note';
import { Denomination, Note } from '../types';
import { ErrorCode, PrivacyLayerError } from '../errors';

// ──────────────────────────────────────────────────────────────
// generateRandomFieldElement
// ──────────────────────────────────────────────────────────────

describe('generateRandomFieldElement', () => {
  it('should return a 64-character hex string', () => {
    const field = generateRandomFieldElement();
    expect(field).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return a valid BN254 field element', () => {
    const field = generateRandomFieldElement();
    expect(isValidFieldElement(field)).toBe(true);
  });

  it('should generate unique values', () => {
    const a = generateRandomFieldElement();
    const b = generateRandomFieldElement();
    expect(a).not.toBe(b);
  });

  it('should generate 100 unique values without collision', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateRandomFieldElement());
    }
    expect(set.size).toBe(100);
  });
});

// ──────────────────────────────────────────────────────────────
// isValidFieldElement
// ──────────────────────────────────────────────────────────────

describe('isValidFieldElement', () => {
  it('should accept a valid 64-char hex string', () => {
    const valid = '0'.repeat(63) + '1';
    expect(isValidFieldElement(valid)).toBe(true);
  });

  it('should accept the zero field element', () => {
    expect(isValidFieldElement('0'.repeat(64))).toBe(true);
  });

  it('should reject strings shorter than 64 chars', () => {
    expect(isValidFieldElement('abcd')).toBe(false);
  });

  it('should reject strings longer than 64 chars', () => {
    expect(isValidFieldElement('0'.repeat(65))).toBe(false);
  });

  it('should reject non-hex characters', () => {
    expect(isValidFieldElement('g'.repeat(64))).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidFieldElement('')).toBe(false);
  });

  it('should reject values at or above BN254 modulus', () => {
    // BN254 modulus in hex (slightly above max valid)
    const modulus = '30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001';
    expect(isValidFieldElement(modulus)).toBe(false);
  });

  it('should accept value just below BN254 modulus', () => {
    const justBelow = '30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000';
    expect(isValidFieldElement(justBelow)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// isZeroCommitment
// ──────────────────────────────────────────────────────────────

describe('isZeroCommitment', () => {
  it('should return true for all-zero commitment', () => {
    expect(isZeroCommitment('0'.repeat(64))).toBe(true);
  });

  it('should return false for non-zero commitment', () => {
    expect(isZeroCommitment('0'.repeat(63) + '1')).toBe(false);
  });

  it('should return false for short strings', () => {
    expect(isZeroCommitment('0')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// computeCommitment
// ──────────────────────────────────────────────────────────────

describe('computeCommitment', () => {
  it('should produce a 64-char hex commitment', () => {
    const nullifier = generateRandomFieldElement();
    const secret = generateRandomFieldElement();
    const commitment = computeCommitment(nullifier, secret);
    expect(commitment).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic (same inputs -> same output)', () => {
    const nullifier = '0'.repeat(63) + '1';
    const secret = '0'.repeat(63) + '2';
    const a = computeCommitment(nullifier, secret);
    const b = computeCommitment(nullifier, secret);
    expect(a).toBe(b);
  });

  it('should produce different outputs for different inputs', () => {
    const n1 = '0'.repeat(63) + '1';
    const n2 = '0'.repeat(63) + '2';
    const secret = '0'.repeat(63) + '3';
    const a = computeCommitment(n1, secret);
    const b = computeCommitment(n2, secret);
    expect(a).not.toBe(b);
  });

  it('should produce a valid field element', () => {
    const nullifier = generateRandomFieldElement();
    const secret = generateRandomFieldElement();
    const commitment = computeCommitment(nullifier, secret);
    expect(isValidFieldElement(commitment)).toBe(true);
  });

  it('should throw for invalid nullifier', () => {
    expect(() => computeCommitment('invalid', '0'.repeat(64))).toThrow(PrivacyLayerError);
  });

  it('should throw for invalid secret', () => {
    expect(() => computeCommitment('0'.repeat(64), 'invalid')).toThrow(PrivacyLayerError);
  });
});

// ──────────────────────────────────────────────────────────────
// generateNote
// ──────────────────────────────────────────────────────────────

describe('generateNote', () => {
  it('should generate a note with all required fields', () => {
    const note = generateNote(Denomination.Xlm100, 'testnet');

    expect(note.nullifier).toMatch(/^[0-9a-f]{64}$/);
    expect(note.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(note.commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(note.denomination).toBe(Denomination.Xlm100);
    expect(note.network).toBe('testnet');
    expect(note.createdAt).toBeDefined();
  });

  it('should generate a valid commitment from nullifier and secret', () => {
    const note = generateNote(Denomination.Xlm10, 'testnet');
    const expectedCommitment = computeCommitment(note.nullifier, note.secret);
    expect(note.commitment).toBe(expectedCommitment);
  });

  it('should generate unique notes', () => {
    const noteA = generateNote(Denomination.Xlm100, 'testnet');
    const noteB = generateNote(Denomination.Xlm100, 'testnet');
    expect(noteA.nullifier).not.toBe(noteB.nullifier);
    expect(noteA.secret).not.toBe(noteB.secret);
    expect(noteA.commitment).not.toBe(noteB.commitment);
  });

  it('should pass validation for all denominations', () => {
    for (const denom of Object.values(Denomination)) {
      const note = generateNote(denom, 'testnet');
      expect(() => validateNote(note)).not.toThrow();
    }
  });

  it('should set the correct denomination', () => {
    const note = generateNote(Denomination.Usdc1000, 'mainnet');
    expect(note.denomination).toBe(Denomination.Usdc1000);
  });

  it('should set the correct network', () => {
    const note = generateNote(Denomination.Xlm10, 'mainnet');
    expect(note.network).toBe('mainnet');
  });

  it('should set a valid ISO timestamp', () => {
    const note = generateNote(Denomination.Xlm100, 'testnet');
    expect(() => new Date(note.createdAt)).not.toThrow();
    expect(new Date(note.createdAt).toISOString()).toBe(note.createdAt);
  });
});

// ──────────────────────────────────────────────────────────────
// validateNote
// ──────────────────────────────────────────────────────────────

describe('validateNote', () => {
  let validNote: Note;

  beforeEach(() => {
    validNote = generateNote(Denomination.Xlm100, 'testnet');
  });

  it('should return true for a valid note', () => {
    expect(validateNote(validNote)).toBe(true);
  });

  it('should throw for invalid nullifier', () => {
    validNote.nullifier = 'invalid';
    expect(() => validateNote(validNote)).toThrow(PrivacyLayerError);

    try {
      validateNote(validNote);
    } catch (err) {
      expect((err as PrivacyLayerError).code).toBe(ErrorCode.INVALID_NULLIFIER);
    }
  });

  it('should throw for invalid secret', () => {
    validNote.secret = 'xyz';
    expect(() => validateNote(validNote)).toThrow(PrivacyLayerError);

    try {
      validateNote(validNote);
    } catch (err) {
      expect((err as PrivacyLayerError).code).toBe(ErrorCode.INVALID_SECRET);
    }
  });

  it('should throw for tampered commitment', () => {
    // Change the commitment to an incorrect value
    validNote.commitment = '0'.repeat(63) + '1';
    expect(() => validateNote(validNote)).toThrow(PrivacyLayerError);

    try {
      validateNote(validNote);
    } catch (err) {
      expect((err as PrivacyLayerError).code).toBe(ErrorCode.INVALID_NOTE_FORMAT);
    }
  });

  it('should throw for zero commitment', () => {
    // Create a note where all fields produce a zero commitment
    // This requires manually setting fields since the generator prevents it
    const note: Note = {
      nullifier: '0'.repeat(64),
      secret: '0'.repeat(64),
      commitment: '0'.repeat(64),
      denomination: Denomination.Xlm100,
      network: 'testnet',
      createdAt: new Date().toISOString(),
    };

    // The commitment of (0,0) via SHA256 won't be zero, so this tests
    // the "commitment doesn't match" path
    expect(() => validateNote(note)).toThrow(PrivacyLayerError);
  });
});

// ──────────────────────────────────────────────────────────────
// serializeNote / deserializeNote
// ──────────────────────────────────────────────────────────────

describe('serializeNote / deserializeNote', () => {
  it('should roundtrip a note through serialization', () => {
    const original = generateNote(Denomination.Xlm100, 'testnet');
    const serialized = serializeNote(original);
    const deserialized = deserializeNote(serialized);

    expect(deserialized.nullifier).toBe(original.nullifier);
    expect(deserialized.secret).toBe(original.secret);
    expect(deserialized.commitment).toBe(original.commitment);
    expect(deserialized.denomination).toBe(original.denomination);
    expect(deserialized.network).toBe(original.network);
  });

  it('should produce the expected format', () => {
    const note = generateNote(Denomination.Usdc100, 'mainnet');
    const serialized = serializeNote(note);
    expect(serialized).toMatch(/^privlayer-note:v1:Usdc100:mainnet:[0-9a-f]{64}:[0-9a-f]{64}:[0-9a-f]{64}$/);
  });

  it('should throw for invalid serialized format', () => {
    expect(() => deserializeNote('invalid')).toThrow(PrivacyLayerError);
    expect(() => deserializeNote('wrong:format:here')).toThrow(PrivacyLayerError);
    expect(() => deserializeNote('')).toThrow(PrivacyLayerError);
  });

  it('should throw for tampered serialized note', () => {
    const note = generateNote(Denomination.Xlm100, 'testnet');
    const serialized = serializeNote(note);

    // Tamper with the commitment (last segment)
    const parts = serialized.split(':');
    parts[6] = '0'.repeat(64);
    const tampered = parts.join(':');

    expect(() => deserializeNote(tampered)).toThrow(PrivacyLayerError);
  });

  it('should work for all denominations', () => {
    for (const denom of Object.values(Denomination)) {
      const note = generateNote(denom, 'testnet');
      const serialized = serializeNote(note);
      const deserialized = deserializeNote(serialized);
      expect(deserialized.denomination).toBe(denom);
    }
  });
});

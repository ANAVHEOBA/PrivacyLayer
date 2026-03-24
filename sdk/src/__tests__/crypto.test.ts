/**
 * Unit tests for cryptographic utilities.
 */

import {
  randomFieldElement,
  randomHex,
  sha256,
  pedersenHash,
  computeCommitment,
  computeNullifierHash,
  generateNote,
  initPedersen,
} from '../utils/crypto';
import { FIELD_SIZE } from '../constants';

describe('Crypto Utilities', () => {
  beforeAll(async () => {
    await initPedersen();
  }, 30000); // 30 second timeout for circomlibjs initialization

  describe('randomFieldElement', () => {
    it('should return a value less than FIELD_SIZE', () => {
      const value = randomFieldElement();
      expect(value).toBeGreaterThanOrEqual(0n);
      expect(value).toBeLessThan(FIELD_SIZE);
    });

    it('should return different values on successive calls', () => {
      const a = randomFieldElement();
      const b = randomFieldElement();
      expect(a).not.toBe(b);
    });

    it('should return valid field elements', () => {
      for (let i = 0; i < 10; i++) {
        const value = randomFieldElement();
        expect(value).toBeGreaterThanOrEqual(0n);
        expect(value).toBeLessThan(FIELD_SIZE);
      }
    });
  });

  describe('randomHex', () => {
    it('should return a hex string of correct length', () => {
      const hex = randomHex(16);
      expect(hex).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });

    it('should handle different byte lengths', () => {
      expect(randomHex(1)).toHaveLength(2);
      expect(randomHex(32)).toHaveLength(64);
    });

    it('should return different values on successive calls', () => {
      const a = randomHex(32);
      const b = randomHex(32);
      expect(a).not.toBe(b);
    });
  });

  describe('sha256', () => {
    it('should produce a 64-character hex hash', () => {
      const hash = sha256('deadbeef');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should produce deterministic output', () => {
      const input = 'cafebabe';
      expect(sha256(input)).toBe(sha256(input));
    });

    it('should produce different hashes for different inputs', () => {
      expect(sha256('aa')).not.toBe(sha256('bb'));
    });

    it('should match known SHA-256 hash', () => {
      // SHA-256 of empty string (as hex)
      const hash = sha256('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('pedersenHash', () => {
    it('should return a field element', async () => {
      const hash = await pedersenHash(1n, 2n);
      expect(hash).toBeGreaterThanOrEqual(0n);
      expect(hash).toBeLessThan(FIELD_SIZE);
    });

    it('should be deterministic', async () => {
      const a = await pedersenHash(11n, 22n);
      const b = await pedersenHash(11n, 22n);
      expect(a).toBe(b);
    });

    it('should produce different output for different orderings', async () => {
      const a = await pedersenHash(11n, 22n);
      const b = await pedersenHash(22n, 11n);
      expect(a).not.toBe(b);
    });

    it('should handle zero inputs', async () => {
      const hash = await pedersenHash(0n, 0n);
      expect(hash).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('computeCommitment', () => {
    it('should compute commitment from nullifier and secret', async () => {
      const nullifier = 12345n;
      const secret = 67890n;
      const commitment = await computeCommitment(nullifier, secret);
      expect(commitment).toBeGreaterThanOrEqual(0n);
      expect(commitment).toBeLessThan(FIELD_SIZE);
    });

    it('should be deterministic', async () => {
      const commitment1 = await computeCommitment(100n, 200n);
      const commitment2 = await computeCommitment(100n, 200n);
      expect(commitment1).toBe(commitment2);
    });
  });

  describe('computeNullifierHash', () => {
    it('should compute nullifier hash bound to root', async () => {
      const nullifier = 12345n;
      const root = 99999n;
      const nullifierHash = await computeNullifierHash(nullifier, root);
      expect(nullifierHash).toBeGreaterThanOrEqual(0n);
      expect(nullifierHash).toBeLessThan(FIELD_SIZE);
    });

    it('should produce different hashes for different roots', async () => {
      const nullifier = 12345n;
      const hash1 = await computeNullifierHash(nullifier, 100n);
      const hash2 = await computeNullifierHash(nullifier, 200n);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateNote', () => {
    it('should generate a valid note structure', async () => {
      const note = await generateNote(100);
      expect(note).toHaveProperty('nullifier');
      expect(note).toHaveProperty('secret');
      expect(note).toHaveProperty('commitment');
      expect(note).toHaveProperty('denomination');
      expect(note.denomination).toBe(100);
    });

    it('should generate 32-byte hex strings', async () => {
      const note = await generateNote(10);
      expect(note.nullifier).toHaveLength(64);
      expect(note.secret).toHaveLength(64);
      expect(note.commitment).toHaveLength(64);
    });

    it('should generate unique notes', async () => {
      const note1 = await generateNote(100);
      const note2 = await generateNote(100);
      expect(note1.nullifier).not.toBe(note2.nullifier);
      expect(note1.secret).not.toBe(note2.secret);
      expect(note1.commitment).not.toBe(note2.commitment);
    });

    it('should produce consistent commitment', async () => {
      const note = await generateNote(100);
      const expectedCommitment = await computeCommitment(
        BigInt('0x' + note.nullifier),
        BigInt('0x' + note.secret)
      );
      expect(note.commitment).toBe(expectedCommitment.toString(16).padStart(64, '0'));
    });
  });
});
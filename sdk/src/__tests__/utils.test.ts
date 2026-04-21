import {
  randomFieldElement,
  randomHex,
  poseidonHash,
  hashPair,
  computeCommitment,
  computeNullifierHash,
  isValidFieldElement,
  bigIntToHex,
  hexToBigInt,
} from '../utils/crypto';
import { FIELD_SIZE } from '../constants';

describe('crypto utils', () => {
  describe('randomFieldElement', () => {
    it('should generate a random field element', () => {
      const element = randomFieldElement();
      expect(element).toBeGreaterThanOrEqual(BigInt(0));
      expect(element).toBeLessThan(FIELD_SIZE);
    });

    it('should generate different values', () => {
      const element1 = randomFieldElement();
      const element2 = randomFieldElement();
      expect(element1).not.toBe(element2);
    });
  });

  describe('randomHex', () => {
    it('should generate hex string of correct length', () => {
      const hex = randomHex(32);
      expect(hex).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });

    it('should generate different values', () => {
      const hex1 = randomHex(16);
      const hex2 = randomHex(16);
      expect(hex1).not.toBe(hex2);
    });
  });

  describe('poseidonHash', () => {
    it('should hash values consistently', () => {
      const inputs = [BigInt(123), BigInt(456)];
      const hash1 = poseidonHash(inputs);
      const hash2 = poseidonHash(inputs);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = poseidonHash([BigInt(123)]);
      const hash2 = poseidonHash([BigInt(456)]);
      expect(hash1).not.toBe(hash2);
    });

    it('should return value within field size', () => {
      const hash = poseidonHash([BigInt(123), BigInt(456)]);
      expect(hash).toBeGreaterThanOrEqual(BigInt(0));
      expect(hash).toBeLessThan(FIELD_SIZE);
    });
  });

  describe('hashPair', () => {
    it('should hash two values', () => {
      const left = BigInt(123);
      const right = BigInt(456);
      const hash = hashPair(left, right);
      expect(hash).toBeGreaterThanOrEqual(BigInt(0));
      expect(hash).toBeLessThan(FIELD_SIZE);
    });

    it('should be deterministic', () => {
      const left = BigInt(123);
      const right = BigInt(456);
      const hash1 = hashPair(left, right);
      const hash2 = hashPair(left, right);
      expect(hash1).toBe(hash2);
    });
  });

  describe('computeCommitment', () => {
    it('should compute commitment from nullifier and secret', () => {
      const nullifier = BigInt(123);
      const secret = BigInt(456);
      const commitment = computeCommitment(nullifier, secret);
      expect(commitment).toBeGreaterThanOrEqual(BigInt(0));
      expect(commitment).toBeLessThan(FIELD_SIZE);
    });

    it('should be deterministic', () => {
      const nullifier = BigInt(123);
      const secret = BigInt(456);
      const commitment1 = computeCommitment(nullifier, secret);
      const commitment2 = computeCommitment(nullifier, secret);
      expect(commitment1).toBe(commitment2);
    });
  });

  describe('computeNullifierHash', () => {
    it('should compute nullifier hash', () => {
      const nullifier = BigInt(123);
      const hash = computeNullifierHash(nullifier);
      expect(hash).toBeGreaterThanOrEqual(BigInt(0));
      expect(hash).toBeLessThan(FIELD_SIZE);
    });

    it('should be deterministic', () => {
      const nullifier = BigInt(123);
      const hash1 = computeNullifierHash(nullifier);
      const hash2 = computeNullifierHash(nullifier);
      expect(hash1).toBe(hash2);
    });
  });

  describe('isValidFieldElement', () => {
    it('should validate field elements', () => {
      expect(isValidFieldElement(BigInt(0))).toBe(true);
      expect(isValidFieldElement(BigInt(123))).toBe(true);
      expect(isValidFieldElement(FIELD_SIZE - BigInt(1))).toBe(true);
    });

    it('should reject invalid field elements', () => {
      expect(isValidFieldElement(BigInt(-1))).toBe(false);
      expect(isValidFieldElement(FIELD_SIZE)).toBe(false);
      expect(isValidFieldElement(FIELD_SIZE + BigInt(1))).toBe(false);
    });
  });

  describe('bigIntToHex', () => {
    it('should convert BigInt to hex', () => {
      const value = BigInt(255);
      const hex = bigIntToHex(value, 1);
      expect(hex).toBe('ff');
    });

    it('should pad to correct length', () => {
      const value = BigInt(255);
      const hex = bigIntToHex(value, 4);
      expect(hex).toBe('000000ff');
    });
  });

  describe('hexToBigInt', () => {
    it('should convert hex to BigInt', () => {
      const hex = 'ff';
      const value = hexToBigInt(hex);
      expect(value).toBe(BigInt(255));
    });

    it('should handle 0x prefix', () => {
      const hex = '0xff';
      const value = hexToBigInt(hex);
      expect(value).toBe(BigInt(255));
    });

    it('should round-trip with bigIntToHex', () => {
      const original = BigInt(12345);
      const hex = bigIntToHex(original);
      const restored = hexToBigInt(hex);
      expect(restored).toBe(original);
    });
  });
});

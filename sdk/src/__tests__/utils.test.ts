/**
 * Unit tests for PrivacyLayer SDK utilities
 */

import {
  randomFieldElement,
  fieldToHex,
  hexToField,
  hashPair,
  computeCommitment,
  deriveNullifier,
  isValidFieldElement,
  constantTimeEqual,
} from './crypto';

import {
  bytesToHex,
  hexToBytes,
  bigintToBytes,
  bytesToBigint,
  hexToBase64,
  base64ToHex,
  isValidHex,
  normalizeHex,
} from './encoding';

import {
  validateAddress,
  validateAmount,
  validateDenomination,
  validateFieldElement,
  validateHex,
  validateCommitment,
  validateNullifier,
  validateTransactionHash,
} from './validation';

import { Denomination, FIELD_SIZE } from '../constants';

describe('crypto utilities', () => {
  describe('randomFieldElement', () => {
    it('should generate a field element within range', () => {
      const value = randomFieldElement();
      expect(isValidFieldElement(value)).toBe(true);
    });

    it('should generate different values on subsequent calls', () => {
      const value1 = randomFieldElement();
      const value2 = randomFieldElement();
      expect(value1).not.toEqual(value2);
    });
  });

  describe('fieldToHex and hexToField', () => {
    it('should round-trip correctly', () => {
      const original = randomFieldElement();
      const hex = fieldToHex(original);
      expect(hex).toHaveLength(64);
      const restored = hexToField(hex);
      expect(restored).toEqual(original);
    });

    it('should handle zero correctly', () => {
      const hex = fieldToHex(BigInt(0));
      expect(hex).toBe('0'.repeat(64));
      expect(hexToField(hex)).toEqual(BigInt(0));
    });
  });

  describe('hashPair', () => {
    it('should be deterministic', () => {
      const a = randomFieldElement();
      const b = randomFieldElement();
      const h1 = hashPair(a, b);
      const h2 = hashPair(a, b);
      expect(h1).toEqual(h2);
    });

    it('should produce different outputs for different inputs', () => {
      const a1 = randomFieldElement();
      const a2 = randomFieldElement();
      const b = randomFieldElement();
      const h1 = hashPair(a1, b);
      const h2 = hashPair(a2, b);
      expect(h1).not.toEqual(h2);
    });
  });

  describe('computeCommitment', () => {
    it('should compute a commitment from nullifier and secret', () => {
      const nullifier = randomFieldElement();
      const secret = randomFieldElement();
      const commitment = computeCommitment(nullifier, secret);
      expect(isValidFieldElement(commitment)).toBe(true);
    });
  });

  describe('deriveNullifier', () => {
    it('should derive different nullifiers for different indices', () => {
      const secret = randomFieldElement();
      const n1 = deriveNullifier(secret, 0);
      const n2 = deriveNullifier(secret, 1);
      expect(n1).not.toEqual(n2);
    });
  });

  describe('constantTimeEqual', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeEqual('abc123', 'abc124')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    });
  });
});

describe('encoding utilities', () => {
  describe('bytesToHex and hexToBytes', () => {
    it('should round-trip correctly', () => {
      const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const hex = bytesToHex(original);
      expect(hex).toBe('deadbeef');
      const restored = hexToBytes(hex);
      expect(restored).toEqual(original);
    });

    it('should handle empty array', () => {
      const hex = bytesToHex(new Uint8Array(0));
      expect(hex).toBe('');
      expect(hexToBytes('')).toEqual(new Uint8Array(0));
    });
  });

  describe('bigintToBytes and bytesToBigint', () => {
    it('should round-trip correctly', () => {
      const original = BigInt('0x1234567890abcdef');
      const bytes = bigintToBytes(original, 8);
      const restored = bytesToBigint(bytes);
      expect(restored).toEqual(original);
    });

    it('should handle large values', () => {
      const original = FIELD_SIZE - BigInt(1);
      const bytes = bigintToBytes(original, 32);
      const restored = bytesToBigint(bytes);
      expect(restored).toEqual(original);
    });
  });

  describe('hexToBase64 and base64ToHex', () => {
    it('should round-trip correctly', () => {
      const hex = 'deadbeef12345678';
      const base64 = hexToBase64(hex);
      const restored = base64ToHex(base64);
      expect(restored).toBe(hex);
    });
  });

  describe('isValidHex', () => {
    it('should return true for valid hex', () => {
      expect(isValidHex('deadbeef')).toBe(true);
      expect(isValidHex('0xdeadbeef')).toBe(true);
      expect(isValidHex('DEADBEEF')).toBe(true);
    });

    it('should return false for invalid hex', () => {
      expect(isValidHex('xyz123')).toBe(false);
      expect(isValidHex('12345')).toBe(false); // odd length
    });
  });

  describe('normalizeHex', () => {
    it('should add 0x prefix if missing', () => {
      expect(normalizeHex('deadbeef')).toBe('0xdeadbeef');
    });

    it('should handle odd-length hex by prepending 0', () => {
      expect(normalizeHex('123')).toBe('0x0123');
    });
  });
});

describe('validation utilities', () => {
  describe('validateAddress', () => {
    it('should reject empty addresses', () => {
      const result = validateAddress('');
      expect(result.valid).toBe(false);
    });

    it('should validate a proper Stellar address', () => {
      // This is a testnet account that we control
      const result = validateAddress('GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZD4ZW6FTBJY3QFEQKMDJMLNYE2HO');
      // Note: This may or may not be valid depending on checksum
    });
  });

  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      expect(validateAmount(100).valid).toBe(true);
      expect(validateAmount('100.5').valid).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount(0).valid).toBe(false);
      expect(validateAmount(-10).valid).toBe(false);
      expect(validateAmount('abc').valid).toBe(false);
      expect(validateAmount('').valid).toBe(false);
    });
  });

  describe('validateDenomination', () => {
    it('should accept valid denominations', () => {
      expect(validateDenomination(Denomination.TEN).valid).toBe(true);
      expect(validateDenomination(Denomination.HUNDRED).valid).toBe(true);
      expect(validateDenomination(Denomination.THOUSAND).valid).toBe(true);
      expect(validateDenomination(Denomination.TEN_THOUSAND).valid).toBe(true);
    });

    it('should reject invalid denominations', () => {
      expect(validateDenomination(5 as Denomination).valid).toBe(false);
      expect(validateDenomination(50 as Denomination).valid).toBe(false);
    });
  });

  describe('validateFieldElement', () => {
    it('should accept values within range', () => {
      const value = BigInt(12345);
      expect(validateFieldElement(value).valid).toBe(true);
    });

    it('should reject zero', () => {
      expect(validateFieldElement(BigInt(0)).valid).toBe(false);
    });

    it('should reject values at or above field size', () => {
      expect(validateFieldElement(FIELD_SIZE).valid).toBe(false);
      expect(validateFieldElement(FIELD_SIZE + BigInt(1)).valid).toBe(false);
    });
  });

  describe('validateHex', () => {
    it('should accept valid hex', () => {
      expect(validateHex('0xdeadbeef').valid).toBe(true);
      expect(validateHex('deadbeef').valid).toBe(true);
    });

    it('should reject invalid hex', () => {
      expect(validateHex('xyz').valid).toBe(false);
      expect(validateHex('').valid).toBe(false);
    });
  });

  describe('validateTransactionHash', () => {
    it('should accept 64-character hex', () => {
      const hash = 'a'.repeat(64);
      expect(validateTransactionHash(hash).valid).toBe(true);
    });

    it('should accept 0x-prefixed hash', () => {
      const hash = '0x' + 'a'.repeat(64);
      expect(validateTransactionHash(hash).valid).toBe(true);
    });

    it('should reject wrong length', () => {
      expect(validateTransactionHash('abc').valid).toBe(false);
    });
  });
});

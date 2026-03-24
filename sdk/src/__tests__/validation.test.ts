/**
 * Unit tests for validation utilities.
 */

import {
  isValidStellarAddress,
  isValidHex,
  isFieldElement,
  isValidFieldElementHex,
  isValidDenomination,
  isValidAmount,
  isValidNote,
  isValidMerkleProof,
  isValidContractId,
  assert,
  validateWithdrawParams,
} from '../utils/validation';
import { FIELD_SIZE, MERKLE_TREE_DEPTH } from '../constants';
import { Denomination } from '../types';

describe('Validation Utilities', () => {
  describe('isValidStellarAddress', () => {
    it('should accept valid G-prefixed addresses', () => {
      const addr = 'G' + 'A'.repeat(55);
      expect(isValidStellarAddress(addr)).toBe(true);
    });

    it('should accept valid M-prefixed (muxed) addresses', () => {
      const addr = 'M' + 'A'.repeat(55);
      expect(isValidStellarAddress(addr)).toBe(true);
    });

    it('should reject addresses with wrong prefix', () => {
      expect(isValidStellarAddress('X' + 'A'.repeat(55))).toBe(false);
    });

    it('should reject addresses with wrong length', () => {
      expect(isValidStellarAddress('GAAAA')).toBe(false);
    });

    it('should reject addresses with invalid characters', () => {
      const addr = 'G' + 'a'.repeat(55); // lowercase not valid
      expect(isValidStellarAddress(addr)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidStellarAddress('')).toBe(false);
    });

    it('should reject addresses with numbers in wrong position', () => {
      // Stellar uses base32: A-Z and 2-7
      const addr = 'G' + '1'.repeat(55); // 1 is not valid
      expect(isValidStellarAddress(addr)).toBe(false);
    });
  });

  describe('isValidHex', () => {
    it('should accept valid hex strings', () => {
      expect(isValidHex('deadbeef')).toBe(true);
      expect(isValidHex('0xDEAD')).toBe(true);
    });

    it('should reject non-hex characters', () => {
      expect(isValidHex('xyz')).toBe(false);
    });

    it('should validate expected length', () => {
      expect(isValidHex('aabb', 2)).toBe(true);
      expect(isValidHex('aabb', 3)).toBe(false);
    });

    it('should accept empty string as valid hex', () => {
      expect(isValidHex('')).toBe(true);
    });

    it('should handle mixed case', () => {
      expect(isValidHex('DeadBeef')).toBe(true);
    });
  });

  describe('isFieldElement', () => {
    it('should accept values less than FIELD_SIZE', () => {
      expect(isFieldElement(0n)).toBe(true);
      expect(isFieldElement(100n)).toBe(true);
      expect(isFieldElement(FIELD_SIZE - 1n)).toBe(true);
    });

    it('should reject FIELD_SIZE and above', () => {
      expect(isFieldElement(FIELD_SIZE)).toBe(false);
      expect(isFieldElement(FIELD_SIZE + 1n)).toBe(false);
    });

    it('should reject negative values', () => {
      expect(isFieldElement(-1n)).toBe(false);
    });
  });

  describe('isValidFieldElementHex', () => {
    it('should accept valid field element hex', () => {
      expect(isValidFieldElementHex('0000000000000000000000000000000000000000000000000000000000000001')).toBe(true);
    });

    it('should reject invalid hex', () => {
      expect(isValidFieldElementHex('xyz')).toBe(false);
    });
  });

  describe('isValidDenomination', () => {
    it('should accept valid denomination values', () => {
      expect(isValidDenomination(Denomination.TEN)).toBe(true);
      expect(isValidDenomination(Denomination.HUNDRED)).toBe(true);
      expect(isValidDenomination(Denomination.THOUSAND)).toBe(true);
      expect(isValidDenomination(Denomination.TEN_THOUSAND)).toBe(true);
    });

    it('should reject invalid denomination values', () => {
      expect(isValidDenomination(5)).toBe(false);
      expect(isValidDenomination(50)).toBe(false);
      expect(isValidDenomination(0)).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should accept positive amounts', () => {
      expect(isValidAmount(1)).toBe(true);
      expect(isValidAmount(1000000n)).toBe(true);
    });

    it('should reject zero and negative amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-1)).toBe(false);
      expect(isValidAmount(0n)).toBe(false);
    });

    it('should reject excessively large amounts', () => {
      expect(isValidAmount(BigInt('9999999999999999'))).toBe(false);
    });

    it('should respect custom max amount', () => {
      expect(isValidAmount(100, 50n)).toBe(false);
      expect(isValidAmount(50, 100n)).toBe(true);
    });
  });

  describe('isValidNote', () => {
    const validNote = {
      nullifier: '0'.repeat(64),
      secret: '0'.repeat(64),
      commitment: '0'.repeat(64),
      denomination: Denomination.HUNDRED,
    };

    it('should accept valid note', () => {
      expect(isValidNote(validNote)).toBe(true);
    });

    it('should reject note with missing fields', () => {
      expect(isValidNote({ ...validNote, nullifier: undefined })).toBe(false);
      expect(isValidNote({ ...validNote, secret: undefined })).toBe(false);
      expect(isValidNote({ ...validNote, commitment: undefined })).toBe(false);
    });

    it('should reject note with invalid hex length', () => {
      expect(isValidNote({ ...validNote, nullifier: 'ff' })).toBe(false);
    });

    it('should reject note with invalid denomination', () => {
      expect(isValidNote({ ...validNote, denomination: 12345 })).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidNote(null)).toBe(false);
      expect(isValidNote(undefined)).toBe(false);
    });
  });

  describe('isValidMerkleProof', () => {
    const validProof = {
      root: '0'.repeat(64),
      leaf: '0'.repeat(64),
      pathElements: Array(MERKLE_TREE_DEPTH).fill('0'.repeat(64)),
      pathIndices: Array(MERKLE_TREE_DEPTH).fill(0),
    };

    it('should accept valid merkle proof', () => {
      expect(isValidMerkleProof(validProof)).toBe(true);
    });

    it('should reject proof with wrong path length', () => {
      expect(
        isValidMerkleProof({
          ...validProof,
          pathElements: ['0'.repeat(64)],
        })
      ).toBe(false);
    });

    it('should reject proof with invalid indices', () => {
      expect(
        isValidMerkleProof({
          ...validProof,
          pathIndices: Array(MERKLE_TREE_DEPTH).fill(2),
        })
      ).toBe(false);
    });

    it('should reject proof with missing fields', () => {
      expect(isValidMerkleProof({ ...validProof, root: undefined })).toBe(false);
    });
  });

  describe('isValidContractId', () => {
    it('should accept valid 32-byte hex', () => {
      expect(isValidContractId('0'.repeat(64))).toBe(true);
    });

    it('should reject wrong length', () => {
      expect(isValidContractId('deadbeef')).toBe(false);
    });

    it('should reject invalid hex', () => {
      expect(isValidContractId('x'.repeat(64))).toBe(false);
    });
  });

  describe('assert', () => {
    it('should not throw for true condition', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
    });

    it('should throw for false condition', () => {
      expect(() => assert(false, 'Should throw')).toThrow('Should throw');
    });
  });

  describe('validateWithdrawParams', () => {
    const validNote = {
      nullifier: '0'.repeat(64),
      secret: '0'.repeat(64),
      commitment: '0'.repeat(64),
      denomination: Denomination.HUNDRED,
    };

    const validProof = {
      root: '0'.repeat(64),
      leaf: '0'.repeat(64),
      pathElements: Array(MERKLE_TREE_DEPTH).fill('0'.repeat(64)),
      pathIndices: Array(MERKLE_TREE_DEPTH).fill(0),
    };

    it('should accept valid params', () => {
      expect(() =>
        validateWithdrawParams({
          note: validNote,
          merkleProof: validProof,
          recipient: 'G' + 'A'.repeat(55),
        })
      ).not.toThrow();
    });

    it('should reject invalid recipient', () => {
      expect(() =>
        validateWithdrawParams({
          note: validNote,
          merkleProof: validProof,
          recipient: 'invalid',
        })
      ).toThrow();
    });

    it('should reject mismatched commitment', () => {
      expect(() =>
        validateWithdrawParams({
          note: validNote,
          merkleProof: { ...validProof, leaf: '1'.repeat(64) },
          recipient: 'G' + 'A'.repeat(55),
        })
      ).toThrow('Merkle proof leaf does not match note commitment');
    });
  });
});
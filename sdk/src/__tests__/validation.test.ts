import {
  isValidAddress,
  isValidAmount,
  isValidFieldElement,
  isValidHex,
  isValidCommitment,
  isValidNullifier,
  isValidSecret,
  isValidDenomination,
  isValidNote,
  isValidTransactionHash,
  isValidLeafIndex,
  isValidNetworkConfig,
  assert,
  sanitizeInput,
} from '../utils/validation';
import { Denomination } from '../types';
import { FIELD_SIZE, MAX_LEAVES } from '../constants';

describe('validation utils', () => {
  describe('isValidAddress', () => {
    it('should validate Stellar addresses', () => {
      const validAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(isValidAddress(validAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidAddress('invalid')).toBe(false);
      expect(isValidAddress('ABRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H')).toBe(false);
      expect(isValidAddress('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2')).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should validate valid amounts', () => {
      expect(isValidAmount(Denomination.TEN)).toBe(true);
      expect(isValidAmount(Denomination.HUNDRED)).toBe(true);
      expect(isValidAmount(Denomination.THOUSAND)).toBe(true);
      expect(isValidAmount(Denomination.TEN_THOUSAND)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-10)).toBe(false);
      expect(isValidAmount(5)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
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

  describe('isValidHex', () => {
    it('should validate hex strings', () => {
      expect(isValidHex('deadbeef')).toBe(true);
      expect(isValidHex('0xdeadbeef')).toBe(true);
      expect(isValidHex('DEADBEEF')).toBe(true);
    });

    it('should validate hex with length', () => {
      expect(isValidHex('deadbeef', 4)).toBe(true);
      expect(isValidHex('deadbeef', 8)).toBe(false);
    });

    it('should reject invalid hex', () => {
      expect(isValidHex('xyz')).toBe(false);
      expect(isValidHex('dead beef')).toBe(false);
    });
  });

  describe('isValidCommitment', () => {
    it('should validate commitments', () => {
      const validCommitment = 'a'.repeat(64);
      expect(isValidCommitment(validCommitment)).toBe(true);
    });

    it('should reject invalid commitments', () => {
      expect(isValidCommitment('short')).toBe(false);
      expect(isValidCommitment('xyz' + 'a'.repeat(61))).toBe(false);
    });
  });

  describe('isValidNullifier', () => {
    it('should validate nullifiers', () => {
      const validNullifier = 'b'.repeat(64);
      expect(isValidNullifier(validNullifier)).toBe(true);
    });

    it('should reject invalid nullifiers', () => {
      expect(isValidNullifier('short')).toBe(false);
    });
  });

  describe('isValidSecret', () => {
    it('should validate secrets', () => {
      const validSecret = 'c'.repeat(64);
      expect(isValidSecret(validSecret)).toBe(true);
    });

    it('should reject invalid secrets', () => {
      expect(isValidSecret('short')).toBe(false);
    });
  });

  describe('isValidDenomination', () => {
    it('should validate denominations', () => {
      expect(isValidDenomination(Denomination.TEN)).toBe(true);
      expect(isValidDenomination(Denomination.HUNDRED)).toBe(true);
    });

    it('should reject invalid denominations', () => {
      expect(isValidDenomination(5)).toBe(false);
      expect(isValidDenomination(999)).toBe(false);
    });
  });

  describe('isValidNote', () => {
    it('should validate note objects', () => {
      const validNote = {
        nullifier: 'a'.repeat(64),
        secret: 'b'.repeat(64),
        commitment: 'c'.repeat(64),
        denomination: Denomination.TEN,
      };
      expect(isValidNote(validNote)).toBe(true);
    });

    it('should reject invalid notes', () => {
      expect(isValidNote(null)).toBe(false);
      expect(isValidNote({})).toBe(false);
      expect(isValidNote({ nullifier: 'short' })).toBe(false);
    });
  });

  describe('isValidTransactionHash', () => {
    it('should validate transaction hashes', () => {
      const validHash = 'd'.repeat(64);
      expect(isValidTransactionHash(validHash)).toBe(true);
    });

    it('should reject invalid hashes', () => {
      expect(isValidTransactionHash('short')).toBe(false);
    });
  });

  describe('isValidLeafIndex', () => {
    it('should validate leaf indices', () => {
      expect(isValidLeafIndex(0, MAX_LEAVES)).toBe(true);
      expect(isValidLeafIndex(100, MAX_LEAVES)).toBe(true);
      expect(isValidLeafIndex(MAX_LEAVES - 1, MAX_LEAVES)).toBe(true);
    });

    it('should reject invalid indices', () => {
      expect(isValidLeafIndex(-1, MAX_LEAVES)).toBe(false);
      expect(isValidLeafIndex(MAX_LEAVES, MAX_LEAVES)).toBe(false);
      expect(isValidLeafIndex(1.5, MAX_LEAVES)).toBe(false);
    });
  });

  describe('isValidNetworkConfig', () => {
    it('should validate network config', () => {
      const validConfig = {
        rpcUrl: 'https://soroban-testnet.stellar.org',
        networkPassphrase: 'Test SDF Network ; September 2015',
        contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      };
      expect(isValidNetworkConfig(validConfig)).toBe(true);
    });

    it('should reject invalid configs', () => {
      expect(isValidNetworkConfig(null)).toBe(false);
      expect(isValidNetworkConfig({})).toBe(false);
      expect(isValidNetworkConfig({ rpcUrl: 'invalid' })).toBe(false);
    });
  });

  describe('assert', () => {
    it('should not throw for true conditions', () => {
      expect(() => assert(true, 'error')).not.toThrow();
    });

    it('should throw for false conditions', () => {
      expect(() => assert(false, 'error message')).toThrow('error message');
    });
  });

  describe('sanitizeInput', () => {
    it('should return value if type matches', () => {
      expect(sanitizeInput('hello', 'string')).toBe('hello');
      expect(sanitizeInput(123, 'number')).toBe(123);
    });

    it('should throw if type does not match', () => {
      expect(() => sanitizeInput(123, 'string')).toThrow();
      expect(() => sanitizeInput('hello', 'number')).toThrow();
    });
  });
});

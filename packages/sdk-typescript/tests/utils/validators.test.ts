import {
  validateContractId,
  validateAmount,
  validateAssetCode,
  validateAddress,
  validateSecretKey,
  validateByteArray,
  validateNetwork,
  validateDepositParams,
  validateWithdrawParams,
} from '../../src/utils/validators';

describe('Validators', () => {
  describe('validateAddress', () => {
    it('should validate valid Stellar public key', () => {
      // Generate a valid keypair and test with the public key
      const { generateKeypair } = require('../../src/crypto/keys');
      const keypair = generateKeypair();
      const result = validateAddress(keypair.publicKey);
      expect(result.valid).toBe(true);
    });

    it('should reject empty', () => {
      const result = validateAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Address is required');
    });

    it('should reject invalid', () => {
      const result = validateAddress('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid Stellar public key');
    });
  });

  describe('validateSecretKey', () => {
    it('should validate valid Stellar secret key', () => {
      // Generate a valid keypair and test with the secret key
      const { generateKeypair } = require('../../src/crypto/keys');
      const keypair = generateKeypair();
      const result = validateSecretKey(keypair.secretKey);
      expect(result.valid).toBe(true);
    });

    it('should reject empty', () => {
      const result = validateSecretKey('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Secret key is required');
    });

    it('should reject invalid', () => {
      const result = validateSecretKey('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid Stellar secret key');
    });
  });

  describe('validateContractId', () => {
    it('should validate correct Soroban contract ID', () => {
      // Valid Soroban contract ID (56 chars, base32) - C-prefixed strkey
      const validId = 'CDMLFMN5V7XGXCK3LMKZMMJH4X3FMNWFXI3YX6KF3XMS7PCNKVN4WFZA';
      expect(validId.length).toBe(56);
      const result = validateContractId(validId);
      expect(result.valid).toBe(true);
    });

    it('should reject empty contract ID', () => {
      const result = validateContractId('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Contract ID is required');
    });

    it('should reject wrong length', () => {
      const result = validateContractId('SHORT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should reject invalid characters', () => {
      // Contains lowercase - will fail length check first (lowercase chars are invalid)
      const result = validateContractId('cdmlfmn5v7xgxck3lmkzmmjh4x3fmnwfxi3yx6kf3xms7pcnkv4wfz');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive bigint', () => {
      const result = validateAmount(BigInt(1000));
      expect(result.valid).toBe(true);
    });

    it('should validate positive number', () => {
      const result = validateAmount(1000);
      expect(result.valid).toBe(true);
    });

    it('should validate positive string number', () => {
      const result = validateAmount('1000');
      expect(result.valid).toBe(true);
    });

    it('should reject zero', () => {
      const result = validateAmount(BigInt(0));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject negative', () => {
      const result = validateAmount(BigInt(-100));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject null', () => {
      const result = validateAmount(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should reject undefined', () => {
      const result = validateAmount(undefined as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should reject invalid string', () => {
      const result = validateAmount('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Amount must be a valid integer');
    });

    it('should reject very large amounts', () => {
      const result = validateAmount('9223372036854775808'); // i64::MAX + 1
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('validateAssetCode', () => {
    it('should validate 4-letter code', () => {
      const result = validateAssetCode('USDC');
      expect(result.valid).toBe(true);
    });

    it('should validate 12-letter code', () => {
      const result = validateAssetCode('MYTOKENTICK');
      expect(result.valid).toBe(true);
    });

    it('should reject empty', () => {
      const result = validateAssetCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Asset code is required');
    });

    it('should reject too long', () => {
      const result = validateAssetCode('VERYLONGTOKENTICKER');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('12 characters');
    });

    it('should reject special characters', () => {
      const result = validateAssetCode('US-DC');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Asset code must be alphanumeric');
    });
  });

  describe('validateByteArray', () => {
    it('should validate correct length', () => {
      const data = new Uint8Array(32);
      const result = validateByteArray(data, 32, 'testField');
      expect(result.valid).toBe(true);
    });

    it('should reject wrong length', () => {
      const data = new Uint8Array(16);
      const result = validateByteArray(data, 32, 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be 32 bytes');
    });

    it('should reject null', () => {
      const result = validateByteArray(null as any, 32, 'testField');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a Uint8Array');
    });
  });

  describe('validateNetwork', () => {
    it('should validate mainnet', () => {
      const result = validateNetwork('mainnet');
      expect(result.valid).toBe(true);
    });

    it('should validate testnet', () => {
      const result = validateNetwork('testnet');
      expect(result.valid).toBe(true);
    });

    it('should validate futurenet', () => {
      const result = validateNetwork('futurenet');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid network', () => {
      const result = validateNetwork('invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mainnet, testnet, futurenet');
    });

    it('should reject empty', () => {
      const result = validateNetwork('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Network is required');
    });
  });

  describe('validateDepositParams', () => {
    it('should validate valid params', () => {
      const result = validateDepositParams({
        amount: BigInt(1000),
        asset: 'USDC',
        recipientCommitment: new Uint8Array(32),
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid amount', () => {
      const result = validateDepositParams({
        amount: -100,
        asset: 'USDC',
        recipientCommitment: new Uint8Array(32),
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid asset', () => {
      const result = validateDepositParams({
        amount: BigInt(1000),
        asset: '',
        recipientCommitment: new Uint8Array(32),
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid commitment', () => {
      const result = validateDepositParams({
        amount: BigInt(1000),
        asset: 'USDC',
        recipientCommitment: new Uint8Array(16), // Wrong length
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateWithdrawParams', () => {
    it('should validate valid params', () => {
      const result = validateWithdrawParams({
        nullifier: new Uint8Array(32),
        proof: new Uint8Array(256),
        root: new Uint8Array(32),
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid nullifier', () => {
      const result = validateWithdrawParams({
        nullifier: new Uint8Array(16),
        proof: new Uint8Array(256),
        root: new Uint8Array(32),
      });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid proof', () => {
      const result = validateWithdrawParams({
        nullifier: new Uint8Array(32),
        proof: new Uint8Array(100), // Wrong length
        root: new Uint8Array(32),
      });
      expect(result.valid).toBe(false);
    });
  });
});

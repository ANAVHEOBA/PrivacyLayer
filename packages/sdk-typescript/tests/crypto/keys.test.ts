import {
  generateKeypair,
  derivePublicKey,
  isValidPublicKey,
  isValidSecretKey,
  randomBytes,
  generateCommitment,
  generateNullifier,
} from '../../src/crypto/keys';

describe('Key Management', () => {
  describe('generateKeypair', () => {
    it('should generate valid keypair', () => {
      const keypair = generateKeypair();
      expect(keypair.publicKey).toBeDefined();
      expect(keypair.secretKey).toBeDefined();
      expect(keypair.publicKey.length).toBe(56); // Stellar public key length
      expect(keypair.secretKey.startsWith('S')).toBe(true);
    });

    it('should generate unique keypairs', () => {
      const keypair1 = generateKeypair();
      const keypair2 = generateKeypair();
      expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
      expect(keypair1.secretKey).not.toBe(keypair2.secretKey);
    });
  });

  describe('derivePublicKey', () => {
    it('should derive public key from secret key', () => {
      const keypair = generateKeypair();
      const derivedPublicKey = derivePublicKey(keypair.secretKey);
      expect(derivedPublicKey).toBe(keypair.publicKey);
    });
  });

  describe('isValidPublicKey', () => {
    it('should return true for valid public key', () => {
      const keypair = generateKeypair();
      expect(isValidPublicKey(keypair.publicKey)).toBe(true);
    });

    it('should return false for invalid public key', () => {
      expect(isValidPublicKey('invalid')).toBe(false);
      expect(isValidPublicKey('')).toBe(false);
      expect(isValidPublicKey('G' + 'A'.repeat(55))).toBe(false);
    });
  });

  describe('isValidSecretKey', () => {
    it('should return true for valid secret key', () => {
      const keypair = generateKeypair();
      expect(isValidSecretKey(keypair.secretKey)).toBe(true);
    });

    it('should return false for invalid secret key', () => {
      expect(isValidSecretKey('invalid')).toBe(false);
      expect(isValidSecretKey('')).toBe(false);
      expect(isValidSecretKey('S' + 'A'.repeat(55))).toBe(false);
    });
  });

  describe('randomBytes', () => {
    it('should generate 32 bytes by default', () => {
      const bytes = randomBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('should generate specified length', () => {
      const bytes = randomBytes(64);
      expect(bytes.length).toBe(64);
    });

    it('should generate unique values', () => {
      const bytes1 = randomBytes(32);
      const bytes2 = randomBytes(32);
      expect(bytes1).not.toEqual(bytes2);
    });
  });

  describe('generateCommitment', () => {
    it('should generate commitment', () => {
      const amount = BigInt(1000);
      const secret = randomBytes(32);
      const blinding = randomBytes(32);

      const commitment = generateCommitment(amount, secret, blinding);
      expect(commitment).toBeInstanceOf(Uint8Array);
      expect(commitment.length).toBe(32);
    });

    it('should generate deterministic commitments for same inputs', () => {
      const amount = BigInt(1000);
      const secret = new Uint8Array(32).fill(1);
      const blinding = new Uint8Array(32).fill(2);

      const commitment1 = generateCommitment(amount, secret, blinding);
      const commitment2 = generateCommitment(amount, secret, blinding);
      expect(commitment1).toEqual(commitment2);
    });
  });

  describe('generateNullifier', () => {
    it('should generate nullifier', () => {
      const commitment = randomBytes(32);
      const secret = randomBytes(32);

      const nullifier = generateNullifier(commitment, secret);
      expect(nullifier).toBeInstanceOf(Uint8Array);
      expect(nullifier.length).toBe(32);
    });

    it('should generate deterministic nullifiers for same inputs', () => {
      const commitment = new Uint8Array(32).fill(3);
      const secret = new Uint8Array(32).fill(4);

      const nullifier1 = generateNullifier(commitment, secret);
      const nullifier2 = generateNullifier(commitment, secret);
      expect(nullifier1).toEqual(nullifier2);
    });
  });
});

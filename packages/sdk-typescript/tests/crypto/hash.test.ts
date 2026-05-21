import {
  poseidonHash,
  poseidonHash2,
  computeMerkleRoot,
  bytesToField,
  fieldToBytes,
  hashCommitment,
} from '../../src/crypto/hash';

describe('Poseidon Hash', () => {
  describe('poseidonHash', () => {
    it('should hash single input', () => {
      const result = poseidonHash([BigInt(1)]);
      expect(typeof result).toBe('bigint');
      expect(result > BigInt(0)).toBe(true);
    });

    it('should hash two inputs', () => {
      const result = poseidonHash([BigInt(1), BigInt(2)]);
      expect(typeof result).toBe('bigint');
      expect(result > BigInt(0)).toBe(true);
    });

    it('should throw for empty inputs', () => {
      expect(() => poseidonHash([])).toThrow('requires at least one input');
    });

    it('should throw for too many inputs', () => {
      expect(() => poseidonHash([BigInt(1), BigInt(2), BigInt(3)])).toThrow(
        'max 2 inputs'
      );
    });

    it('should produce deterministic output', () => {
      const result1 = poseidonHash([BigInt(1), BigInt(2)]);
      const result2 = poseidonHash([BigInt(1), BigInt(2)]);
      expect(result1).toBe(result2);
    });

    it('should produce different outputs for different inputs', () => {
      const result1 = poseidonHash([BigInt(1)]);
      const result2 = poseidonHash([BigInt(2)]);
      expect(result1).not.toBe(result2);
    });
  });

  describe('poseidonHash2', () => {
    it('should hash two field elements', () => {
      const result = poseidonHash2(BigInt(1), BigInt(2));
      expect(typeof result).toBe('bigint');
    });

    it('should be equivalent to poseidonHash with two inputs', () => {
      const result1 = poseidonHash2(BigInt(5), BigInt(10));
      const result2 = poseidonHash([BigInt(5), BigInt(10)]);
      expect(result1).toBe(result2);
    });
  });

  describe('computeMerkleRoot', () => {
    it('should compute root with single path element', () => {
      const leaf = BigInt(1);
      const pathElements = [BigInt(2)];
      const pathIndices = [0];

      const root = computeMerkleRoot(leaf, pathElements, pathIndices);
      expect(typeof root).toBe('bigint');
      expect(root).not.toBe(leaf);
    });

    it('should compute root with multiple path elements', () => {
      const leaf = BigInt(1);
      const pathElements = [BigInt(2), BigInt(3)];
      const pathIndices = [0, 1];

      const root = computeMerkleRoot(leaf, pathElements, pathIndices);
      expect(typeof root).toBe('bigint');
    });

    it('should handle path index 1 (right side)', () => {
      const leaf = BigInt(1);
      const pathElements = [BigInt(2)];
      const pathIndices = [1];

      const root = computeMerkleRoot(leaf, pathElements, pathIndices);
      expect(typeof root).toBe('bigint');
    });

    it('should return leaf for empty path', () => {
      const leaf = BigInt(42);
      const root = computeMerkleRoot(leaf, [], []);
      expect(root).toBe(leaf);
    });
  });

  describe('bytesToField', () => {
    it('should convert bytes to field element', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const field = bytesToField(bytes);
      expect(typeof field).toBe('bigint');
      expect(field > BigInt(0)).toBe(true);
    });

    it('should convert empty bytes to zero', () => {
      const bytes = new Uint8Array(0);
      const field = bytesToField(bytes);
      expect(field).toBe(BigInt(0));
    });

    it('should convert 32 bytes', () => {
      const bytes = new Uint8Array(32).fill(255);
      const field = bytesToField(bytes);
      expect(typeof field).toBe('bigint');
    });
  });

  describe('fieldToBytes', () => {
    it('should convert field element to bytes', () => {
      const field = BigInt(1);
      const bytes = fieldToBytes(field);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('should pad to 32 bytes', () => {
      const field = BigInt(0);
      const bytes = fieldToBytes(field);
      expect(bytes.length).toBe(32);
      expect(bytes.every((b) => b === 0)).toBe(true);
    });

    it('should be reversible with bytesToField', () => {
      const originalBytes = new Uint8Array(32);
      originalBytes[0] = 1;
      originalBytes[1] = 2;

      const field = bytesToField(originalBytes);
      const convertedBytes = fieldToBytes(field);

      // Note: bytesToField modulates by field modulus, so direct comparison
      // may not match if original bytes > field modulus
      const field2 = bytesToField(convertedBytes);
      expect(field).toBe(field2);
    });
  });

  describe('hashCommitment', () => {
    it('should hash commitment components', () => {
      const amount = BigInt(1000);
      const secret = new Uint8Array(32).fill(1);
      const blinding = new Uint8Array(32).fill(2);

      const hash = hashCommitment(amount, secret, blinding);
      expect(typeof hash).toBe('bigint');
    });

    it('should produce deterministic output', () => {
      const amount = BigInt(1000);
      const secret = new Uint8Array(32).fill(5);
      const blinding = new Uint8Array(32).fill(7);

      const hash1 = hashCommitment(amount, secret, blinding);
      const hash2 = hashCommitment(amount, secret, blinding);
      expect(hash1).toBe(hash2);
    });

    it('should handle large amounts', () => {
      const amount = BigInt('10000000000000000');
      const secret = new Uint8Array(32).fill(1);
      const blinding = new Uint8Array(32).fill(2);

      const hash = hashCommitment(amount, secret, blinding);
      expect(typeof hash).toBe('bigint');
    });
  });
});

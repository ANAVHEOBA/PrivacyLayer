import { createHash, sha256, NodeSha256 } from '../src/hash';

describe('hash module', () => {
  describe('NodeSha256', () => {
    it('computes correct SHA-256 hash', () => {
      const hash = new NodeSha256();
      hash.update(Buffer.from('hello world'));
      const digest = hash.digest();

      // Known SHA-256 hash of "hello world"
      const expected = Buffer.from(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        'hex'
      );

      expect(digest.equals(expected)).toBe(true);
    });

    it('supports chained updates', () => {
      const hash = new NodeSha256();
      hash.update(Buffer.from('hello'));
      hash.update(Buffer.from(' '));
      hash.update(Buffer.from('world'));
      const digest = hash.digest();

      const expected = Buffer.from(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        'hex'
      );

      expect(digest.equals(expected)).toBe(true);
    });
  });

  describe('createHash convenience', () => {
    it('creates a SHA-256 hash instance', () => {
      const hash = createHash('sha256');
      expect(hash).toBeInstanceOf(NodeSha256);
    });

    it('throws for unsupported algorithms', () => {
      // @ts-ignore - intentional bad value
      expect(() => createHash('md5')).toThrow(/Unsupported hash algorithm/);
    });
  });

  describe('sha256 convenience', () => {
    it('hashes data in one call', () => {
      const result = sha256(Buffer.from('hello world'));
      const expected = Buffer.from(
        'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
        'hex'
      );
      expect(result.equals(expected)).toBe(true);
    });
  });
});

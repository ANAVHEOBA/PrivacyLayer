import {
  randomBytes,
  detectEnv,
  getDefaultRandomSource,
  setDefaultRandomSource,
  clearDefaultRandomSource,
  NodeRandomSource,
  WebCryptoRandomSource,
  ThrowingRandomSource,
  RandomSource,
} from '../src/random';

describe('random module', () => {
  beforeEach(() => {
    clearDefaultRandomSource();
  });

  describe('detectEnv', () => {
    it('detects Node.js environment', () => {
      expect(detectEnv()).toBe('node');
    });
  });

  describe('NodeRandomSource', () => {
    it('generates random bytes of correct length', () => {
      const source = new NodeRandomSource();
      const bytes = source.randomBytes(32);
      expect(bytes.length).toBe(32);
      expect(Buffer.isBuffer(bytes)).toBe(true);
    });

    it('generates different bytes each call', () => {
      const source = new NodeRandomSource();
      const b1 = source.randomBytes(32);
      const b2 = source.randomBytes(32);
      expect(b1.equals(b2)).toBe(false);
    });
  });

  describe('randomBytes convenience function', () => {
    it('generates random bytes using the default source', () => {
      const bytes = randomBytes(16);
      expect(bytes.length).toBe(16);
      expect(Buffer.isBuffer(bytes)).toBe(true);
    });
  });

  describe('default source management', () => {
    it('allows overriding the default source', () => {
      const mock: RandomSource = {
        randomBytes: jest.fn(() => Buffer.alloc(32)),
      };

      setDefaultRandomSource(mock);
      const result = randomBytes(32);

      expect(mock.randomBytes).toHaveBeenCalledWith(32);
      expect(result.length).toBe(32);
    });

    it('clears the cached default source', () => {
      const source1 = getDefaultRandomSource();
      clearDefaultRandomSource();
      const source2 = getDefaultRandomSource();
      expect(source1).not.toBe(source2);
    });
  });

  describe('ThrowingRandomSource', () => {
    it('throws with helpful error message', () => {
      const source = new ThrowingRandomSource('unknown');
      expect(() => source.randomBytes(32)).toThrow(/No cryptographically secure random source/);
      expect(() => source.randomBytes(32)).toThrow(/unknown/);
    });
  });

  describe('WebCryptoRandomSource', () => {
    it('can be constructed with mock crypto impl', () => {
      const mockCrypto = {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i % 256;
          }
          return arr;
        },
      };

      const source = new WebCryptoRandomSource(mockCrypto as any);
      const bytes = source.randomBytes(5);

      expect(bytes.length).toBe(5);
      expect(bytes[0]).toBe(0);
      expect(bytes[1]).toBe(1);
      expect(bytes[2]).toBe(2);
    });
  });
});

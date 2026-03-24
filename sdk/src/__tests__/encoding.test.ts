/**
 * Unit tests for encoding utilities.
 */

import {
  hexToBytes,
  bytesToHex,
  toBase64,
  fromBase64,
  bigintToHex,
  hexToBigint,
  arrayToHex,
  hexToArray,
  concatHex,
  hexEquals,
  padHex,
  stripLeadingZeros,
  formatHex,
} from '../utils/encoding';

describe('Encoding Utilities', () => {
  describe('hexToBytes', () => {
    it('should convert hex string to Buffer', () => {
      const bytes = hexToBytes('deadbeef');
      expect(bytes).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle 0x prefix', () => {
      const bytes = hexToBytes('0xdeadbeef');
      expect(bytes).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });

    it('should handle empty string', () => {
      expect(hexToBytes('')).toEqual(Buffer.alloc(0));
    });

    it('should handle uppercase hex', () => {
      const bytes = hexToBytes('DEADBEEF');
      expect(bytes).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });
  });

  describe('bytesToHex', () => {
    it('should convert Buffer to hex string', () => {
      const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      expect(bytesToHex(buf)).toBe('deadbeef');
    });

    it('should add 0x prefix when requested', () => {
      const buf = Buffer.from([0xca, 0xfe]);
      expect(bytesToHex(buf, true)).toBe('0xcafe');
    });

    it('should handle empty buffer', () => {
      expect(bytesToHex(Buffer.alloc(0))).toBe('');
    });
  });

  describe('toBase64 / fromBase64', () => {
    it('should encode and decode strings', () => {
      const original = 'Hello PrivacyLayer!';
      const encoded = toBase64(original);
      expect(fromBase64(encoded)).toBe(original);
    });

    it('should handle empty string', () => {
      expect(fromBase64(toBase64(''))).toBe('');
    });

    it('should handle unicode characters', () => {
      const original = '隐私层 🔒';
      expect(fromBase64(toBase64(original))).toBe(original);
    });

    it('should handle special characters', () => {
      const original = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(fromBase64(toBase64(original))).toBe(original);
    });
  });

  describe('bigintToHex', () => {
    it('should convert bigint to hex', () => {
      expect(bigintToHex(255n)).toBe('00000000000000000000000000000000000000000000000000000000000000ff');
    });

    it('should zero-pad to specified length', () => {
      expect(bigintToHex(1n, 2)).toBe('0001');
    });

    it('should handle zero', () => {
      expect(bigintToHex(0n, 1)).toBe('00');
    });

    it('should handle large numbers', () => {
      const large = BigInt('0x123456789abcdef');
      const hex = bigintToHex(large, 8);
      // 8 bytes = 16 hex chars, padded to 16 chars total
      expect(hex).toBe('0123456789abcdef');
    });
  });

  describe('hexToBigint', () => {
    it('should convert hex to bigint', () => {
      expect(hexToBigint('ff')).toBe(255n);
    });

    it('should handle 0x prefix', () => {
      expect(hexToBigint('0x10')).toBe(16n);
    });

    it('should roundtrip with bigintToHex', () => {
      const value = 123456789n;
      expect(hexToBigint(bigintToHex(value))).toBe(value);
    });
  });

  describe('arrayToHex', () => {
    it('should convert array to hex', () => {
      expect(arrayToHex([0xde, 0xad])).toBe('dead');
    });

    it('should handle empty array', () => {
      expect(arrayToHex([])).toBe('');
    });
  });

  describe('hexToArray', () => {
    it('should convert hex to array', () => {
      expect(hexToArray('dead')).toEqual([0xde, 0xad]);
    });

    it('should roundtrip with arrayToHex', () => {
      const arr = [0x12, 0x34, 0x56];
      expect(hexToArray(arrayToHex(arr))).toEqual(arr);
    });
  });

  describe('concatHex', () => {
    it('should concatenate hex strings', () => {
      expect(concatHex('dead', 'beef')).toBe('deadbeef');
    });

    it('should handle 0x prefixes', () => {
      expect(concatHex('0xdead', '0xbeef')).toBe('deadbeef');
    });

    it('should handle multiple arguments', () => {
      expect(concatHex('aa', 'bb', 'cc', 'dd')).toBe('aabbccdd');
    });
  });

  describe('hexEquals', () => {
    it('should compare equal hex strings', () => {
      expect(hexEquals('deadbeef', 'deadbeef')).toBe(true);
    });

    it('should handle different cases', () => {
      expect(hexEquals('DEADBEEF', 'deadbeef')).toBe(true);
    });

    it('should handle different prefixes', () => {
      expect(hexEquals('0xdeadbeef', 'deadbeef')).toBe(true);
    });

    it('should return false for different values', () => {
      expect(hexEquals('deadbeef', 'cafebabe')).toBe(false);
    });
  });

  describe('padHex', () => {
    it('should pad hex string to byte length', () => {
      expect(padHex('ff', 2)).toBe('00ff');
    });

    it('should pad from start by default', () => {
      expect(padHex('ff', 4)).toBe('000000ff');
    });

    it('should pad from end when specified', () => {
      expect(padHex('ff', 4, false)).toBe('ff000000');
    });
  });

  describe('stripLeadingZeros', () => {
    it('should strip leading zeros', () => {
      expect(stripLeadingZeros('0000ff')).toBe('ff');
    });

    it('should return 0 for all zeros', () => {
      expect(stripLeadingZeros('0000')).toBe('0');
    });

    it('should handle 0x prefix', () => {
      expect(stripLeadingZeros('0x00ff')).toBe('ff');
    });
  });

  describe('formatHex', () => {
    it('should add prefix when requested', () => {
      expect(formatHex('deadbeef', { prefix: true })).toBe('0xdeadbeef');
    });

    it('should lowercase when requested', () => {
      expect(formatHex('DEADBEEF', { lowercase: true })).toBe('deadbeef');
    });

    it('should pad to byte length', () => {
      expect(formatHex('ff', { byteLength: 2 })).toBe('00ff');
    });

    it('should apply multiple options', () => {
      expect(formatHex('FF', { prefix: true, lowercase: true, byteLength: 2 })).toBe('0x00ff');
    });
  });
});
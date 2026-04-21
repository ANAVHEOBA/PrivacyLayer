import {
  hexToBytes,
  bytesToHex,
  stringToHex,
  hexToString,
  toBase64,
  fromBase64,
  padHex,
  bigIntToBytes,
  bytesToBigInt,
  concatBuffers,
  splitBuffer,
} from '../utils/encoding';

describe('encoding utils', () => {
  describe('hexToBytes', () => {
    it('should convert hex to bytes', () => {
      const hex = 'deadbeef';
      const bytes = hexToBytes(hex);
      expect(bytes.toString('hex')).toBe('deadbeef');
    });

    it('should handle 0x prefix', () => {
      const hex = '0xdeadbeef';
      const bytes = hexToBytes(hex);
      expect(bytes.toString('hex')).toBe('deadbeef');
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex', () => {
      const bytes = Buffer.from('deadbeef', 'hex');
      const hex = bytesToHex(bytes);
      expect(hex).toBe('deadbeef');
    });

    it('should add prefix when requested', () => {
      const bytes = Buffer.from('deadbeef', 'hex');
      const hex = bytesToHex(bytes, true);
      expect(hex).toBe('0xdeadbeef');
    });
  });

  describe('stringToHex', () => {
    it('should convert string to hex', () => {
      const str = 'hello';
      const hex = stringToHex(str);
      expect(hex).toBe('68656c6c6f');
    });

    it('should add prefix when requested', () => {
      const str = 'hello';
      const hex = stringToHex(str, true);
      expect(hex).toBe('0x68656c6c6f');
    });
  });

  describe('hexToString', () => {
    it('should convert hex to string', () => {
      const hex = '68656c6c6f';
      const str = hexToString(hex);
      expect(str).toBe('hello');
    });

    it('should handle 0x prefix', () => {
      const hex = '0x68656c6c6f';
      const str = hexToString(hex);
      expect(str).toBe('hello');
    });

    it('should round-trip with stringToHex', () => {
      const original = 'Hello, World!';
      const hex = stringToHex(original);
      const restored = hexToString(hex);
      expect(restored).toBe(original);
    });
  });

  describe('toBase64', () => {
    it('should encode string to base64', () => {
      const str = 'hello';
      const base64 = toBase64(str);
      expect(base64).toBe('aGVsbG8=');
    });

    it('should encode buffer to base64', () => {
      const buffer = Buffer.from('hello');
      const base64 = toBase64(buffer);
      expect(base64).toBe('aGVsbG8=');
    });
  });

  describe('fromBase64', () => {
    it('should decode base64 to buffer', () => {
      const base64 = 'aGVsbG8=';
      const buffer = fromBase64(base64);
      expect(buffer.toString()).toBe('hello');
    });

    it('should round-trip with toBase64', () => {
      const original = 'Hello, World!';
      const base64 = toBase64(original);
      const restored = fromBase64(base64).toString();
      expect(restored).toBe(original);
    });
  });

  describe('padHex', () => {
    it('should pad hex to specified length', () => {
      const hex = 'ff';
      const padded = padHex(hex, 4);
      expect(padded).toBe('000000ff');
    });

    it('should handle 0x prefix', () => {
      const hex = '0xff';
      const padded = padHex(hex, 4);
      expect(padded).toBe('000000ff');
    });

    it('should not truncate if already long enough', () => {
      const hex = 'deadbeef';
      const padded = padHex(hex, 4);
      expect(padded).toBe('deadbeef');
    });
  });

  describe('bigIntToBytes', () => {
    it('should convert BigInt to bytes', () => {
      const value = BigInt(255);
      const bytes = bigIntToBytes(value, 1);
      expect(bytes.toString('hex')).toBe('ff');
    });

    it('should pad to correct length', () => {
      const value = BigInt(255);
      const bytes = bigIntToBytes(value, 4);
      expect(bytes.toString('hex')).toBe('000000ff');
    });
  });

  describe('bytesToBigInt', () => {
    it('should convert bytes to BigInt', () => {
      const bytes = Buffer.from('ff', 'hex');
      const value = bytesToBigInt(bytes);
      expect(value).toBe(BigInt(255));
    });

    it('should round-trip with bigIntToBytes', () => {
      const original = BigInt(12345);
      const bytes = bigIntToBytes(original);
      const restored = bytesToBigInt(bytes);
      expect(restored).toBe(original);
    });
  });

  describe('concatBuffers', () => {
    it('should concatenate buffers', () => {
      const buf1 = Buffer.from('hello');
      const buf2 = Buffer.from('world');
      const result = concatBuffers(buf1, buf2);
      expect(result.toString()).toBe('helloworld');
    });

    it('should handle multiple buffers', () => {
      const buf1 = Buffer.from('a');
      const buf2 = Buffer.from('b');
      const buf3 = Buffer.from('c');
      const result = concatBuffers(buf1, buf2, buf3);
      expect(result.toString()).toBe('abc');
    });
  });

  describe('splitBuffer', () => {
    it('should split buffer into chunks', () => {
      const buffer = Buffer.from('helloworld');
      const chunks = splitBuffer(buffer, 5);
      expect(chunks).toHaveLength(2);
      expect(chunks[0].toString()).toBe('hello');
      expect(chunks[1].toString()).toBe('world');
    });

    it('should handle uneven splits', () => {
      const buffer = Buffer.from('hello');
      const chunks = splitBuffer(buffer, 2);
      expect(chunks).toHaveLength(3);
      expect(chunks[0].toString()).toBe('he');
      expect(chunks[1].toString()).toBe('ll');
      expect(chunks[2].toString()).toBe('o');
    });
  });
});

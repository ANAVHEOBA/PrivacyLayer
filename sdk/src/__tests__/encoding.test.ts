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
} from "../utils/encoding";

describe("encoding utilities", () => {
  describe("hexToBytes", () => {
    it("should convert hex string to Buffer", () => {
      const bytes = hexToBytes("deadbeef");
      expect(bytes).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });

    it("should handle 0x prefix", () => {
      const bytes = hexToBytes("0xdeadbeef");
      expect(bytes).toEqual(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
    });

    it("should handle empty string", () => {
      expect(hexToBytes("")).toEqual(Buffer.alloc(0));
    });
  });

  describe("bytesToHex", () => {
    it("should convert Buffer to hex string", () => {
      const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      expect(bytesToHex(buf)).toBe("deadbeef");
    });

    it("should add 0x prefix when requested", () => {
      const buf = Buffer.from([0xca, 0xfe]);
      expect(bytesToHex(buf, true)).toBe("0xcafe");
    });
  });

  describe("toBase64 / fromBase64", () => {
    it("should encode and decode strings", () => {
      const original = "Hello PrivacyLayer!";
      const encoded = toBase64(original);
      expect(fromBase64(encoded)).toBe(original);
    });

    it("should handle empty string", () => {
      expect(fromBase64(toBase64(""))).toBe("");
    });

    it("should handle unicode characters", () => {
      const original = "隐私层 🔒";
      expect(fromBase64(toBase64(original))).toBe(original);
    });
  });

  describe("bigintToHex", () => {
    it("should convert bigint to hex", () => {
      expect(bigintToHex(255n)).toBe("00000000000000000000000000000000000000000000000000000000000000ff");
    });

    it("should zero-pad to specified length", () => {
      expect(bigintToHex(1n, 2)).toBe("0001");
    });

    it("should handle zero", () => {
      expect(bigintToHex(0n, 1)).toBe("00");
    });
  });

  describe("hexToBigint", () => {
    it("should convert hex to bigint", () => {
      expect(hexToBigint("ff")).toBe(255n);
    });

    it("should handle 0x prefix", () => {
      expect(hexToBigint("0x10")).toBe(16n);
    });

    it("should roundtrip with bigintToHex", () => {
      const value = 123456789n;
      expect(hexToBigint(bigintToHex(value))).toBe(value);
    });
  });
});

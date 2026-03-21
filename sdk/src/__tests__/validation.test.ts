/**
 * Unit tests for validation utilities.
 */

import {
  isValidStellarAddress,
  isValidHex,
  isFieldElement,
  isValidDenomination,
  isValidAmount,
} from "../utils/validation";
import { FIELD_SIZE } from "../constants";

describe("validation utilities", () => {
  describe("isValidStellarAddress", () => {
    it("should accept valid G-prefixed addresses", () => {
      // Valid Stellar testnet address format
      const addr = "G" + "A".repeat(55);
      expect(isValidStellarAddress(addr)).toBe(true);
    });

    it("should accept valid M-prefixed (muxed) addresses", () => {
      const addr = "M" + "A".repeat(55);
      expect(isValidStellarAddress(addr)).toBe(true);
    });

    it("should reject addresses with wrong prefix", () => {
      expect(isValidStellarAddress("X" + "A".repeat(55))).toBe(false);
    });

    it("should reject addresses with wrong length", () => {
      expect(isValidStellarAddress("GAAAA")).toBe(false);
    });

    it("should reject addresses with invalid characters", () => {
      const addr = "G" + "a".repeat(55); // lowercase not valid
      expect(isValidStellarAddress(addr)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidStellarAddress("")).toBe(false);
    });
  });

  describe("isValidHex", () => {
    it("should accept valid hex strings", () => {
      expect(isValidHex("deadbeef")).toBe(true);
      expect(isValidHex("0xDEAD")).toBe(true);
    });

    it("should reject non-hex characters", () => {
      expect(isValidHex("xyz")).toBe(false);
    });

    it("should validate expected length", () => {
      expect(isValidHex("aabb", 2)).toBe(true);
      expect(isValidHex("aabb", 3)).toBe(false);
    });

    it("should accept empty string as valid hex", () => {
      expect(isValidHex("")).toBe(true);
    });
  });

  describe("isFieldElement", () => {
    it("should accept values less than FIELD_SIZE", () => {
      expect(isFieldElement(0n)).toBe(true);
      expect(isFieldElement(100n)).toBe(true);
      expect(isFieldElement(FIELD_SIZE - 1n)).toBe(true);
    });

    it("should reject FIELD_SIZE and above", () => {
      expect(isFieldElement(FIELD_SIZE)).toBe(false);
      expect(isFieldElement(FIELD_SIZE + 1n)).toBe(false);
    });

    it("should reject negative values", () => {
      expect(isFieldElement(-1n)).toBe(false);
    });
  });

  describe("isValidDenomination", () => {
    it("should accept valid denomination values", () => {
      expect(isValidDenomination(10)).toBe(true);
      expect(isValidDenomination(100)).toBe(true);
      expect(isValidDenomination(1000)).toBe(true);
      expect(isValidDenomination(10000)).toBe(true);
    });

    it("should reject invalid denomination values", () => {
      expect(isValidDenomination(5)).toBe(false);
      expect(isValidDenomination(50)).toBe(false);
      expect(isValidDenomination(0)).toBe(false);
    });
  });

  describe("isValidAmount", () => {
    it("should accept positive amounts", () => {
      expect(isValidAmount(1)).toBe(true);
      expect(isValidAmount(1000000n)).toBe(true);
    });

    it("should reject zero and negative amounts", () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-1)).toBe(false);
      expect(isValidAmount(0n)).toBe(false);
    });

    it("should reject excessively large amounts", () => {
      expect(isValidAmount(BigInt("9999999999999999"))).toBe(false);
    });
  });
});

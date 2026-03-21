/**
 * Unit tests for crypto utilities.
 */

import {
  randomFieldElement,
  randomHex,
  sha256,
  mimcHash,
  computeCommitment,
  computeNullifierHash,
} from "../utils/crypto";
import { FIELD_SIZE } from "../constants";

describe("crypto utilities", () => {
  describe("randomFieldElement", () => {
    it("should return a value less than FIELD_SIZE", () => {
      const value = randomFieldElement();
      expect(value).toBeGreaterThanOrEqual(0n);
      expect(value).toBeLessThan(FIELD_SIZE);
    });

    it("should return different values on successive calls", () => {
      const a = randomFieldElement();
      const b = randomFieldElement();
      expect(a).not.toBe(b);
    });
  });

  describe("randomHex", () => {
    it("should return a hex string of correct length", () => {
      const hex = randomHex(16);
      expect(hex).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });

    it("should handle different byte lengths", () => {
      expect(randomHex(1)).toHaveLength(2);
      expect(randomHex(32)).toHaveLength(64);
    });
  });

  describe("sha256", () => {
    it("should produce a 64-character hex hash", () => {
      const hash = sha256("deadbeef");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("should produce deterministic output", () => {
      const input = "cafebabe";
      expect(sha256(input)).toBe(sha256(input));
    });

    it("should produce different hashes for different inputs", () => {
      expect(sha256("aa")).not.toBe(sha256("bb"));
    });
  });

  describe("mimcHash", () => {
    it("should return a hex string", () => {
      const hash = mimcHash("aa", "bb");
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("should be deterministic", () => {
      expect(mimcHash("11", "22")).toBe(mimcHash("11", "22"));
    });

    it("should produce different output for different orderings", () => {
      expect(mimcHash("11", "22")).not.toBe(mimcHash("22", "11"));
    });
  });

  describe("computeCommitment", () => {
    it("should compute commitment from nullifier and secret", () => {
      const nullifier = "aabbccdd";
      const secret = "11223344";
      const commitment = computeCommitment(nullifier, secret);
      expect(commitment).toMatch(/^[0-9a-f]+$/);
      expect(commitment).toHaveLength(64);
    });

    it("should produce same commitment for same inputs", () => {
      expect(computeCommitment("aa", "bb")).toBe(computeCommitment("aa", "bb"));
    });
  });

  describe("computeNullifierHash", () => {
    it("should hash the nullifier", () => {
      const hash = computeNullifierHash("deadbeef");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});

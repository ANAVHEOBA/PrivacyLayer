/**
 * Structural Guards Tests (ZK-075)
 */

import { describe, it, expect } from 'vitest';
import {
  validateProofStructure,
  validateVkStructure,
  validatePublicInputsStructure,
  validatePublicInputsHexStructure,
  extractProofComponents,
  G1_POINT_BYTE_LENGTH,
  G2_POINT_BYTE_LENGTH,
  FIELD_ELEMENT_BYTE_LENGTH,
  GROTH16_PROOF_TOTAL_LENGTH,
  EXPECTED_IC_VECTOR_LENGTH,
  EXPECTED_PUBLIC_INPUT_COUNT,
  VerifyingKeyStructure,
} from './structural_guards';
import { WitnessValidationError } from './errors';

describe('Structural Guards', () => {
  describe('validateProofStructure', () => {
    it('should accept valid proof length (256 bytes)', () => {
      const validProof = new Uint8Array(GROTH16_PROOF_TOTAL_LENGTH);
      expect(() => validateProofStructure(validProof)).not.toThrow();
    });

    it('should reject proof that is too short', () => {
      const shortProof = new Uint8Array(255);
      expect(() => validateProofStructure(shortProof)).toThrow(
        WitnessValidationError
      );
      expect(() => validateProofStructure(shortProof)).toThrow(/256 bytes/);
    });

    it('should reject proof that is too long', () => {
      const longProof = new Uint8Array(257);
      expect(() => validateProofStructure(longProof)).toThrow(
        WitnessValidationError
      );
      expect(() => validateProofStructure(longProof)).toThrow(/256 bytes/);
    });

    it('should reject empty proof', () => {
      const emptyProof = new Uint8Array(0);
      expect(() => validateProofStructure(emptyProof)).toThrow(
        WitnessValidationError
      );
    });
  });

  describe('validateVkStructure', () => {
    function createValidVk(): VerifyingKeyStructure {
      const ic = [];
      for (let i = 0; i < EXPECTED_IC_VECTOR_LENGTH; i++) {
        ic.push(new Uint8Array(G1_POINT_BYTE_LENGTH));
      }

      return {
        alpha_g1: new Uint8Array(G1_POINT_BYTE_LENGTH),
        beta_g2: new Uint8Array(G2_POINT_BYTE_LENGTH),
        gamma_g2: new Uint8Array(G2_POINT_BYTE_LENGTH),
        delta_g2: new Uint8Array(G2_POINT_BYTE_LENGTH),
        gamma_abc_g1: ic,
      };
    }

    it('should accept valid VK structure', () => {
      const validVk = createValidVk();
      expect(() => validateVkStructure(validVk)).not.toThrow();
    });

    it('should reject VK with wrong alpha_g1 length', () => {
      const badVk = createValidVk();
      badVk.alpha_g1 = new Uint8Array(32); // Wrong: should be 64

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/alpha_g1.*64 bytes/);
    });

    it('should reject VK with wrong beta_g2 length', () => {
      const badVk = createValidVk();
      badVk.beta_g2 = new Uint8Array(64); // Wrong: should be 128

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/beta_g2.*128 bytes/);
    });

    it('should reject VK with wrong gamma_g2 length', () => {
      const badVk = createValidVk();
      badVk.gamma_g2 = new Uint8Array(64); // Wrong: should be 128

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/gamma_g2.*128 bytes/);
    });

    it('should reject VK with wrong delta_g2 length', () => {
      const badVk = createValidVk();
      badVk.delta_g2 = new Uint8Array(64); // Wrong: should be 128

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/delta_g2.*128 bytes/);
    });

    it('should reject VK with too few IC points', () => {
      const badVk = createValidVk();
      badVk.gamma_abc_g1 = [new Uint8Array(G1_POINT_BYTE_LENGTH)]; // Only 1 point

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/gamma_abc_g1.*9 points/);
    });

    it('should reject VK with too many IC points', () => {
      const badVk = createValidVk();
      const ic = [];
      for (let i = 0; i < 10; i++) {
        ic.push(new Uint8Array(G1_POINT_BYTE_LENGTH));
      }
      badVk.gamma_abc_g1 = ic;

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/gamma_abc_g1.*9 points/);
    });

    it('should reject VK with empty IC vector', () => {
      const badVk = createValidVk();
      badVk.gamma_abc_g1 = [];

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/gamma_abc_g1.*9 points/);
    });

    it('should reject VK with IC point of wrong length', () => {
      const badVk = createValidVk();
      badVk.gamma_abc_g1[5] = new Uint8Array(32); // Wrong: should be 64

      expect(() => validateVkStructure(badVk)).toThrow(WitnessValidationError);
      expect(() => validateVkStructure(badVk)).toThrow(/gamma_abc_g1\[5\].*64 bytes/);
    });
  });

  describe('validatePublicInputsStructure', () => {
    function createValidPublicInputs(): Uint8Array[] {
      const inputs = [];
      for (let i = 0; i < EXPECTED_PUBLIC_INPUT_COUNT; i++) {
        inputs.push(new Uint8Array(FIELD_ELEMENT_BYTE_LENGTH));
      }
      return inputs;
    }

    it('should accept valid public inputs', () => {
      const validInputs = createValidPublicInputs();
      expect(() => validatePublicInputsStructure(validInputs)).not.toThrow();
    });

    it('should reject too few public inputs', () => {
      const tooFew = [new Uint8Array(FIELD_ELEMENT_BYTE_LENGTH)];
      expect(() => validatePublicInputsStructure(tooFew)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsStructure(tooFew)).toThrow(/Expected 8 public inputs/);
    });

    it('should reject too many public inputs', () => {
      const tooMany = [];
      for (let i = 0; i < 10; i++) {
        tooMany.push(new Uint8Array(FIELD_ELEMENT_BYTE_LENGTH));
      }
      expect(() => validatePublicInputsStructure(tooMany)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsStructure(tooMany)).toThrow(/Expected 8 public inputs/);
    });

    it('should reject public input with wrong length', () => {
      const badInputs = createValidPublicInputs();
      badInputs[3] = new Uint8Array(16); // Wrong: should be 32

      expect(() => validatePublicInputsStructure(badInputs)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsStructure(badInputs)).toThrow(/Public input\[3\].*32 bytes/);
    });

    it('should reject empty public inputs array', () => {
      expect(() => validatePublicInputsStructure([])).toThrow(
        WitnessValidationError
      );
    });
  });

  describe('validatePublicInputsHexStructure', () => {
    function createValidHexInputs(): string[] {
      const inputs = [];
      for (let i = 0; i < EXPECTED_PUBLIC_INPUT_COUNT; i++) {
        inputs.push('0'.repeat(64)); // 64 hex chars = 32 bytes
      }
      return inputs;
    }

    it('should accept valid hex public inputs', () => {
      const validInputs = createValidHexInputs();
      expect(() => validatePublicInputsHexStructure(validInputs)).not.toThrow();
    });

    it('should reject hex input that is too short', () => {
      const badInputs = createValidHexInputs();
      badInputs[2] = '0'.repeat(32); // Only 32 hex chars

      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(/Public input\[2\].*64 hex/);
    });

    it('should reject hex input that is too long', () => {
      const badInputs = createValidHexInputs();
      badInputs[4] = '0'.repeat(128); // Too many hex chars

      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(/Public input\[4\].*64 hex/);
    });

    it('should reject non-hex characters', () => {
      const badInputs = createValidHexInputs();
      badInputs[1] = 'g'.repeat(64); // Invalid hex

      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(
        WitnessValidationError
      );
      expect(() => validatePublicInputsHexStructure(badInputs)).toThrow(/valid hex string/);
    });

    it('should accept uppercase hex', () => {
      const validInputs = createValidHexInputs();
      validInputs[0] = 'A'.repeat(64);

      expect(() => validatePublicInputsHexStructure(validInputs)).not.toThrow();
    });

    it('should accept mixed case hex', () => {
      const validInputs = createValidHexInputs();
      validInputs[0] = 'aAbBcCdDeEfF' + '0'.repeat(52);

      expect(() => validatePublicInputsHexStructure(validInputs)).not.toThrow();
    });
  });

  describe('extractProofComponents', () => {
    it('should extract proof components correctly', () => {
      const proof = new Uint8Array(GROTH16_PROOF_TOTAL_LENGTH);
      // Fill with distinct patterns
      proof.fill(0xAA, 0, 64); // A
      proof.fill(0xBB, 64, 192); // B
      proof.fill(0xCC, 192, 256); // C

      const components = extractProofComponents(proof);

      expect(components.a.length).toBe(G1_POINT_BYTE_LENGTH);
      expect(components.b.length).toBe(G2_POINT_BYTE_LENGTH);
      expect(components.c.length).toBe(G1_POINT_BYTE_LENGTH);

      expect(components.a[0]).toBe(0xAA);
      expect(components.b[0]).toBe(0xBB);
      expect(components.c[0]).toBe(0xCC);
    });

    it('should reject malformed proof', () => {
      const badProof = new Uint8Array(100);
      expect(() => extractProofComponents(badProof)).toThrow(
        WitnessValidationError
      );
    });
  });

  describe('Integration: Multiple structural errors', () => {
    it('should report first structural error encountered', () => {
      // Create VK with multiple errors
      const badVk: VerifyingKeyStructure = {
        alpha_g1: new Uint8Array(32), // Wrong length
        beta_g2: new Uint8Array(64), // Wrong length
        gamma_g2: new Uint8Array(64), // Wrong length
        delta_g2: new Uint8Array(64), // Wrong length
        gamma_abc_g1: [], // Empty
      };

      // Should fail on first check (alpha_g1)
      expect(() => validateVkStructure(badVk)).toThrow(/alpha_g1/);
    });
  });

  describe('Constants validation', () => {
    it('should have correct constant values', () => {
      expect(G1_POINT_BYTE_LENGTH).toBe(64);
      expect(G2_POINT_BYTE_LENGTH).toBe(128);
      expect(FIELD_ELEMENT_BYTE_LENGTH).toBe(32);
      expect(GROTH16_PROOF_TOTAL_LENGTH).toBe(256);
      expect(EXPECTED_PUBLIC_INPUT_COUNT).toBe(8);
      expect(EXPECTED_IC_VECTOR_LENGTH).toBe(9);
    });
  });
});

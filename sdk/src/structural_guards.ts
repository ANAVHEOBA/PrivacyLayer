/**
 * Structural Guards for Proof, VK, and Public Input Shapes (ZK-075)
 *
 * Validates byte lengths, IC counts, and payload shapes BEFORE
 * deserialization or cryptographic operations. Mirrors the contract-side
 * guards to ensure malformed payloads fail early in both environments.
 */

import { WitnessValidationError } from './errors';

// Expected byte lengths for BN254 curve points
export const G1_POINT_BYTE_LENGTH = 64;
export const G2_POINT_BYTE_LENGTH = 128;
export const FIELD_ELEMENT_BYTE_LENGTH = 32;
export const EXPECTED_PUBLIC_INPUT_COUNT = 8;
export const EXPECTED_IC_VECTOR_LENGTH = EXPECTED_PUBLIC_INPUT_COUNT + 1; // IC[0] + 8 inputs

// Groth16 proof structure: A (G1) || B (G2) || C (G1)
export const GROTH16_PROOF_A_OFFSET = 0;
export const GROTH16_PROOF_B_OFFSET = G1_POINT_BYTE_LENGTH;
export const GROTH16_PROOF_C_OFFSET = G1_POINT_BYTE_LENGTH + G2_POINT_BYTE_LENGTH;
export const GROTH16_PROOF_TOTAL_LENGTH = G1_POINT_BYTE_LENGTH + G2_POINT_BYTE_LENGTH + G1_POINT_BYTE_LENGTH; // 256 bytes

/**
 * Validates proof structure before deserialization (ZK-075).
 *
 * Checks byte lengths of all proof components to fail fast on malformed payloads
 * before touching elliptic curve operations.
 *
 * @param proof - Raw proof bytes (should be 256 bytes: 64 + 128 + 64)
 * @throws WitnessValidationError if proof structure is invalid
 */
export function validateProofStructure(proof: Uint8Array): void {
  if (proof.length !== GROTH16_PROOF_TOTAL_LENGTH) {
    throw new WitnessValidationError(
      `Proof must be ${GROTH16_PROOF_TOTAL_LENGTH} bytes (64 + 128 + 64), got ${proof.length}`,
      'PROOF_FORMAT',
      'structure',
    );
  }

  // Validate individual component lengths by checking offsets
  // A: bytes [0..64)
  // B: bytes [64..192)
  // C: bytes [192..256)
  
  // These checks are implicit in the total length check above,
  // but we document them for clarity and future extensibility
}

/**
 * Validates verifying key structure before deserialization (ZK-075).
 *
 * Checks byte lengths and vector counts to fail fast on malformed VKs
 * before touching elliptic curve operations.
 *
 * @param vk - Verifying key object with curve points
 * @throws WitnessValidationError if VK structure is invalid
 */
export interface VerifyingKeyStructure {
  alpha_g1: Uint8Array;
  beta_g2: Uint8Array;
  gamma_g2: Uint8Array;
  delta_g2: Uint8Array;
  gamma_abc_g1: Uint8Array[];
}

export function validateVkStructure(vk: VerifyingKeyStructure): void {
  // Validate G1 point alpha (64 bytes)
  if (vk.alpha_g1.length !== G1_POINT_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `VK alpha_g1 must be ${G1_POINT_BYTE_LENGTH} bytes, got ${vk.alpha_g1.length}`,
      'VK_FORMAT',
      'structure',
    );
  }

  // Validate G2 point beta (128 bytes)
  if (vk.beta_g2.length !== G2_POINT_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `VK beta_g2 must be ${G2_POINT_BYTE_LENGTH} bytes, got ${vk.beta_g2.length}`,
      'VK_FORMAT',
      'structure',
    );
  }

  // Validate G2 point gamma (128 bytes)
  if (vk.gamma_g2.length !== G2_POINT_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `VK gamma_g2 must be ${G2_POINT_BYTE_LENGTH} bytes, got ${vk.gamma_g2.length}`,
      'VK_FORMAT',
      'structure',
    );
  }

  // Validate G2 point delta (128 bytes)
  if (vk.delta_g2.length !== G2_POINT_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `VK delta_g2 must be ${G2_POINT_BYTE_LENGTH} bytes, got ${vk.delta_g2.length}`,
      'VK_FORMAT',
      'structure',
    );
  }

  // Validate IC vector length (must be exactly 9: IC[0] + 8 public inputs)
  if (vk.gamma_abc_g1.length !== EXPECTED_IC_VECTOR_LENGTH) {
    throw new WitnessValidationError(
      `VK gamma_abc_g1 must have ${EXPECTED_IC_VECTOR_LENGTH} points (IC[0] + ${EXPECTED_PUBLIC_INPUT_COUNT} inputs), got ${vk.gamma_abc_g1.length}`,
      'VK_FORMAT',
      'structure',
    );
  }

  // Validate each IC point is 64 bytes
  for (let i = 0; i < vk.gamma_abc_g1.length; i++) {
    const icPoint = vk.gamma_abc_g1[i];
    if (!icPoint || icPoint.length !== G1_POINT_BYTE_LENGTH) {
      throw new WitnessValidationError(
        `VK gamma_abc_g1[${i}] must be ${G1_POINT_BYTE_LENGTH} bytes, got ${icPoint?.length ?? 0}`,
        'VK_FORMAT',
        'structure',
      );
    }
  }
}

/**
 * Validates public inputs structure before deserialization (ZK-075).
 *
 * Checks that all public input fields are exactly 32 bytes (field elements).
 *
 * @param publicInputs - Array of public input field elements
 * @throws WitnessValidationError if any public input has wrong length
 */
export function validatePublicInputsStructure(publicInputs: Uint8Array[]): void {
  if (publicInputs.length !== EXPECTED_PUBLIC_INPUT_COUNT) {
    throw new WitnessValidationError(
      `Expected ${EXPECTED_PUBLIC_INPUT_COUNT} public inputs, got ${publicInputs.length}`,
      'PUBLIC_INPUT_FORMAT',
      'structure',
    );
  }

  for (let i = 0; i < publicInputs.length; i++) {
    const input = publicInputs[i];
    if (!input || input.length !== FIELD_ELEMENT_BYTE_LENGTH) {
      throw new WitnessValidationError(
        `Public input[${i}] must be ${FIELD_ELEMENT_BYTE_LENGTH} bytes, got ${input?.length ?? 0}`,
        'PUBLIC_INPUT_FORMAT',
        'structure',
      );
    }
  }
}

/**
 * Validates public inputs from hex strings (64-char hex = 32 bytes).
 *
 * @param publicInputs - Array of public input hex strings (without 0x prefix)
 * @throws WitnessValidationError if any public input has wrong format
 */
export function validatePublicInputsHexStructure(publicInputs: string[]): void {
  if (publicInputs.length !== EXPECTED_PUBLIC_INPUT_COUNT) {
    throw new WitnessValidationError(
      `Expected ${EXPECTED_PUBLIC_INPUT_COUNT} public inputs, got ${publicInputs.length}`,
      'PUBLIC_INPUT_FORMAT',
      'structure',
    );
  }

  const expectedHexLength = FIELD_ELEMENT_BYTE_LENGTH * 2; // 32 bytes = 64 hex chars

  for (let i = 0; i < publicInputs.length; i++) {
    const input = publicInputs[i];
    if (!input || input.length !== expectedHexLength) {
      throw new WitnessValidationError(
        `Public input[${i}] must be ${expectedHexLength} hex characters (${FIELD_ELEMENT_BYTE_LENGTH} bytes), got ${input?.length ?? 0}`,
        'PUBLIC_INPUT_FORMAT',
        'structure',
      );
    }

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(input)) {
      throw new WitnessValidationError(
        `Public input[${i}] must be valid hex string, got "${input.substring(0, 20)}..."`,
        'PUBLIC_INPUT_FORMAT',
        'structure',
      );
    }
  }
}

/**
 * Extracts proof components from raw proof bytes for validation.
 *
 * @param proof - Raw proof bytes (256 bytes)
 * @returns Object with A, B, C components
 */
export function extractProofComponents(proof: Uint8Array): {
  a: Uint8Array;
  b: Uint8Array;
  c: Uint8Array;
} {
  validateProofStructure(proof);

  return {
    a: proof.slice(GROTH16_PROOF_A_OFFSET, GROTH16_PROOF_B_OFFSET),
    b: proof.slice(GROTH16_PROOF_B_OFFSET, GROTH16_PROOF_C_OFFSET),
    c: proof.slice(GROTH16_PROOF_C_OFFSET, GROTH16_PROOF_TOTAL_LENGTH),
  };
}

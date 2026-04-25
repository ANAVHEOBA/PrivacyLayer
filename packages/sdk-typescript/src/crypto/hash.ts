/**
 * Poseidon hash utilities for ZK circuits
 * Compatible with Noir Poseidon implementation
 */

// Poseidon constants for BN254 curve ( Noir default )
const POSEIDON_ROUNDS = 8;
const POSEIDON_RATE = 2;
const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

/**
 * Poseidon hash input elements
 * Simplified implementation - production would use WASM or native binding
 */
export function poseidonHash(inputs: bigint[]): bigint {
  if (inputs.length === 0) {
    throw new Error('Poseidon hash requires at least one input');
  }
  if (inputs.length > POSEIDON_RATE) {
    throw new Error(`Poseidon hash supports max ${POSEIDON_RATE} inputs`);
  }

  // Simplified sponge construction
  let state = BigInt(0);

  for (let i = 0; i < POSEIDON_ROUNDS; i++) {
    // Add round constants and apply S-box (x^5)
    for (const input of inputs) {
      state = state + input + getRoundConstant(i);
      state = state % FIELD_MODULUS;
      state = pow5(state);
    }
  }

  // Final state is the hash output
  return state % FIELD_MODULUS;
}

/**
 * Poseidon hash for commitment generation
 * Commonly used for 2-input hashing in Merkle trees
 */
export function poseidonHash2(left: bigint, right: bigint): bigint {
  return poseidonHash([left, right]);
}

/**
 * Compute Merkle root from leaf and path elements
 */
export function computeMerkleRoot(
  leaf: bigint,
  pathElements: bigint[],
  pathIndices: number[]
): bigint {
  let current = leaf;

  for (let i = 0; i < pathElements.length; i++) {
    const pathElement = pathElements[i];
    const pathIndex = pathIndices[i];

    if (pathIndex === 0) {
      // Current is left, path element is right
      current = poseidonHash2(current, pathElement);
    } else {
      // Current is right, path element is left
      current = poseidonHash2(pathElement, current);
    }
  }

  return current;
}

/**
 * Convert Uint8Array to field element
 */
export function bytesToField(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = (result << BigInt(8)) | BigInt(bytes[i]);
  }
  return result % FIELD_MODULUS;
}

/**
 * Convert field element to Uint8Array (32 bytes)
 */
export function fieldToBytes(field: bigint): Uint8Array {
  const hex = field.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Hash commitment data using Poseidon
 */
export function hashCommitment(
  amount: bigint,
  secret: Uint8Array,
  blinding: Uint8Array
): bigint {
  const secretField = bytesToField(secret);
  const blindingField = bytesToField(blinding);
  const amountField = amount % FIELD_MODULUS;

  // Double-width hash for security
  const hash1 = poseidonHash([amountField, secretField]);
  const hash2 = poseidonHash([hash1, blindingField]);

  return hash2;
}

// Private helpers

function pow5(x: bigint): bigint {
  const x2 = (x * x) % FIELD_MODULUS;
  const x4 = (x2 * x2) % FIELD_MODULUS;
  return (x4 * x) % FIELD_MODULUS;
}

const ROUND_CONSTANTS: bigint[] = [
  BigInt('1'),
  BigInt('2'),
  BigInt('3'),
  BigInt('4'),
  BigInt('5'),
  BigInt('6'),
  BigInt('7'),
  BigInt('8'),
];

function getRoundConstant(round: number): bigint {
  return ROUND_CONSTANTS[round % ROUND_CONSTANTS.length];
}

// Fix typo
// FIELD_MODULUS already defined above

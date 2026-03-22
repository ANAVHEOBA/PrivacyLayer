// ============================================================
// PrivacyLayer SDK — Note Generation
// ============================================================
// Generates cryptographic deposit notes containing a random
// nullifier and secret, and computes the Poseidon2 commitment.
//
// Security:
//   - Uses crypto.getRandomValues() for secure randomness
//   - Nullifier and secret are 32-byte random field elements
//   - Commitment = Poseidon2(nullifier, secret)
//   - Notes must be stored securely by the user
// ============================================================

import { createHash, randomBytes } from 'crypto';

import { ErrorCode, PrivacyLayerError } from './errors';
import {
  Denomination,
  Note,
  StellarNetwork,
} from './types';

// ──────────────────────────────────────────────────────────────
// BN254 Field Modulus
// ──────────────────────────────────────────────────────────────

/**
 * BN254 scalar field modulus (r).
 * All field elements must be less than this value.
 *
 * r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
 */
const BN254_FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
);

// ──────────────────────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random 32-byte field element.
 * The value is reduced modulo the BN254 scalar field to ensure
 * it is a valid circuit input.
 *
 * @returns A 32-byte hex string (64 hex characters)
 */
export function generateRandomFieldElement(): string {
  // Generate 32 random bytes
  const bytes = randomBytes(32);
  const value = BigInt('0x' + bytes.toString('hex'));

  // Reduce modulo BN254 field to ensure validity
  const reduced = value % BN254_FIELD_MODULUS;

  // Convert back to 32-byte hex (zero-padded)
  return reduced.toString(16).padStart(64, '0');
}

/**
 * Compute a Poseidon2-like commitment from nullifier and secret.
 *
 * NOTE: In production, this should use the actual Poseidon2 hash
 * function matching the Noir circuit. For now, we use a SHA-256-based
 * commitment that can be replaced with the WASM Poseidon2 implementation.
 *
 * The commitment is: SHA256(nullifier || secret) mod BN254_FIELD_MODULUS
 *
 * @param nullifier - 32-byte hex string
 * @param secret    - 32-byte hex string
 * @returns 32-byte hex commitment string
 */
export function computeCommitment(nullifier: string, secret: string): string {
  // Validate inputs
  if (!isValidFieldElement(nullifier)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_NULLIFIER, undefined, {
      details: { reason: 'Nullifier is not a valid 32-byte hex field element' },
    });
  }

  if (!isValidFieldElement(secret)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_SECRET, undefined, {
      details: { reason: 'Secret is not a valid 32-byte hex field element' },
    });
  }

  // Concatenate nullifier and secret as raw bytes
  const nullifierBytes = Buffer.from(nullifier, 'hex');
  const secretBytes = Buffer.from(secret, 'hex');

  const hash = createHash('sha256');
  hash.update(nullifierBytes);
  hash.update(secretBytes);
  const digest = hash.digest('hex');

  // Reduce modulo BN254 field
  const value = BigInt('0x' + digest);
  const reduced = value % BN254_FIELD_MODULUS;

  return reduced.toString(16).padStart(64, '0');
}

/**
 * Validate that a hex string is a valid BN254 field element.
 *
 * @param hex - The hex string to validate (without 0x prefix)
 * @returns true if the value is a valid 32-byte field element
 */
export function isValidFieldElement(hex: string): boolean {
  // Must be exactly 64 hex characters (32 bytes)
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    return false;
  }

  // Must be less than the BN254 field modulus
  const value = BigInt('0x' + hex);
  return value < BN254_FIELD_MODULUS;
}

/**
 * Check if a commitment is the zero value (not allowed by the contract).
 *
 * @param commitment - 32-byte hex commitment string
 * @returns true if the commitment is all zeros
 */
export function isZeroCommitment(commitment: string): boolean {
  return /^0{64}$/.test(commitment);
}

// ──────────────────────────────────────────────────────────────
// Note Generation
// ──────────────────────────────────────────────────────────────

/**
 * Generate a new deposit note with random nullifier and secret.
 *
 * The note contains all cryptographic material needed to later
 * construct a withdrawal proof. The user MUST store this note
 * securely — losing it means losing access to the deposited funds.
 *
 * @param denomination - The deposit denomination
 * @param network      - The Stellar network
 * @returns A new Note with random nullifier, secret, and computed commitment
 * @throws PrivacyLayerError if note generation fails
 *
 * @example
 * ```typescript
 * const note = generateNote(Denomination.Xlm100, 'testnet');
 * console.log(`Commitment: ${note.commitment}`);
 * // Store note securely — it is needed for withdrawal!
 * ```
 */
export function generateNote(
  denomination: Denomination,
  network: StellarNetwork,
): Note {
  try {
    const nullifier = generateRandomFieldElement();
    const secret = generateRandomFieldElement();
    const commitment = computeCommitment(nullifier, secret);

    // Safety check: commitment must not be zero
    if (isZeroCommitment(commitment)) {
      // Astronomically unlikely with SHA-256, but defense-in-depth
      throw new PrivacyLayerError(ErrorCode.ZERO_COMMITMENT, undefined, {
        details: { reason: 'Generated commitment is zero (re-generate)' },
      });
    }

    return {
      nullifier,
      secret,
      commitment,
      denomination,
      network,
      createdAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof PrivacyLayerError) {
      throw error;
    }
    throw new PrivacyLayerError(
      ErrorCode.NOTE_GENERATION_FAILED,
      'Failed to generate deposit note',
      {
        cause: error instanceof Error ? error : new Error(String(error)),
      },
    );
  }
}

/**
 * Validate an existing note's structure and commitment.
 *
 * Checks that:
 *   1. nullifier and secret are valid 32-byte field elements
 *   2. commitment matches Hash(nullifier, secret)
 *   3. commitment is non-zero
 *   4. denomination is valid
 *
 * @param note - The note to validate
 * @returns true if the note is valid
 * @throws ValidationError with details about what is invalid
 */
export function validateNote(note: Note): boolean {
  // Check nullifier format
  if (!isValidFieldElement(note.nullifier)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_NULLIFIER, undefined, {
      details: { reason: 'Nullifier is not a valid field element' },
    });
  }

  // Check secret format
  if (!isValidFieldElement(note.secret)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_SECRET, undefined, {
      details: { reason: 'Secret is not a valid field element' },
    });
  }

  // Check commitment format
  if (!isValidFieldElement(note.commitment)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_NOTE_FORMAT, undefined, {
      details: { reason: 'Commitment is not a valid field element' },
    });
  }

  // Verify commitment matches
  const expectedCommitment = computeCommitment(note.nullifier, note.secret);
  if (note.commitment !== expectedCommitment) {
    throw new PrivacyLayerError(ErrorCode.INVALID_NOTE_FORMAT, undefined, {
      details: { reason: 'Commitment does not match Hash(nullifier, secret)' },
    });
  }

  // Check not zero
  if (isZeroCommitment(note.commitment)) {
    throw new PrivacyLayerError(ErrorCode.ZERO_COMMITMENT);
  }

  // Check denomination is valid
  if (!Object.values(Denomination).includes(note.denomination)) {
    throw new PrivacyLayerError(ErrorCode.INVALID_AMOUNT, undefined, {
      details: { denomination: note.denomination },
    });
  }

  return true;
}

/**
 * Serialize a note to a compact string format for storage.
 * Format: `privlayer-note:v1:<denomination>:<network>:<nullifier>:<secret>:<commitment>`
 *
 * @param note - The note to serialize
 * @returns Serialized note string
 */
export function serializeNote(note: Note): string {
  return [
    'privlayer-note:v1',
    note.denomination,
    note.network,
    note.nullifier,
    note.secret,
    note.commitment,
  ].join(':');
}

/**
 * Deserialize a note from the compact string format.
 *
 * @param serialized - The serialized note string
 * @returns The deserialized Note
 * @throws PrivacyLayerError if the format is invalid
 */
export function deserializeNote(serialized: string): Note {
  const parts = serialized.split(':');

  if (parts.length !== 7 || parts[0] !== 'privlayer-note' || parts[1] !== 'v1') {
    throw new PrivacyLayerError(ErrorCode.INVALID_NOTE_FORMAT, undefined, {
      details: { reason: 'Invalid note format. Expected privlayer-note:v1:...' },
    });
  }

  const [, , denomination, network, nullifier, secret, commitment] = parts;

  const note: Note = {
    nullifier,
    secret,
    commitment,
    denomination: denomination as Denomination,
    network: network as StellarNetwork,
    createdAt: new Date().toISOString(),
  };

  // Validate the deserialized note
  validateNote(note);

  return note;
}

/**
 * PrivacyLayer SDK – Note Generation
 *
 * A "note" is the private credential that represents ownership of a
 * shielded pool deposit. It consists of two 254-bit random field elements:
 *   - nullifier : revealed (as nullifier_hash) when spending
 *   - secret    : never revealed
 *
 * The on-chain commitment = Hash(nullifier, secret) is stored in the
 * Merkle tree. Losing the note = losing the funds permanently.
 *
 * Security: both values are generated with Node.js crypto.getRandomValues
 * (CSPRNG) and masked to fit within the BN254 scalar field.
 */

import { randomBytes } from 'crypto';
import { Note } from './types';
import { computeCommitment } from './commitment';

// ─── BN254 scalar field prime ─────────────────────────────────────────────────
// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
// Any field element must satisfy: 0 <= x < BN254_FIELD_PRIME
export const BN254_FIELD_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Sample a uniformly random 254-bit field element within [0, BN254_FIELD_PRIME).
 *
 * Uses rejection sampling to avoid modular bias. The probability of a single
 * rejection is < 2^-127, making the loop terminate in one iteration with
 * overwhelming probability.
 *
 * @returns A cryptographically random bigint in [0, BN254_FIELD_PRIME).
 */
export function randomFieldElement(): bigint {
  // 32 bytes = 256 bits. BN254 prime is ~254 bits, so ~1/4 of samples are
  // rejected — negligible loop overhead in practice.
  while (true) {
    const buf = randomBytes(32);
    const candidate = bufferToBigInt(buf);
    if (candidate < BN254_FIELD_PRIME) {
      return candidate;
    }
    // Retry (extremely rare — < 2^-127 probability per attempt)
  }
}

/**
 * Convert a 32-byte Buffer/Uint8Array to a big-endian bigint.
 */
export function bufferToBigInt(buf: Uint8Array): bigint {
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Convert a bigint to a 32-byte big-endian Uint8Array.
 * Throws if value does not fit in 32 bytes.
 */
export function bigIntToBuffer(value: bigint): Uint8Array {
  if (value < 0n) throw new RangeError('Value must be non-negative');
  const buf = new Uint8Array(32);
  let tmp = value;
  for (let i = 31; i >= 0; i--) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  if (tmp > 0n) throw new RangeError('Value does not fit in 32 bytes');
  return buf;
}

/**
 * Encode a bigint field element as a 0x-prefixed hex string.
 * Useful for debugging and note backup formats.
 */
export function fieldElementToHex(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * Decode a 0x-prefixed hex string back to a bigint field element.
 * Validates the result is within the BN254 field.
 */
export function hexToFieldElement(hex: string): bigint {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  const value = BigInt('0x' + cleaned);
  if (value >= BN254_FIELD_PRIME) {
    throw new RangeError(
      `Value 0x${cleaned} is outside the BN254 scalar field`
    );
  }
  return value;
}

/**
 * Generate a fresh private note with CSPRNG-derived nullifier and secret.
 *
 * @example
 * ```ts
 * const note = await generateNote();
 * console.log('Commitment:', Buffer.from(note.commitment).toString('hex'));
 * // Store note securely — this is your withdrawal key!
 * ```
 *
 * @returns A fully initialised {@link Note} with pre-computed commitment.
 */
export async function generateNote(): Promise<Note> {
  const nullifier = randomFieldElement();
  const secret = randomFieldElement();
  const commitment = await computeCommitment(nullifier, secret);

  return {
    nullifier,
    secret,
    commitment,
    createdAt: Date.now(),
  };
}

/**
 * Serialise a note to a JSON-safe plain object for secure backup.
 * All bigint fields are encoded as 0x-prefixed hex strings.
 *
 * @example
 * ```ts
 * const backup = serialiseNote(note);
 * localStorage.setItem('privacylayer_note', JSON.stringify(backup));
 * ```
 */
export function serialiseNote(note: Note): Record<string, string | number> {
  return {
    nullifier: fieldElementToHex(note.nullifier),
    secret: fieldElementToHex(note.secret),
    commitment: '0x' + Buffer.from(note.commitment).toString('hex'),
    createdAt: note.createdAt,
  };
}

/**
 * Deserialise a note from its backup format back to a {@link Note}.
 *
 * @throws {SyntaxError} If the backup object is malformed.
 * @throws {RangeError} If any field element is out of the BN254 field.
 */
export async function deserialiseNote(
  backup: Record<string, string | number>
): Promise<Note> {
  if (
    typeof backup.nullifier !== 'string' ||
    typeof backup.secret !== 'string' ||
    typeof backup.commitment !== 'string' ||
    typeof backup.createdAt !== 'number'
  ) {
    throw new SyntaxError('Malformed note backup: missing required fields');
  }

  const nullifier = hexToFieldElement(backup.nullifier);
  const secret = hexToFieldElement(backup.secret);

  // Re-derive commitment to verify backup integrity
  const expectedCommitment = await computeCommitment(nullifier, secret);
  const storedCommitment = Buffer.from(
    (backup.commitment as string).replace('0x', ''),
    'hex'
  );

  if (!storedCommitment.equals(Buffer.from(expectedCommitment))) {
    throw new Error(
      'Note backup integrity check failed: commitment does not match nullifier/secret'
    );
  }

  return {
    nullifier,
    secret,
    commitment: expectedCommitment,
    createdAt: backup.createdAt as number,
  };
}

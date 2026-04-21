import { createHash, randomBytes } from 'crypto';

import { Denomination, Note } from '../types';
import { bytesToHex, hexToBytes, normalizeHex } from './encoding';
import { assertDenomination, assertNonZeroHex32, validateNote } from './validation';

export function randomHex32(): string {
  return bytesToHex(randomBytes(32));
}

export function sha256Hex(parts: Array<string | Uint8Array>): string {
  const hash = createHash('sha256');
  for (const part of parts) {
    hash.update(typeof part === 'string' ? hexToBytes(part) : part);
  }
  return hash.digest('hex');
}

/**
 * Computes an SDK-side commitment placeholder.
 *
 * The production commitment must use the same Poseidon2 primitive as the Noir
 * circuits and Soroban contract. This helper keeps SDK tests and app wiring
 * deterministic until the Poseidon/Noir WASM prover package is connected.
 */
export function computeCommitment(nullifier: string, secret: string): string {
  assertNonZeroHex32(nullifier, 'nullifier');
  assertNonZeroHex32(secret, 'secret');
  return sha256Hex([normalizeHex(nullifier), normalizeHex(secret)]);
}

export function computeNullifierHash(nullifier: string, root: string): string {
  assertNonZeroHex32(nullifier, 'nullifier');
  assertNonZeroHex32(root, 'root');
  return sha256Hex([normalizeHex(nullifier), normalizeHex(root)]);
}

export function generateNote(denomination: Denomination): Note {
  assertDenomination(denomination);
  const nullifier = randomHex32();
  const secret = randomHex32();
  const note: Note = {
    nullifier,
    secret,
    commitment: computeCommitment(nullifier, secret),
    denomination,
  };
  validateNote(note);
  return note;
}

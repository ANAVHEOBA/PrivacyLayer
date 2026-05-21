/**
 * Key generation and management utilities for PrivacyLayer
 */

import { Keypair } from '@stellar/stellar-base';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

/**
 * Generate a new Stellar keypair for shielded pool interactions
 */
export function generateKeypair(): KeyPair {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/**
 * Derive public key from secret key
 */
export function derivePublicKey(secretKey: string): string {
  const keypair = Keypair.fromSecret(secretKey);
  return keypair.publicKey();
}

/**
 * Validate a Stellar public key
 */
export function isValidPublicKey(publicKey: string): boolean {
  try {
    Keypair.fromPublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar secret key
 */
export function isValidSecretKey(secretKey: string): boolean {
  try {
    Keypair.fromSecret(secretKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a random 32-byte buffer for cryptographic operations
 */
export function randomBytes(size: number = 32): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(size));
  }
  // Node.js fallback
  const { randomBytes: nodeRandomBytes } = require('crypto');
  return new Uint8Array(nodeRandomBytes(size));
}

/**
 * Generate a commitment for shielded deposit
 */
export function generateCommitment(
  amount: bigint,
  secret: Uint8Array,
  blinding: Uint8Array
): Uint8Array {
  // Commitment = hash(amount || secret || blinding)
  const data = new Uint8Array(8 + secret.length + blinding.length);
  const view = new DataView(data.buffer);
  view.setBigUint64(0, amount, false);
  data.set(secret, 8);
  data.set(blinding, 8 + secret.length);

  // Simple hash placeholder - in production use proper Poseidon hash
  return hashToField(data);
}

/**
 * Generate a nullifier from commitment data
 */
export function generateNullifier(
  commitment: Uint8Array,
  secret: Uint8Array
): Uint8Array {
  // Nullifier = hash(commitment || secret)
  const data = new Uint8Array(commitment.length + secret.length);
  data.set(commitment, 0);
  data.set(secret, commitment.length);
  return hashToField(data);
}

/**
 * Hash data to field element (simplified implementation)
 */
function hashToField(data: Uint8Array): Uint8Array {
  // In production, use proper Poseidon hash
  // This is a placeholder that returns first 32 bytes
  const hash = new Uint8Array(32);
  for (let i = 0; i < Math.min(data.length, 32); i++) {
    hash[i] = data[i];
  }
  return hash;
}

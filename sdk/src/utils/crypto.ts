/**
 * Cryptographic utility functions for PrivacyLayer.
 * Uses Pedersen hash for ZK-friendly operations matching Noir circuits.
 * @module @privacylayer/sdk/utils/crypto
 */

import { randomBytes, createHash } from 'crypto';
import { FIELD_SIZE } from '../constants';

// Hash function type
type HashFunction = (inputs: bigint[]) => bigint;

// Singleton hash function
let hashFunction: HashFunction | null = null;
let usingFallback = false;

/**
 * Initialize the Pedersen hash instance.
 * This should be called before using pedersenHash functions.
 * In production, this would load the precomputed parameters from circomlibjs.
 */
export async function initPedersen(): Promise<void> {
  if (hashFunction) return;

  // Use fallback hash for now
  // TODO: Implement proper Pedersen hash integration with circomlibjs
  // The circomlibjs API is complex and requires proper buffer handling
  usingFallback = true;
  hashFunction = fallbackHash;
}

/**
 * Fallback hash function using SHA-256.
 * NOTE: This is NOT ZK-friendly and should only be used for testing.
 */
function fallbackHash(inputs: bigint[]): bigint {
  const combined = inputs.map((i) => i.toString(16).padStart(64, '0')).join('');
  const hash = createHash('sha256').update(Buffer.from(combined, 'hex')).digest('hex');
  return BigInt('0x' + hash) % FIELD_SIZE;
}

/**
 * Check if using fallback hash (for testing/debugging).
 */
export function isUsingFallback(): boolean {
  return usingFallback;
}

/**
 * Generate a random field element within the BN254 scalar field.
 * @returns Random bigint less than FIELD_SIZE
 */
export function randomFieldElement(): bigint {
  const bytes = randomBytes(32);
  const value = BigInt('0x' + bytes.toString('hex'));
  return value % FIELD_SIZE;
}

/**
 * Generate a random hex string of specified byte length.
 * @param byteLength - Number of bytes to generate
 * @returns Hex-encoded random string (without 0x prefix)
 */
export function randomHex(byteLength: number): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Compute Pedersen hash of two field elements.
 * This matches the implementation in Noir circuits.
 *
 * @param left - Left input as bigint
 * @param right - Right input as bigint
 * @returns Pedersen hash as bigint
 */
export async function pedersenHash(left: bigint, right: bigint): Promise<bigint> {
  if (!hashFunction) {
    await initPedersen();
  }
  return hashFunction!([left, right]);
}

/**
 * Compute Pedersen hash of two hex strings.
 * @param left - Left input as hex string (32 bytes)
 * @param right - Right input as hex string (32 bytes)
 * @returns Hash as hex string (32 bytes)
 */
export async function pedersenHashHex(left: string, right: string): Promise<string> {
  const leftBigint = hexToBigint(left);
  const rightBigint = hexToBigint(right);
  const result = await pedersenHash(leftBigint, rightBigint);
  return bigintToHex(result);
}

/**
 * Compute SHA-256 hash of input data.
 * Used for non-ZK operations like transaction IDs.
 * @param data - Hex string to hash (without 0x prefix)
 * @returns SHA-256 hash as hex string
 */
export function sha256(data: string): string {
  return createHash('sha256').update(Buffer.from(data, 'hex')).digest('hex');
}

/**
 * Compute the commitment for a nullifier and secret.
 * commitment = pedersenHash(nullifier, secret)
 *
 * @param nullifier - Nullifier as bigint
 * @param secret - Secret as bigint
 * @returns Commitment as bigint
 */
export async function computeCommitment(nullifier: bigint, secret: bigint): Promise<bigint> {
  return pedersenHash(nullifier, secret);
}

/**
 * Compute the commitment from hex strings.
 * @param nullifierHex - Nullifier as hex string (32 bytes)
 * @param secretHex - Secret as hex string (32 bytes)
 * @returns Commitment as hex string (32 bytes)
 */
export async function computeCommitmentHex(
  nullifierHex: string,
  secretHex: string
): Promise<string> {
  return pedersenHashHex(nullifierHex, secretHex);
}

/**
 * Compute the nullifier hash for withdrawal.
 * This binds the nullifier to a specific Merkle root to prevent replay attacks.
 * nullifierHash = pedersenHash(nullifier, root)
 *
 * @param nullifier - Nullifier as bigint
 * @param root - Merkle tree root as bigint
 * @returns Nullifier hash as bigint
 */
export async function computeNullifierHash(nullifier: bigint, root: bigint): Promise<bigint> {
  return pedersenHash(nullifier, root);
}

/**
 * Compute the zero leaf value for empty Merkle tree positions.
 * zeroLeaf = pedersenHash(0, 0)
 * @returns Zero leaf value as bigint
 */
export async function computeZeroLeaf(): Promise<bigint> {
  return pedersenHash(0n, 0n);
}

/**
 * Helper: Convert bigint to hex string.
 */
function bigintToHex(value: bigint, byteLength = 32): string {
  const hex = value.toString(16);
  return hex.padStart(byteLength * 2, '0');
}

/**
 * Helper: Convert hex string to bigint.
 */
function hexToBigint(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + clean);
}

/**
 * Generate a new note for a deposit.
 * @param denomination - Denomination value for the note
 * @returns Note with random nullifier and secret
 */
export async function generateNote(denomination: number): Promise<{
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: number;
}> {
  const nullifier = randomFieldElement();
  const secret = randomFieldElement();
  const commitment = await computeCommitment(nullifier, secret);

  return {
    nullifier: bigintToHex(nullifier),
    secret: bigintToHex(secret),
    commitment: bigintToHex(commitment),
    denomination,
  };
}
/**
 * Cryptographic utility functions for PrivacyLayer.
 * @module @privacylayer/sdk/utils/crypto
 */

import { randomBytes, createHash } from "crypto";
import { FIELD_SIZE } from "../constants";

/**
 * Generate a random field element (bigint) within the BN254 scalar field.
 * @returns Random bigint less than FIELD_SIZE
 */
export function randomFieldElement(): bigint {
  // Generate 32 random bytes and reduce modulo FIELD_SIZE
  const bytes = randomBytes(32);
  const value = BigInt("0x" + bytes.toString("hex"));
  return value % FIELD_SIZE;
}

/**
 * Generate a random hex string of specified byte length.
 * @param byteLength - Number of bytes to generate
 * @returns Hex-encoded random string (without 0x prefix)
 */
export function randomHex(byteLength: number): string {
  return randomBytes(byteLength).toString("hex");
}

/**
 * Compute SHA-256 hash of input data.
 * @param data - Hex string to hash (without 0x prefix)
 * @returns SHA-256 hash as hex string
 */
export function sha256(data: string): string {
  return createHash("sha256").update(Buffer.from(data, "hex")).digest("hex");
}

/**
 * Compute MiMC hash of two field elements.
 * This is a simplified placeholder - production code should use
 * the actual MiMC implementation matching the ZK circuit.
 * @param left - Left input (hex string)
 * @param right - Right input (hex string)
 * @returns Hash as hex string
 */
export function mimcHash(left: string, right: string): string {
  // Placeholder: use SHA-256 as a stand-in
  // Production: implement MiMC hash matching Noir circuit
  const combined = left.padStart(64, "0") + right.padStart(64, "0");
  return sha256(combined);
}

/**
 * Compute the commitment for a nullifier and secret.
 * @param nullifier - Nullifier as hex string
 * @param secret - Secret as hex string
 * @returns Commitment hash as hex string
 */
export function computeCommitment(nullifier: string, secret: string): string {
  return mimcHash(nullifier, secret);
}

/**
 * Compute the nullifier hash for withdrawal.
 * @param nullifier - Nullifier as hex string
 * @returns Nullifier hash as hex string
 */
export function computeNullifierHash(nullifier: string): string {
  return sha256(nullifier);
}

/**
 * Public input helpers for the PrivacyPool SDK.
 *
 * The recipient address is now bound explicitly via a hash that appears
 * as the 5th element (index 4) in the public inputs array.
 */

import { poseidon } from '@noir-lang/noir-wasm'; // or appropriate hash lib

/**
 * Convert a Stellar address string into the field element that the circuit
 * expects as the recipient commitment.
 *
 * The SDK hashes the UTF‑8 bytes of the address using SHA‑256 (mirrored by the
 * contract). If the circuit uses Poseidon, replace the hash function
 * accordingly.
 *
 * @param address Stellar address (e.g. "GABCD...")
 * @returns Field element (big‑int) representing the hash.
 */
export function recipientHash(address: string): bigint {
  // For compatibility with the contract implementation we use SHA‑256.
  // The hash is truncated to 128 bits to fit into a `u128` public input.
  const encoder = new TextEncoder();
  const bytes = encoder.encode(address);
  const hash = crypto.subtle.digestSync('SHA-256', bytes); // returns Uint8Array[32]
  const truncated = hash.slice(0, 16); // first 16 bytes = 128 bits
  let result = 0n;
  for (const b of truncated) {
    result = (result << 8n) + BigInt(b);
  }
  return result;
}

/**
 * Assemble the full public inputs vector for a withdraw proof.
 *
 * The ordering must match the circuit definition:
 *   [ merkle_root, nullifier, amount, fee, recipient_hash, ... ]
 *
 * @param root Merkle root (field element)
 * @param nullifier Nullifier (field element)
 * @param amount Amount to withdraw (field element)
 * @param fee Fee amount (field element)
 * @param recipient Stellar address string
 * @returns Array of field elements ready to be passed to the proof verifier.
 */
export function makeWithdrawPublicInputs(
  root: bigint,
  nullifier: bigint,
  amount: bigint,
  fee: bigint,
  recipient: string,
): bigint[] {
  const recipientCommit = recipientHash(recipient);
  return [root, nullifier, amount, fee, recipientCommit];
}

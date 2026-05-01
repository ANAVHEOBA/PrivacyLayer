/**
 * Redaction helpers for sensitive ZK data types.
 *
 * These utilities ensure that notes, witnesses, proofs, and backup strings
 * can be logged or included in error messages without leaking secrets,
 * nullifiers, or other privacy-sensitive material.
 *
 * Issue: ZK-111
 */

import { Note } from './note';
import type { PreparedWitness, WithdrawalWitness } from './proof';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REDACTED = '[REDACTED]';
const PARTIAL_VISIBLE_CHARS = 6;

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function truncateHex(value: string, visibleChars: number = PARTIAL_VISIBLE_CHARS): string {
  if (value.length <= visibleChars) {
    return REDACTED;
  }
  return `${value.slice(0, visibleChars)}...${REDACTED}`;
}

function redactArray(items: string[], visibleCount: number = 0): string {
  if (visibleCount > 0 && items.length > 0) {
    const visible = items.slice(0, visibleCount).map((_, i) => `[${i}]`);
    return `Array(${items.length}) [${visible.join(', ')}, ...${REDACTED}]`;
  }
  return `Array(${items.length}) ${REDACTED}`;
}

// ---------------------------------------------------------------------------
// Note redaction
// ---------------------------------------------------------------------------

export interface RedactedNote {
  poolId: string;
  amount: string;
  denomination: string;
  nullifier: string;
  secret: string;
  commitmentPreview: string;
}

/**
 * Redact a Note for safe logging.
 *
 * Pool ID and amount/denomination are safe to expose (public or aggregate).
 * Nullifier and secret are fully redacted.
 */
export function redactNote(note: Note): RedactedNote {
  return {
    poolId: note.poolId,
    amount: note.amount.toString(),
    denomination: note.denomination.toString(),
    nullifier: REDACTED,
    secret: REDACTED,
    commitmentPreview: `${truncateHex(note.getCommitment().toString('hex'))}`,
  };
}

/**
 * Stringify a redacted note for logging.
 */
export function redactNoteToString(note: Note): string {
  const redacted = redactNote(note);
  return JSON.stringify(redacted);
}

// ---------------------------------------------------------------------------
// Backup string redaction
// ---------------------------------------------------------------------------

/**
 * Redact a note backup string for safe logging.
 *
 * Shows only the prefix and first few characters of the payload to
 * confirm format without exposing the actual secret material.
 */
export function redactBackup(backup: string): string {
  if (backup.length <= PARTIAL_VISIBLE_CHARS + 10) {
    return REDACTED;
  }
  const prefix = backup.slice(0, 20);
  return `${prefix}...${REDACTED} (${backup.length} chars)`;
}

// ---------------------------------------------------------------------------
// Witness redaction
// ---------------------------------------------------------------------------

export interface RedactedPreparedWitness {
  pool_id: string;
  root: string;
  nullifier_hash: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
  denomination: string;
  nullifier: string;
  secret: string;
  leaf_index: string;
  hash_path: string;
}

/**
 * Redact a PreparedWitness for safe logging.
 *
 * Public inputs (root, nullifier_hash, recipient, amount, relayer, fee,
 * pool_id, denomination) are partially visible for debugging.
 * Private inputs (nullifier, secret, hash_path) are fully redacted.
 */
export function redactPreparedWitness(witness: PreparedWitness): RedactedPreparedWitness {
  return {
    pool_id: truncateHex(witness.pool_id),
    root: truncateHex(witness.root),
    nullifier_hash: truncateHex(witness.nullifier_hash),
    recipient: truncateHex(witness.recipient),
    amount: witness.amount,
    relayer: witness.relayer,
    fee: witness.fee,
    denomination: witness.denomination,
    nullifier: REDACTED,
    secret: REDACTED,
    leaf_index: witness.leaf_index,
    hash_path: redactArray(witness.hash_path),
  };
}

/**
 * Stringify a redacted prepared witness for logging.
 */
export function redactPreparedWitnessToString(witness: PreparedWitness): string {
  const redacted = redactPreparedWitness(witness);
  return JSON.stringify(redacted);
}

/**
 * Redact a legacy WithdrawalWitness for safe logging.
 */
export function redactWithdrawalWitness(witness: WithdrawalWitness): Record<string, any> {
  return {
    root: truncateHex(witness.root),
    nullifier_hash: truncateHex(witness.nullifier_hash),
    recipient: truncateHex(witness.recipient),
    amount: witness.amount,
    relayer: witness.relayer,
    fee: witness.fee,
    pool_id: truncateHex(witness.pool_id),
    nullifier: REDACTED,
    secret: REDACTED,
    leaf_index: witness.leaf_index,
    path_elements: redactArray(witness.path_elements),
    path_indices: redactArray(witness.path_indices.map(String)),
  };
}

/**
 * Stringify a redacted withdrawal witness for logging.
 */
export function redactWithdrawalWitnessToString(witness: WithdrawalWitness): string {
  const redacted = redactWithdrawalWitness(witness);
  return JSON.stringify(redacted);
}

// ---------------------------------------------------------------------------
// Proof payload redaction
// ---------------------------------------------------------------------------

export interface RedactedProofSummary {
  proofLength: number;
  publicInputCount: number;
  publicInputBytesLength: number;
  publicInputsPreview: string;
}

/**
 * Redact a proof payload for safe logging.
 *
 * Only structural metadata (lengths, counts) are exposed.
 * The actual proof bytes and public input values are not printed verbatim.
 */
export function redactProof(proof: {
  proof: Uint8Array;
  publicInputs: string[];
  publicInputBytes: Uint8Array;
}): RedactedProofSummary {
  return {
    proofLength: proof.proof.length,
    publicInputCount: proof.publicInputs.length,
    publicInputBytesLength: proof.publicInputBytes.length,
    publicInputsPreview: redactArray(proof.publicInputs, 1),
  };
}

/**
 * Stringify a redacted proof summary for logging.
 */
export function redactProofToString(proof: {
  proof: Uint8Array;
  publicInputs: string[];
  publicInputBytes: Uint8Array;
}): string {
  const redacted = redactProof(proof);
  return JSON.stringify(redacted);
}

/**
 * Redact raw proof bytes for safe logging.
 */
export function redactProofBytes(proofBytes: Uint8Array, label: string = 'proof'): string {
  return `${label}: ${proofBytes.length} bytes ${REDACTED}`;
}

// ---------------------------------------------------------------------------
// Generic sensitive field redaction
// ---------------------------------------------------------------------------

/**
 * Redact a map of sensitive fields, keeping only safe keys visible.
 *
 * @param data The data object to redact
 * @param sensitiveKeys Keys that should be fully redacted
 * @param partialKeys Keys that should be partially visible (truncated)
 */
export function redactFields(
  data: Record<string, any>,
  sensitiveKeys: string[] = [],
  partialKeys: string[] = []
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.includes(key)) {
      result[key] = REDACTED;
    } else if (partialKeys.includes(key) && typeof value === 'string') {
      result[key] = truncateHex(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

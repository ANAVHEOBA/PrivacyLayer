import { createHash, randomBytes } from 'crypto';
import {
  LEGACY_NOTE_AMOUNT_SLOT_BYTES,
  NOTE_AMOUNT_BYTES,
  NOTE_BACKUP_CHECKSUM_OFFSET,
  NOTE_BACKUP_PAYLOAD_LENGTH,
  NOTE_BACKUP_PREFIX,
  NOTE_BACKUP_VERSION,
  NOTE_CHECKSUM_BYTES,
  ZK_FIELD_BYTES,
  ZK_NOTE_SCALAR_BYTES,
  ZK_POOL_ID_BYTES,
} from './constants';

// ---------------------------------------------------------------------------
// Backup format constants
// ---------------------------------------------------------------------------

// Payload layout (107 bytes):
//   version    1 byte
//   nullifier 31 bytes
//   secret    31 bytes
//   poolId    32 bytes
//   amount     8 bytes  (BigUInt64BE)
//   checksum   4 bytes  (first 4 bytes of SHA-256 over all preceding bytes)

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Structured error returned when a note backup cannot be imported.
 */
export class NoteBackupError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_PREFIX'
      | 'INVALID_VERSION'
      | 'INVALID_LENGTH'
      | 'CORRUPT_DATA'
      | 'CHECKSUM_MISMATCH'
  ) {
    super(message);
    this.name = 'NoteBackupError';
  }
}

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

/**
 * PrivacyLayer Note
 *
 * Represents a private "IOU" in the shielded pool.
 * A note consists of a nullifier (revealed on withdrawal) and a secret (never revealed).
 * The commitment = Hash(nullifier, secret) is what's stored in the Merkle tree.
 */
export class Note {
  constructor(
    public readonly nullifier: Buffer,
    public readonly secret: Buffer,
    public readonly poolId: string,
    public readonly amount: bigint
  ) {
    if (nullifier.length !== ZK_NOTE_SCALAR_BYTES || secret.length !== ZK_NOTE_SCALAR_BYTES) {
      throw new Error(`Nullifier and secret must be ${ZK_NOTE_SCALAR_BYTES} bytes to fit BN254 field`);
    }
  }

  /**
   * Create a new random note for a specific pool.
   */
  static generate(poolId: string, amount: bigint): Note {
    return new Note(randomBytes(ZK_NOTE_SCALAR_BYTES), randomBytes(ZK_NOTE_SCALAR_BYTES), poolId, amount);
  }

  /**
   * In a real implementation, this would use a WASM-based Poseidon hash
   * compatible with the Noir circuit and Soroban host function.
   */
  getCommitment(): Buffer {
    // Placeholder: In production, use @noir-lang/barretenberg or similar
    // for Poseidon(nullifier, secret)
    return Buffer.alloc(ZK_FIELD_BYTES);
  }

  // ---------------------------------------------------------------------------
  // Backup API (stable, versioned, integrity-checked)
  // ---------------------------------------------------------------------------

  /**
   * Export this note as a portable backup string.
   *
   * Format: `privacylayer-note:<hex>`
   * Payload (107 bytes):
   *   [0]      version byte (0x01)
   *   [1..31]  nullifier (31 bytes)
   *   [32..62] secret    (31 bytes)
   *   [63..94] poolId    (32 bytes, decoded from hex)
   *   [95..102] amount   (8 bytes, BigUInt64BE)
   *   [103..106] SHA-256 checksum over bytes [0..102] (first 4 bytes)
   */
  exportBackup(): string {
    const payload = Buffer.alloc(NOTE_BACKUP_PAYLOAD_LENGTH);
    let offset = 0;

    payload[offset++] = NOTE_BACKUP_VERSION;
    note_nullifier: {
      this.nullifier.copy(payload, offset);
      offset += ZK_NOTE_SCALAR_BYTES;
    }
    note_secret: {
      this.secret.copy(payload, offset);
      offset += ZK_NOTE_SCALAR_BYTES;
    }
    note_poolid: {
      Buffer.from(this.poolId, 'hex').copy(payload, offset);
      offset += ZK_POOL_ID_BYTES;
    }
    payload.writeBigUInt64BE(this.amount, offset);
    offset += NOTE_AMOUNT_BYTES;

    const checksum = createHash('sha256').update(payload.subarray(0, offset)).digest();
    checksum.copy(payload, offset, 0, NOTE_CHECKSUM_BYTES);

    return NOTE_BACKUP_PREFIX + payload.toString('hex');
  }

  /**
   * Import a note from a backup string produced by `exportBackup`.
   *
   * Throws `NoteBackupError` with a typed `code` field on any validation failure:
   * - `INVALID_PREFIX`   — string does not start with the expected prefix
   * - `INVALID_LENGTH`   — payload is not exactly 107 bytes
   * - `INVALID_VERSION`  — version byte is not recognised
   * - `CHECKSUM_MISMATCH` — integrity check failed (truncated or corrupt data)
   * - `CORRUPT_DATA`     — the hex payload could not be parsed
   */
  static importBackup(backup: string): Note {
    if (!backup.startsWith(NOTE_BACKUP_PREFIX)) {
      throw new NoteBackupError(
        `Note backup must start with "${NOTE_BACKUP_PREFIX}"`,
        'INVALID_PREFIX'
      );
    }

    const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
    let payload: Buffer;
    try {
      payload = Buffer.from(hex, 'hex');
    } catch {
      throw new NoteBackupError('Note backup contains invalid hex data', 'CORRUPT_DATA');
    }

    if (payload.length !== NOTE_BACKUP_PAYLOAD_LENGTH) {
      throw new NoteBackupError(
        `Note backup payload must be ${NOTE_BACKUP_PAYLOAD_LENGTH} bytes, got ${payload.length}`,
        'INVALID_LENGTH'
      );
    }

    const version = payload[0];
    if (version !== NOTE_BACKUP_VERSION) {
      throw new NoteBackupError(
        `Unsupported note backup version: ${version} (expected ${NOTE_BACKUP_VERSION})`,
        'INVALID_VERSION'
      );
    }

    // Verify checksum over all bytes before the checksum suffix.
    const storedChecksum = payload.subarray(NOTE_BACKUP_CHECKSUM_OFFSET, NOTE_BACKUP_PAYLOAD_LENGTH);
    const computed = createHash('sha256').update(payload.subarray(0, NOTE_BACKUP_CHECKSUM_OFFSET)).digest();
    if (!computed.subarray(0, NOTE_CHECKSUM_BYTES).equals(storedChecksum)) {
      throw new NoteBackupError(
        'Note backup checksum mismatch: data may be corrupt or truncated',
        'CHECKSUM_MISMATCH'
      );
    }

    let offset = 1;
    const nullifier = Buffer.from(payload.subarray(offset, offset + ZK_NOTE_SCALAR_BYTES));
    offset += ZK_NOTE_SCALAR_BYTES;
    const secret = Buffer.from(payload.subarray(offset, offset + ZK_NOTE_SCALAR_BYTES));
    offset += ZK_NOTE_SCALAR_BYTES;
    const poolId = payload.subarray(offset, offset + ZK_POOL_ID_BYTES).toString('hex');
    offset += ZK_POOL_ID_BYTES;
    const amount = payload.readBigUInt64BE(offset);

    return new Note(nullifier, secret, poolId, amount);
  }

  // ---------------------------------------------------------------------------
  // Legacy serialization (kept for backward compatibility)
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Use `exportBackup` for new code.
   */
  serialize(): string {
    const data = Buffer.concat([
      this.nullifier,
      this.secret,
      Buffer.from(this.poolId, 'hex'),
      Buffer.alloc(LEGACY_NOTE_AMOUNT_SLOT_BYTES), // amount padding
    ]);
    const amountOffset = ZK_NOTE_SCALAR_BYTES + ZK_NOTE_SCALAR_BYTES + ZK_POOL_ID_BYTES;
    data.writeBigUInt64BE(this.amount, amountOffset);
    return `privacylayer-note-${data.toString('hex')}`;
  }

  /**
   * @deprecated Use `Note.importBackup` for new code.
   */
  static deserialize(noteStr: string): Note {
    if (!noteStr.startsWith('privacylayer-note-')) {
      throw new Error('Invalid note format');
    }
    const hex = noteStr.replace('privacylayer-note-', '');
    const data = Buffer.from(hex, 'hex');

    let offset = 0;
    const nullifier = data.subarray(offset, offset + ZK_NOTE_SCALAR_BYTES);
    offset += ZK_NOTE_SCALAR_BYTES;
    const secret = data.subarray(offset, offset + ZK_NOTE_SCALAR_BYTES);
    offset += ZK_NOTE_SCALAR_BYTES;
    const poolId = data.subarray(offset, offset + ZK_POOL_ID_BYTES).toString('hex');
    offset += ZK_POOL_ID_BYTES;
    const amount = data.readBigUInt64BE(offset);

    return new Note(nullifier, secret, poolId, amount);
  }
}

import { createHash, randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Backup format constants
// ---------------------------------------------------------------------------

const BACKUP_VERSION = 0x01;
const BACKUP_PREFIX = 'privacylayer-note:';

// Payload layout (107 bytes):
//   version    1 byte
//   nullifier 31 bytes
//   secret    31 bytes
//   poolId    32 bytes
//   amount     8 bytes  (BigUInt64BE)
//   checksum   4 bytes  (first 4 bytes of SHA-256 over all preceding bytes)
const BACKUP_PAYLOAD_LENGTH = 107;

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
    if (nullifier.length !== 31 || secret.length !== 31) {
      throw new Error('Nullifier and secret must be 31 bytes to fit BN254 field');
    }
  }

  /**
   * Create a new random note for a specific pool.
   */
  static generate(poolId: string, amount: bigint): Note {
    return new Note(randomBytes(31), randomBytes(31), poolId, amount);
  }

  /**
   * In a real implementation, this would use a WASM-based Poseidon hash
   * compatible with the Noir circuit and Soroban host function.
   *
   * Preimage: [nullifier, secret, poolId]
   */
  getCommitment(): Buffer {
    // Structural stand-in for Poseidon(nullifier, secret, poolId)
    // In production, use @noir-lang/barretenberg for the real BN254 Poseidon.
    const input = Buffer.concat([
      this.nullifier,
      this.secret,
      Buffer.from(this.poolId, 'hex'),
    ]);
    return createHash('sha256').update(input).digest();
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
    const payload = Buffer.alloc(BACKUP_PAYLOAD_LENGTH);
    let offset = 0;

    payload[offset++] = BACKUP_VERSION;
    note_nullifier: {
      this.nullifier.copy(payload, offset);
      offset += 31;
    }
    note_secret: {
      this.secret.copy(payload, offset);
      offset += 31;
    }
    note_poolid: {
      Buffer.from(this.poolId, 'hex').copy(payload, offset);
      offset += 32;
    }
    payload.writeBigUInt64BE(this.amount, offset);
    offset += 8;

    const checksum = createHash('sha256').update(payload.subarray(0, offset)).digest();
    checksum.copy(payload, offset, 0, 4);

    return BACKUP_PREFIX + payload.toString('hex');
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
    if (!backup.startsWith(BACKUP_PREFIX)) {
      throw new NoteBackupError(
        `Note backup must start with "${BACKUP_PREFIX}"`,
        'INVALID_PREFIX'
      );
    }

    const hex = backup.slice(BACKUP_PREFIX.length);
    let payload: Buffer;
    try {
      payload = Buffer.from(hex, 'hex');
    } catch {
      throw new NoteBackupError('Note backup contains invalid hex data', 'CORRUPT_DATA');
    }

    if (payload.length !== BACKUP_PAYLOAD_LENGTH) {
      throw new NoteBackupError(
        `Note backup payload must be ${BACKUP_PAYLOAD_LENGTH} bytes, got ${payload.length}`,
        'INVALID_LENGTH'
      );
    }

    const version = payload[0];
    if (version !== BACKUP_VERSION) {
      throw new NoteBackupError(
        `Unsupported note backup version: ${version} (expected ${BACKUP_VERSION})`,
        'INVALID_VERSION'
      );
    }

    // Verify checksum over bytes [0..102]
    const storedChecksum = payload.subarray(103, 107);
    const computed = createHash('sha256').update(payload.subarray(0, 103)).digest();
    if (!computed.subarray(0, 4).equals(storedChecksum)) {
      throw new NoteBackupError(
        'Note backup checksum mismatch: data may be corrupt or truncated',
        'CHECKSUM_MISMATCH'
      );
    }

    const nullifier = Buffer.from(payload.subarray(1, 32));
    const secret = Buffer.from(payload.subarray(32, 63));
    const poolId = payload.subarray(63, 95).toString('hex');
    const amount = payload.readBigUInt64BE(95);

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
      Buffer.alloc(16), // amount padding
    ]);
    data.writeBigUInt64BE(this.amount, 31 + 31 + 32);
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

    const nullifier = data.subarray(0, 31);
    const secret = data.subarray(31, 62);
    const poolId = data.subarray(62, 94).toString('hex');
    const amount = data.readBigUInt64BE(94);

    return new Note(nullifier, secret, poolId, amount);
  }
}

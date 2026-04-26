import { stableHash32 } from './stable';
import { createHash } from 'crypto';
import {
  NOTE_BACKUP_PAYLOAD_LENGTH,
  NOTE_BACKUP_PREFIX,
  NOTE_BACKUP_VERSION,
  NOTE_SCALAR_BYTE_LENGTH,
} from './zk_constants';
import { computeNoteCommitmentBytes } from './poseidon';

const HEX_PAYLOAD = /^[0-9a-fA-F]+$/;
const POOL_ID_HEX = /^[0-9a-fA-F]{64}$/;
const LEGACY_NOTE_PREFIX = 'privacylayer-note-';
const LEGACY_NOTE_PAYLOAD_LENGTH = NOTE_SCALAR_BYTE_LENGTH + NOTE_SCALAR_BYTE_LENGTH + 32 + 16;
const MAX_NOTE_AMOUNT = (1n << 64n) - 1n;

type CryptoLike = {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
};

export interface RandomnessSource {
  randomBytes(length: number): Uint8Array;
}

export interface RuntimeRandomnessSourceOptions {
  runtime?: { crypto?: CryptoLike };
  enableNodeFallback?: boolean;
}

// Payload layout (107 bytes):
//   version    1 byte
//   nullifier 31 bytes
//   secret    31 bytes
//   poolId    32 bytes
//   amount     8 bytes  (BigUInt64BE)
//   checksum   4 bytes  (first 4 bytes of SHA-256 over all preceding bytes)

function resolveRuntimeCrypto(options: RuntimeRandomnessSourceOptions = {}): CryptoLike {
  const runtime = options.runtime ?? (globalThis as RuntimeRandomnessSourceOptions['runtime']);
  if (runtime?.crypto && typeof runtime.crypto.getRandomValues === 'function') {
    return runtime.crypto;
  }

  if (options.enableNodeFallback !== false) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto') as { webcrypto?: CryptoLike };
      if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
        return nodeCrypto.webcrypto;
      }
    } catch {
      // Runtime does not support require('crypto')
    }
  }

  throw new Error(
    'Secure randomness unavailable: no crypto.getRandomValues implementation found in this runtime.'
  );
}

/**
 * RuntimeRandomnessSource uses secure randomness in browser and Node runtimes.
 */
export class RuntimeRandomnessSource implements RandomnessSource {
  private options: RuntimeRandomnessSourceOptions;

  constructor(options: RuntimeRandomnessSourceOptions = {}) {
    this.options = options;
  }

  randomBytes(length: number): Uint8Array {
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error(`Random byte length must be a positive integer, received: ${length}`);
    }
    const out = new Uint8Array(length);
    resolveRuntimeCrypto(this.options).getRandomValues(out);
    return out;
  }
}

let defaultRandomnessSource: RandomnessSource = new RuntimeRandomnessSource();

export function setDefaultRandomnessSource(source: RandomnessSource): void {
  defaultRandomnessSource = source;
}

export function resetDefaultRandomnessSource(): void {
  defaultRandomnessSource = new RuntimeRandomnessSource();
}

export class NoteBackupError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'NoteBackupError';
  }
}

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
    if (nullifier.length !== NOTE_SCALAR_BYTE_LENGTH || secret.length !== NOTE_SCALAR_BYTE_LENGTH) {
      throw new Error(`Nullifier and secret must be ${NOTE_SCALAR_BYTE_LENGTH} bytes to fit BN254 field`);
    }
    if (!POOL_ID_HEX.test(poolId)) {
      throw new Error('Pool ID must be exactly 32 bytes encoded as 64 hex characters');
    }
    if (amount < 0n || amount > MAX_NOTE_AMOUNT) {
      throw new Error(`Note amount must fit within an unsigned 64-bit integer, got ${amount}`);
    }
  }

  /**
   * Create a new random note for a specific pool.
   */
  static generate(poolId: string, amount: bigint, randomnessSource: RandomnessSource = defaultRandomnessSource): Note {
    return new Note(
      Buffer.from(randomnessSource.randomBytes(NOTE_SCALAR_BYTE_LENGTH)),
      Buffer.from(randomnessSource.randomBytes(NOTE_SCALAR_BYTE_LENGTH)),
      poolId,
      amount
    );
  }

  /**
   * Deterministic derivation for fixtures/testing only.
   * Keep this separate from production randomness.
   */
  static deriveDeterministic(seed: Uint8Array | Buffer | string, poolId: string, amount: bigint): Note {
    const seedBytes = typeof seed === 'string' ? Buffer.from(seed, 'utf8') : Buffer.from(seed);
    const nullifier = stableHash32('note-nullifier', seedBytes, poolId, amount).subarray(0, NOTE_SCALAR_BYTE_LENGTH);
    const secret = stableHash32('note-secret', seedBytes, poolId, amount).subarray(0, NOTE_SCALAR_BYTE_LENGTH);
    return new Note(Buffer.from(nullifier), Buffer.from(secret), poolId, amount);
  }

  /**
   * Commitment = Poseidon2(nullifier_field, secret_field, pool_id_field).
   * The nullifier/secret are first interpreted as 31-byte canonical field values.
   */
  getCommitment(): Buffer {
    return computeNoteCommitmentBytes(this.nullifier, this.secret, this.poolId);
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
    this.nullifier.copy(payload, offset);
    offset += NOTE_SCALAR_BYTE_LENGTH;
    this.secret.copy(payload, offset);
    offset += NOTE_SCALAR_BYTE_LENGTH;
    Buffer.from(this.poolId, 'hex').copy(payload, offset);
    offset += 32;
    payload.writeBigUInt64BE(this.amount, offset);
    offset += 8;

    const checksum = createHash('sha256').update(payload.subarray(0, offset)).digest();
    checksum.copy(payload, offset, 0, 4);

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
    if (!HEX_PAYLOAD.test(hex)) {
      throw new NoteBackupError('Note backup contains invalid hex data', 'CORRUPT_DATA');
    }
    if (hex.length !== NOTE_BACKUP_PAYLOAD_LENGTH * 2) {
      throw new NoteBackupError(
        `Note backup payload must be ${NOTE_BACKUP_PAYLOAD_LENGTH} bytes, got ${Math.floor(hex.length / 2)}`,
        'INVALID_LENGTH'
      );
    }

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
    return LEGACY_NOTE_PREFIX + data.toString('hex');
  }

  /**
   * @deprecated Use `Note.importBackup` for new code.
   */
  static deserialize(noteStr: string): Note {
    if (!noteStr.startsWith(LEGACY_NOTE_PREFIX)) {
      throw new Error('Invalid note format');
    }
    const hex = noteStr.slice(LEGACY_NOTE_PREFIX.length);
    if (!HEX_PAYLOAD.test(hex) || hex.length !== LEGACY_NOTE_PAYLOAD_LENGTH * 2) {
      throw new Error('Invalid note format');
    }
    const data = Buffer.from(hex, 'hex');

    const nullifier = data.subarray(0, 31);
    const secret = data.subarray(31, 62);
    const poolId = data.subarray(62, 94).toString('hex');
    const amount = data.readBigUInt64BE(94);

    return new Note(nullifier, secret, poolId, amount);
  }
}

/**
 * Backup and recovery utilities for PrivacyLayer notes.
 * @module @privacylayer/sdk/utils/backup
 */

import { type Note, Denomination } from '../types';
import { isValidNote, isValidHex } from './validation';

// ============================================================
// Types
// ============================================================

/**
 * Encrypted backup data structure.
 */
export interface EncryptedBackup {
  /** Version for future compatibility */
  version: number;
  /** Encryption algorithm used */
  algorithm: 'AES-256-GCM';
  /** Key derivation function used */
  kdf: 'PBKDF2';
  /** Salt for key derivation (base64) */
  salt: string;
  /** Iterations for PBKDF2 */
  iterations: number;
  /** Initialization vector (base64) */
  iv: string;
  /** Encrypted data (base64) */
  ciphertext: string;
  /** Authentication tag (base64) */
  authTag: string;
}

/**
 * Plain backup format for export (not encrypted).
 */
export interface PlainBackup {
  /** Backup format version */
  version: number;
  /** Creation timestamp */
  timestamp: number;
  /** Notes in the backup */
  notes: Note[];
  /** Optional metadata */
  metadata?: {
    /** Label for the backup */
    label?: string;
    /** Number of notes */
    count: number;
    /** Network name */
    network?: string;
  };
}

/**
 * Backup verification result.
 */
export interface BackupVerificationResult {
  /** Whether backup is valid */
  valid: boolean;
  /** Number of valid notes */
  validNotes: number;
  /** Number of invalid notes */
  invalidNotes: number;
  /** Errors found */
  errors: string[];
  /** Warnings */
  warnings: string[];
}

/**
 * Import result.
 */
export interface ImportResult {
  /** Successfully imported notes */
  imported: Note[];
  /** Failed notes with reasons */
  failed: Array<{ note: unknown; reason: string }>;
  /** Total notes processed */
  total: number;
}

// ============================================================
// Constants
// ============================================================

/** Current backup format version */
const BACKUP_VERSION = 1;

/** PBKDF2 iterations for key derivation */
const PBKDF2_ITERATIONS = 100000;

/** Salt length in bytes */
const SALT_LENGTH = 32;

/** IV length in bytes for AES-GCM */
const IV_LENGTH = 12;

/** Minimum password length */
const MIN_PASSWORD_LENGTH = 8;

// ============================================================
// Encryption Utilities
// ============================================================

/**
 * Derive an encryption key from a password using PBKDF2.
 * @param password - User password
 * @param salt - Salt for key derivation
 * @returns Derived key as CryptoKey
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to base64 string.
 * @param bytes - Bytes to encode
 * @returns Base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array.
 * @param base64 - Base64 string
 * @returns Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt notes with a password using AES-256-GCM.
 * @param notes - Notes to encrypt
 * @param password - Encryption password
 * @returns Encrypted backup data
 */
export async function encryptNotes(notes: Note[], password: string): Promise<EncryptedBackup> {
  // Validate password
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // Validate all notes
  for (const note of notes) {
    if (!isValidNote(note)) {
      throw new Error('Invalid note detected in backup');
    }
  }

  // Generate salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key
  const key = await deriveKey(password, salt);

  // Create backup data
  const backup: PlainBackup = {
    version: BACKUP_VERSION,
    timestamp: Math.floor(Date.now() / 1000),
    notes,
    metadata: {
      count: notes.length,
    },
  };

  // Encrypt
  const plaintext = new TextEncoder().encode(JSON.stringify(backup));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Split ciphertext and auth tag (AES-GCM appends 16-byte tag)
  const encrypted = new Uint8Array(ciphertext);
  const authTag = encrypted.slice(-16);
  const data = encrypted.slice(0, -16);

  return {
    version: BACKUP_VERSION,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2',
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(data),
    authTag: bytesToBase64(authTag),
  };
}

/**
 * Decrypt notes from an encrypted backup.
 * @param backup - Encrypted backup data
 * @param password - Decryption password
 * @returns Decrypted notes
 */
export async function decryptNotes(backup: EncryptedBackup, password: string): Promise<PlainBackup> {
  // Validate backup structure
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  if (backup.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported algorithm: ${backup.algorithm}`);
  }

  if (backup.kdf !== 'PBKDF2') {
    throw new Error(`Unsupported KDF: ${backup.kdf}`);
  }

  // Decode base64 values
  const salt = base64ToBytes(backup.salt);
  const iv = base64ToBytes(backup.iv);
  const ciphertext = base64ToBytes(backup.ciphertext);
  const authTag = base64ToBytes(backup.authTag);

  // Derive key
  const key = await deriveKey(password, salt);

  // Reconstruct ciphertext with auth tag
  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext, 0);
  encrypted.set(authTag, ciphertext.length);

  // Decrypt
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encrypted
    );

    const plaintext = new TextDecoder().decode(decrypted);
    const backup = JSON.parse(plaintext) as PlainBackup;

    // Validate decrypted backup
    if (!backup.notes || !Array.isArray(backup.notes)) {
      throw new Error('Invalid backup format: missing notes array');
    }

    return backup;
  } catch (error) {
    throw new Error('Decryption failed: incorrect password or corrupted backup');
  }
}

// ============================================================
// Export/Import Utilities
// ============================================================

/**
 * Export notes to a JSON string.
 * @param notes - Notes to export
 * @param metadata - Optional metadata
 * @returns JSON string
 */
export function exportNotesToJson(notes: Note[], metadata?: { label?: string; network?: string }): string {
  const backup: PlainBackup = {
    version: BACKUP_VERSION,
    timestamp: Math.floor(Date.now() / 1000),
    notes,
    metadata: {
      label: metadata?.label,
      network: metadata?.network,
      count: notes.length,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Import notes from a JSON string.
 * @param json - JSON string
 * @returns Import result
 */
export function importNotesFromJson(json: string): ImportResult {
  const result: ImportResult = {
    imported: [],
    failed: [],
    total: 0,
  };

  try {
    const data = JSON.parse(json);

    // Handle both array and backup object formats
    const notes: unknown[] = Array.isArray(data) ? data : (data.notes || [data]);
    result.total = notes.length;

    for (const note of notes) {
      if (isValidNote(note)) {
        result.imported.push(note);
      } else {
        result.failed.push({
          note,
          reason: 'Invalid note format or missing required fields',
        });
      }
    }
  } catch (error) {
    result.failed.push({
      note: json,
      reason: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Export encrypted backup to a downloadable string.
 * @param backup - Encrypted backup
 * @returns Base64 encoded backup string
 */
export function exportEncryptedBackup(backup: EncryptedBackup): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(backup)));
}

/**
 * Import encrypted backup from a base64 string.
 * @param data - Base64 encoded backup
 * @returns Encrypted backup object
 */
export function importEncryptedBackup(data: string): EncryptedBackup {
  try {
    const decoded = new TextDecoder().decode(base64ToBytes(data));
    const backup = JSON.parse(decoded) as EncryptedBackup;

    // Validate structure
    if (
      typeof backup.version !== 'number' ||
      typeof backup.algorithm !== 'string' ||
      typeof backup.ciphertext !== 'string'
    ) {
      throw new Error('Invalid encrypted backup structure');
    }

    return backup;
  } catch (error) {
    throw new Error(`Failed to parse encrypted backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================
// QR Code Utilities
// ============================================================

/**
 * Generate QR code data for a note.
 * Returns a compact format suitable for QR codes.
 * @param note - Note to encode
 * @returns Compact string for QR code
 */
export function noteToQRData(note: Note): string {
  // Compact format: base64 of JSON
  const compact = {
    n: note.nullifier,
    s: note.secret,
    c: note.commitment,
    d: note.denomination,
  };
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(compact)));
}

/**
 * Parse QR code data to a note.
 * @param data - QR code data string
 * @returns Parsed note or null if invalid
 */
export function qrDataToNote(data: string): Note | null {
  try {
    // Try base64 decode first
    let decoded: string;
    try {
      decoded = new TextDecoder().decode(base64ToBytes(data));
    } catch {
      // Maybe it's plain JSON
      decoded = data;
    }

    const parsed = JSON.parse(decoded);

    // Handle both compact and full formats
    const note: Note = {
      nullifier: parsed.n || parsed.nullifier,
      secret: parsed.s || parsed.secret,
      commitment: parsed.c || parsed.commitment,
      denomination: parsed.d || parsed.denomination,
    };

    if (isValidNote(note)) {
      return note;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generate QR code data for multiple notes.
 * @param notes - Notes to encode
 * @param password - Optional password for encryption
 * @returns QR code data string
 */
export async function notesToQRData(notes: Note[], password?: string): Promise<string> {
  if (password) {
    const encrypted = await encryptNotes(notes, password);
    return exportEncryptedBackup(encrypted);
  }

  // For small batches, use simple format
  if (notes.length <= 3) {
    const compact = notes.map(noteToQRData);
    return compact.join('|');
  }

  // For larger batches, use backup format
  return bytesToBase64(new TextEncoder().encode(exportNotesToJson(notes)));
}

// ============================================================
// Validation Utilities
// ============================================================

/**
 * Verify a backup's integrity and note validity.
 * @param backup - Backup to verify (plain or encrypted)
 * @param password - Password for encrypted backups
 * @returns Verification result
 */
export async function verifyBackup(
  backup: PlainBackup | EncryptedBackup,
  password?: string
): Promise<BackupVerificationResult> {
  const result: BackupVerificationResult = {
    valid: true,
    validNotes: 0,
    invalidNotes: 0,
    errors: [],
    warnings: [],
  };

  let notes: Note[];

  // Handle encrypted backup
  if ('ciphertext' in backup) {
    if (!password) {
      result.valid = false;
      result.errors.push('Password required for encrypted backup');
      return result;
    }

    try {
      const decrypted = await decryptNotes(backup, password);
      notes = decrypted.notes;
    } catch (error) {
      result.valid = false;
      result.errors.push(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  } else {
    notes = backup.notes;
  }

  // Validate each note
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    if (!isValidNote(note)) {
      result.invalidNotes++;
      result.errors.push(`Note ${i + 1}: Invalid format`);
      continue;
    }

    // Check denomination
    if (!Object.values(Denomination).includes(note.denomination)) {
      result.warnings.push(`Note ${i + 1}: Unusual denomination ${note.denomination}`);
    }

    // Check hex formats
    if (!isValidHex(note.nullifier, 32)) {
      result.invalidNotes++;
      result.errors.push(`Note ${i + 1}: Invalid nullifier format`);
      continue;
    }

    if (!isValidHex(note.secret, 32)) {
      result.invalidNotes++;
      result.errors.push(`Note ${i + 1}: Invalid secret format`);
      continue;
    }

    if (!isValidHex(note.commitment, 32)) {
      result.invalidNotes++;
      result.errors.push(`Note ${i + 1}: Invalid commitment format`);
      continue;
    }

    result.validNotes++;
  }

  // Update overall validity
  if (result.invalidNotes > 0) {
    result.valid = false;
  }

  return result;
}

/**
 * Check if a string is a valid backup format.
 * @param data - String to check
 * @returns Type of backup detected, or null if invalid
 */
export function detectBackupFormat(data: string): 'encrypted' | 'plain' | 'json' | null {
  try {
    const trimmed = data.trim();

    // Try as base64 encrypted backup
    try {
      const decoded = new TextDecoder().decode(base64ToBytes(trimmed));
      const parsed = JSON.parse(decoded);
      if (parsed.ciphertext && parsed.algorithm) {
        return 'encrypted';
      }
    } catch {}

    // Try as JSON
    const parsed = JSON.parse(trimmed);

    if (parsed.ciphertext && parsed.algorithm) {
      return 'encrypted';
    }

    if (parsed.notes && Array.isArray(parsed.notes)) {
      return 'plain';
    }

    if (Array.isArray(parsed)) {
      return 'json';
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================
// Password Strength
// ============================================================

/**
 * Check password strength.
 * @param password - Password to check
 * @returns Strength score (0-4) and feedback
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Normalize to 0-4
  score = Math.min(4, Math.floor(score));

  if (password.length < MIN_PASSWORD_LENGTH) {
    feedback.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters');
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters');
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Add numbers');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Add special characters');
  }

  return {
    score,
    feedback,
    isStrong: score >= 3,
  };
}
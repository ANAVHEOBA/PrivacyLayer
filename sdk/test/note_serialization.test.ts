/// <reference types="jest" />
import { Note, NoteBackupError } from '../src/note';
import { NOTE_BACKUP_PAYLOAD_LENGTH, NOTE_BACKUP_PREFIX, DEFAULT_DENOMINATION, DENOMINATION_1000_XLM } from '../src/zk_constants';

const POOL = '11'.repeat(32);
const NUL = Buffer.from('01'.repeat(31), 'hex');
const SEC = Buffer.from('02'.repeat(31), 'hex');

function baseNote(amount = DEFAULT_DENOMINATION, denomination = DEFAULT_DENOMINATION): Note {
  return new Note(NUL, SEC, POOL, amount, denomination);
}

describe('Versioned note serialization with integrity checks (ZK-014)', () => {
  describe('Round-trip fidelity', () => {
    it('exports and imports a note with default denomination (0n)', () => {
      const original = new Note(NUL, SEC, POOL, 1000n, 0n);
      const restored = Note.importBackup(original.exportBackup());

      expect(restored.nullifier).toEqual(original.nullifier);
      expect(restored.secret).toEqual(original.secret);
      expect(restored.poolId).toBe(original.poolId);
      expect(restored.amount).toBe(original.amount);
      expect(restored.denomination).toBe(original.denomination);
    });

    it('round-trips a note with non-zero denomination', () => {
      const original = baseNote(DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const restored = Note.importBackup(original.exportBackup());

      expect(restored.denomination).toBe(DEFAULT_DENOMINATION);
      expect(restored.amount).toBe(DEFAULT_DENOMINATION);
    });

    it('round-trips notes with distinct amount and denomination', () => {
      const original = new Note(NUL, SEC, POOL, DENOMINATION_1000_XLM, DEFAULT_DENOMINATION);
      const restored = Note.importBackup(original.exportBackup());

      expect(restored.amount).toBe(DENOMINATION_1000_XLM);
      expect(restored.denomination).toBe(DEFAULT_DENOMINATION);
    });

    it('commitment is preserved through the backup round-trip', () => {
      const original = baseNote();
      const restored = Note.importBackup(original.exportBackup());
      expect(restored.getCommitment()).toEqual(original.getCommitment());
    });

    it('backup string is the expected prefix + hex length', () => {
      const backup = baseNote().exportBackup();
      expect(backup.startsWith(NOTE_BACKUP_PREFIX)).toBe(true);
      const hexLen = backup.slice(NOTE_BACKUP_PREFIX.length).length;
      expect(hexLen).toBe(NOTE_BACKUP_PAYLOAD_LENGTH * 2);
    });
  });

  describe('Versioning', () => {
    it('exported backup carries version byte 0x01', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
      const versionByte = parseInt(hex.slice(0, 2), 16);
      expect(versionByte).toBe(0x01);
    });

    it('importBackup rejects version byte 0x00', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
      const corrupted = NOTE_BACKUP_PREFIX + '00' + hex.slice(2);
      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
      try {
        Note.importBackup(corrupted);
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('INVALID_VERSION');
      }
    });

    it('importBackup rejects version byte 0x02', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
      const corrupted = NOTE_BACKUP_PREFIX + '02' + hex.slice(2);
      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
    });
  });

  describe('Integrity checksum', () => {
    it('detects single-bit corruption anywhere in the payload', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);

      // Flip a bit in the middle of the payload (nullifier region)
      const bytePos = 10;
      const original = parseInt(hex.slice(bytePos * 2, bytePos * 2 + 2), 16);
      const flipped = (original ^ 0x01).toString(16).padStart(2, '0');
      const corrupted = NOTE_BACKUP_PREFIX + hex.slice(0, bytePos * 2) + flipped + hex.slice(bytePos * 2 + 2);

      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
      try {
        Note.importBackup(corrupted);
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('CHECKSUM_MISMATCH');
      }
    });

    it('detects corruption in the denomination field', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);

      // denomination is at bytes [103..110]
      const bytePos = 103;
      const original = parseInt(hex.slice(bytePos * 2, bytePos * 2 + 2), 16);
      const flipped = ((original + 1) & 0xff).toString(16).padStart(2, '0');
      const corrupted = NOTE_BACKUP_PREFIX + hex.slice(0, bytePos * 2) + flipped + hex.slice(bytePos * 2 + 2);

      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
    });
  });
});

describe('Harden note deserialization (ZK-015)', () => {
  describe('Structural validation — prefix', () => {
    it('rejects a string with wrong prefix', () => {
      expect(() => Note.importBackup('wrong-prefix:' + 'aa'.repeat(115))).toThrow(NoteBackupError);
      try {
        Note.importBackup('wrong-prefix:' + 'aa'.repeat(115));
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('INVALID_PREFIX');
      }
    });

    it('rejects an empty string', () => {
      expect(() => Note.importBackup('')).toThrow(NoteBackupError);
    });

    it('rejects the correct prefix with no hex payload', () => {
      expect(() => Note.importBackup(NOTE_BACKUP_PREFIX)).toThrow(NoteBackupError);
    });
  });

  describe('Structural validation — payload length', () => {
    it('rejects a payload that is 1 byte too short', () => {
      const hex = 'ab'.repeat(NOTE_BACKUP_PAYLOAD_LENGTH - 1);
      expect(() => Note.importBackup(NOTE_BACKUP_PREFIX + hex)).toThrow(NoteBackupError);
      try {
        Note.importBackup(NOTE_BACKUP_PREFIX + hex);
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('INVALID_LENGTH');
      }
    });

    it('rejects a payload that is 1 byte too long', () => {
      const hex = 'ab'.repeat(NOTE_BACKUP_PAYLOAD_LENGTH + 1);
      expect(() => Note.importBackup(NOTE_BACKUP_PREFIX + hex)).toThrow(NoteBackupError);
      try {
        Note.importBackup(NOTE_BACKUP_PREFIX + hex);
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('INVALID_LENGTH');
      }
    });

    it('rejects a completely empty hex payload', () => {
      expect(() => Note.importBackup(NOTE_BACKUP_PREFIX + '')).toThrow(NoteBackupError);
    });

    it('rejects a truncated legacy-length payload (107 bytes)', () => {
      const hex = 'ab'.repeat(107);
      expect(() => Note.importBackup(NOTE_BACKUP_PREFIX + hex)).toThrow(NoteBackupError);
    });
  });

  describe('Structural validation — hex encoding', () => {
    it('rejects non-hex characters in the payload', () => {
      const bad = NOTE_BACKUP_PREFIX + 'zz'.repeat(NOTE_BACKUP_PAYLOAD_LENGTH);
      expect(() => Note.importBackup(bad)).toThrow(NoteBackupError);
      try {
        Note.importBackup(bad);
      } catch (e) {
        expect((e as NoteBackupError).code).toBe('CORRUPT_DATA');
      }
    });

    it('rejects a payload with mixed valid hex and non-hex characters', () => {
      const validHex = 'ab'.repeat(NOTE_BACKUP_PAYLOAD_LENGTH - 1);
      const bad = NOTE_BACKUP_PREFIX + validHex + 'XY';
      expect(() => Note.importBackup(bad)).toThrow(NoteBackupError);
    });
  });

  describe('Distinguishable error codes', () => {
    it('prefix failure uses INVALID_PREFIX code', () => {
      try {
        Note.importBackup('garbage');
      } catch (e) {
        expect(e).toBeInstanceOf(NoteBackupError);
        expect((e as NoteBackupError).code).toBe('INVALID_PREFIX');
      }
    });

    it('length failure uses INVALID_LENGTH code', () => {
      try {
        Note.importBackup(NOTE_BACKUP_PREFIX + 'ab'.repeat(10));
      } catch (e) {
        expect(e).toBeInstanceOf(NoteBackupError);
        expect((e as NoteBackupError).code).toBe('INVALID_LENGTH');
      }
    });

    it('checksum failure uses CHECKSUM_MISMATCH code', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
      // Corrupt the last byte of the data (before checksum) — at byte index dataLen-1
      const dataLen = NOTE_BACKUP_PAYLOAD_LENGTH - 4;
      const bytePos = dataLen - 1;
      const original = parseInt(hex.slice(bytePos * 2, bytePos * 2 + 2), 16);
      const flipped = ((original ^ 0xff) & 0xff).toString(16).padStart(2, '0');
      const corrupted = NOTE_BACKUP_PREFIX + hex.slice(0, bytePos * 2) + flipped + hex.slice(bytePos * 2 + 2);

      try {
        Note.importBackup(corrupted);
      } catch (e) {
        expect(e).toBeInstanceOf(NoteBackupError);
        expect((e as NoteBackupError).code).toBe('CHECKSUM_MISMATCH');
      }
    });

    it('version failure uses INVALID_VERSION code', () => {
      const backup = baseNote().exportBackup();
      const hex = backup.slice(NOTE_BACKUP_PREFIX.length);
      const badVersion = NOTE_BACKUP_PREFIX + 'ff' + hex.slice(2);
      try {
        Note.importBackup(badVersion);
      } catch (e) {
        expect(e).toBeInstanceOf(NoteBackupError);
        expect((e as NoteBackupError).code).toBe('INVALID_VERSION');
      }
    });

    it('NoteBackupError is an instance of Error', () => {
      try {
        Note.importBackup('bad');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(NoteBackupError);
        expect((e as NoteBackupError).name).toBe('NoteBackupError');
      }
    });
  });

  describe('Rejection before witness generation', () => {
    it('importBackup fails fast before any field operations are attempted', () => {
      // A structurally invalid backup should throw before it can produce
      // any field-level data that could be used in witness preparation.
      const invalid = NOTE_BACKUP_PREFIX + 'zz'.repeat(NOTE_BACKUP_PAYLOAD_LENGTH);
      expect(() => Note.importBackup(invalid)).toThrow(NoteBackupError);
    });
  });
});

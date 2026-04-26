/// <reference types="jest" />
import { createHash } from 'crypto';
import { Note, NoteBackupError } from '../src/note';
import { NOTE_BACKUP_PAYLOAD_LENGTH, NOTE_BACKUP_PREFIX, NOTE_BACKUP_VERSION } from '../src/zk_constants';

const poolId = '12'.repeat(32);

function makeNote(): Note {
  return Note.deriveDeterministic('note-deserialization-hardening', poolId, 12345n);
}

function expectBackupError(fn: () => unknown, code: string): void {
  try {
    fn();
    throw new Error('expected NoteBackupError');
  } catch (error) {
    expect(error).toBeInstanceOf(NoteBackupError);
    expect((error as NoteBackupError).code).toBe(code);
  }
}

function withRecomputedChecksum(mutator: (payload: Buffer) => void): string {
  const payload = Buffer.from(makeNote().exportBackup().slice(NOTE_BACKUP_PREFIX.length), 'hex');
  mutator(payload);
  const checksum = createHash('sha256').update(payload.subarray(0, 103)).digest();
  checksum.copy(payload, 103, 0, 4);
  return NOTE_BACKUP_PREFIX + payload.toString('hex');
}

describe('note deserialization hardening', () => {
  it('round-trips only the canonical lowercase backup string produced by exportBackup', () => {
    const note = makeNote();
    const backup = note.exportBackup();

    expect(backup).toMatch(new RegExp(`^${NOTE_BACKUP_PREFIX}[0-9a-f]{${NOTE_BACKUP_PAYLOAD_LENGTH * 2}}$`));
    expect(Note.importBackup(backup).serialize()).toBe(note.serialize());
  });

  it('rejects uppercase and otherwise hand-edited hex as non-canonical structure', () => {
    const backup = makeNote().exportBackup();
    const upper = NOTE_BACKUP_PREFIX + backup.slice(NOTE_BACKUP_PREFIX.length).toUpperCase();

    expectBackupError(() => Note.importBackup(upper), 'CORRUPT_DATA');
    expectBackupError(() => Note.importBackup(`${backup}00`), 'INVALID_LENGTH');
    expectBackupError(() => Note.importBackup(`${NOTE_BACKUP_PREFIX}0g`), 'CORRUPT_DATA');
  });

  it('distinguishes checksum failure from unsupported but checksum-valid versions', () => {
    const staleChecksum = Buffer.from(makeNote().exportBackup().slice(NOTE_BACKUP_PREFIX.length), 'hex');
    staleChecksum[0] = NOTE_BACKUP_VERSION + 1;
    expectBackupError(
      () => Note.importBackup(NOTE_BACKUP_PREFIX + staleChecksum.toString('hex')),
      'CHECKSUM_MISMATCH'
    );

    const recomputed = withRecomputedChecksum((payload) => {
      payload[0] = NOTE_BACKUP_VERSION + 1;
    });
    expectBackupError(() => Note.importBackup(recomputed), 'INVALID_VERSION');
  });

  it('rejects malformed pool identifiers before witness material can be used', () => {
    const malformedPool = withRecomputedChecksum((payload) => {
      payload.fill(0, 63, 95);
    });

    expectBackupError(() => Note.importBackup(malformedPool), 'INVALID_POOL_ID');
  });

  it('rejects legacy note strings with ambiguous amount padding', () => {
    const legacy = Buffer.from(makeNote().serialize().slice('privacylayer-note-'.length), 'hex');
    legacy[105] = 1;

    expect(() => Note.deserialize('privacylayer-note-' + legacy.toString('hex'))).toThrow(
      'Invalid note amount encoding'
    );
  });
});

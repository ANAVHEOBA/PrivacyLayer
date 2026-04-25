import { randomBytes } from 'crypto';
import {
  LEGACY_NOTE_AMOUNT_SLOT_BYTES,
  MERKLE_MAX_LEAF_INDEX,
  MERKLE_TREE_DEPTH,
  NOTE_AMOUNT_BYTES,
  NOTE_BACKUP_CHECKSUM_OFFSET,
  NOTE_BACKUP_PAYLOAD_LENGTH,
  NOTE_BACKUP_PREFIX,
  NOTE_BACKUP_VERSION,
  NOTE_CHECKSUM_BYTES,
  Note,
  ZERO_RELAYER_STELLAR_ADDRESS,
  ZK_FIELD_BYTES,
  ZK_MAX_LEAF_INDEX,
  ZK_NOTE_SCALAR_BYTES,
  ZK_POOL_ID_BYTES,
  ZK_TREE_DEPTH,
} from '../src';
import { ProofGenerator } from '../src/proof';

const RECIPIENT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('shared ZK constants', () => {
  test('central constants define SDK Merkle aliases', () => {
    expect(MERKLE_TREE_DEPTH).toBe(ZK_TREE_DEPTH);
    expect(MERKLE_MAX_LEAF_INDEX).toBe(ZK_MAX_LEAF_INDEX);
    expect(ZK_TREE_DEPTH).toBe(20);
    expect(ZK_MAX_LEAF_INDEX).toBe(2 ** ZK_TREE_DEPTH - 1);
  });

  test('note backup layout is derived from protocol byte widths', () => {
    expect(NOTE_BACKUP_VERSION).toBe(1);
    expect(NOTE_BACKUP_PREFIX).toBe('privacylayer-note:');
    expect(NOTE_BACKUP_CHECKSUM_OFFSET).toBe(
      1 + ZK_NOTE_SCALAR_BYTES + ZK_NOTE_SCALAR_BYTES + ZK_POOL_ID_BYTES + NOTE_AMOUNT_BYTES
    );
    expect(NOTE_BACKUP_PAYLOAD_LENGTH).toBe(NOTE_BACKUP_CHECKSUM_OFFSET + NOTE_CHECKSUM_BYTES);
    expect(LEGACY_NOTE_AMOUNT_SLOT_BYTES).toBeGreaterThanOrEqual(NOTE_AMOUNT_BYTES);
  });

  test('note generation and backup import use shared byte widths', () => {
    const note = Note.generate('11'.repeat(ZK_POOL_ID_BYTES), 42n);
    expect(note.nullifier).toHaveLength(ZK_NOTE_SCALAR_BYTES);
    expect(note.secret).toHaveLength(ZK_NOTE_SCALAR_BYTES);
    expect(note.getCommitment()).toHaveLength(ZK_FIELD_BYTES);

    const backup = note.exportBackup();
    const encodedPayload = backup.slice(NOTE_BACKUP_PREFIX.length);
    expect(Buffer.from(encodedPayload, 'hex')).toHaveLength(NOTE_BACKUP_PAYLOAD_LENGTH);

    const imported = Note.importBackup(backup);
    expect(imported.nullifier).toHaveLength(ZK_NOTE_SCALAR_BYTES);
    expect(imported.secret).toHaveLength(ZK_NOTE_SCALAR_BYTES);
    expect(imported.poolId).toBe(note.poolId);
    expect(imported.amount).toBe(note.amount);
  });

  test('default zero relayer constant is used for zero-fee witnesses', async () => {
    const note = new Note(randomBytes(ZK_NOTE_SCALAR_BYTES), randomBytes(ZK_NOTE_SCALAR_BYTES), '22'.repeat(ZK_POOL_ID_BYTES), 7n);
    const merkleProof = {
      root: Buffer.alloc(ZK_FIELD_BYTES),
      pathElements: Array.from({ length: ZK_TREE_DEPTH }, () => Buffer.alloc(ZK_FIELD_BYTES)),
      leafIndex: 0,
    };

    const explicit = await ProofGenerator.prepareWitness(note, merkleProof, RECIPIENT, ZERO_RELAYER_STELLAR_ADDRESS, 0n);
    const implicit = await ProofGenerator.prepareWitness(note, merkleProof, RECIPIENT);

    expect(implicit.relayer).toBe(explicit.relayer);
    expect(implicit.fee).toBe('0');
  });
});

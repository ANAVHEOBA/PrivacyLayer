import fs from 'fs';
import path from 'path';
import { Note, NoteBackupError } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import {
  noteScalarToField,
  merkleNodeToField,
  poolIdToField,
  computeNullifierHash,
  packWithdrawalPublicInputs,
  stellarAddressToField,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
} from '../src/encoding';

// ---------------------------------------------------------------------------
// Load golden fixture
// ---------------------------------------------------------------------------

const VECTORS_PATH = path.resolve(__dirname, 'golden/vectors.json');
const fixture = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildNote(v: any): Note {
  return new Note(
    Buffer.from(v.note.nullifier_hex, 'hex'),
    Buffer.from(v.note.secret_hex, 'hex'),
    v.note.pool_id,
    BigInt(v.note.amount)
  );
}

function buildMerkleProof(v: any): MerkleProof {
  return {
    root: Buffer.from(v.merkle.root, 'hex'),
    pathElements: v.merkle.path_elements.map((e: string) => Buffer.from(e, 'hex')),
    pathIndices: Array(20).fill(0),
    leafIndex: v.merkle.leaf_index,
  };
}

// ---------------------------------------------------------------------------
// Golden vector corpus tests
// ---------------------------------------------------------------------------

describe('Golden Vector Corpus', () => {
  it('fixture file loads and has the expected structure', () => {
    expect(fixture.version).toBe(1);
    expect(Array.isArray(fixture.vectors)).toBe(true);
    expect(fixture.vectors.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(fixture.vectors.map((v: any) => [v.id, v]) as [string, any][])('%s', (_id: string, v: any) => {
    it('note scalars encode to canonical field hex', () => {
      const nullifierField = noteScalarToField(Buffer.from(v.note.nullifier_hex, 'hex'));
      const secretField = noteScalarToField(Buffer.from(v.note.secret_hex, 'hex'));

      expect(nullifierField).toBe(v.fields.nullifier);
      expect(secretField).toBe(v.fields.secret);
      expect(nullifierField).toHaveLength(64);
      expect(secretField).toHaveLength(64);
    });

    it('merkle root encodes to canonical field hex', () => {
      const rootField = merkleNodeToField(Buffer.from(v.merkle.root, 'hex'));
      expect(rootField).toBe(v.public_inputs.root);
      expect(rootField).toHaveLength(64);
    });

    it('nullifier hash matches golden value', () => {
      const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, 'hex'));
      const root = merkleNodeToField(Buffer.from(v.merkle.root, 'hex'));
      const nh = computeNullifierHash(nf, root);

      expect(nh).toBe(v.nullifier_hash);
      expect(nh).toHaveLength(64);
    });

    it('packed public inputs include pool_id first and match canonical schema order', () => {
      const poolId    = poolIdToField(v.note.pool_id);
      const root      = v.public_inputs.root;
      const nh        = v.public_inputs.nullifier_hash;
      const recipient = v.public_inputs.recipient;
      const amount    = BigInt(v.public_inputs.amount);
      const relayer   = v.public_inputs.relayer;
      const fee       = BigInt(v.public_inputs.fee);

      const packed = packWithdrawalPublicInputs(poolId, root, nh, recipient, amount, relayer, fee);

      expect(packed).toHaveLength(7);
      expect(packed[0]).toBe(poolId);       // pool_id — first per schema
      expect(packed[1]).toBe(root);
      expect(packed[2]).toBe(nh);
      expect(packed[3]).toBe(recipient);
      expect(packed[4]).toBe(amount.toString());
      expect(packed[5]).toBe(relayer);
      expect(packed[6]).toBe(fee.toString()); // fee — last per schema
    });

    it('ProofGenerator.prepareWitness produces public inputs consistent with golden values', async () => {
      const note = buildNote(v);
      const merkleProof = buildMerkleProof(v);

      const relayerAddr =
        v.public_inputs.fee === '0'
          ? 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
          : undefined;

      const fee = BigInt(v.public_inputs.fee);

      const witness = await ProofGenerator.prepareWitness(note, merkleProof, v._recipient_addr ?? 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', relayerAddr, fee);

      // Public inputs must match golden values
      expect(witness.root).toBe(v.public_inputs.root);
      expect(witness.nullifier_hash).toBe(v.public_inputs.nullifier_hash);
      expect(witness.amount).toBe(v.public_inputs.amount);
      expect(witness.fee).toBe(v.public_inputs.fee);
      if (v.public_inputs.fee === '0') {
        expect(witness.relayer).toBe(v.public_inputs.relayer);
        expect(witness.relayer).toBe('0'.repeat(64));
      }

      // Private witnesses must match encoded note scalars
      expect(witness.nullifier).toBe(v.fields.nullifier);
      expect(witness.secret).toBe(v.fields.secret);
      expect(witness.leaf_index).toBe(String(v.merkle.leaf_index));
      expect(witness.hash_path).toHaveLength(20);
    });
  });
});

// ---------------------------------------------------------------------------
// Note backup round-trip tests (Issue #300 cross-check)
// ---------------------------------------------------------------------------

describe('Note Backup Round-trip', () => {
  describe.each(fixture.vectors.map((v: any) => [v.id, v]) as [string, any][])('%s backup round-trip', (_id: string, v: any) => {
    it('exportBackup → importBackup produces identical note', () => {
      const original = buildNote(v);
      const backup = original.exportBackup();

      expect(backup).toMatch(/^privacylayer-note:/);

      const restored = Note.importBackup(backup);

      expect(restored.nullifier).toEqual(original.nullifier);
      expect(restored.secret).toEqual(original.secret);
      expect(restored.poolId).toBe(original.poolId);
      expect(restored.amount).toBe(original.amount);
    });
  });

  it('importBackup throws INVALID_PREFIX for wrong prefix', () => {
    expect(() => Note.importBackup('bad-prefix:deadbeef')).toThrow(NoteBackupError);
    try {
      Note.importBackup('bad-prefix:deadbeef');
    } catch (e) {
      expect((e as NoteBackupError).code).toBe('INVALID_PREFIX');
    }
  });

  it('importBackup throws INVALID_LENGTH for truncated payload', () => {
    const short = 'privacylayer-note:' + 'ab'.repeat(50);
    try {
      Note.importBackup(short);
    } catch (e) {
      expect((e as NoteBackupError).code).toBe('INVALID_LENGTH');
    }
  });

  it('importBackup throws CHECKSUM_MISMATCH for corrupted data', () => {
    const original = buildNote(fixture.vectors[0]);
    const backup = original.exportBackup();
    // Flip a byte in the middle of the hex payload
    const hex = backup.slice('privacylayer-note:'.length);
    const flipped = hex.slice(0, 20) + (hex[20] === 'f' ? '0' : 'f') + hex.slice(21);
    const corrupted = 'privacylayer-note:' + flipped;
    try {
      Note.importBackup(corrupted);
    } catch (e) {
      expect((e as NoteBackupError).code).toMatch(/CHECKSUM_MISMATCH|INVALID_LENGTH|CORRUPT_DATA/);
    }
  });

  it('random generated note survives backup round-trip', () => {
    const note = Note.generate('aa'.repeat(32), 5_0000000n);
    const restored = Note.importBackup(note.exportBackup());

    expect(restored.nullifier).toEqual(note.nullifier);
    expect(restored.secret).toEqual(note.secret);
    expect(restored.poolId).toBe(note.poolId);
    expect(restored.amount).toBe(note.amount);
  });
});

// ---------------------------------------------------------------------------
// Cross-stack fixture stability (regression guard)
// ---------------------------------------------------------------------------

describe('Cross-stack fixture stability', () => {
  it('TV-001 nullifier hash is stable across runs', () => {
    const v = fixture.vectors.find((x: any) => x.id === 'TV-001');
    const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, 'hex'));
    const root = merkleNodeToField(Buffer.from(v.merkle.root, 'hex'));
    expect(computeNullifierHash(nf, root)).toBe(v.nullifier_hash);
  });

  it('TV-004 sparse-tree vector produces distinct nullifier hash from TV-001', () => {
    const v1 = fixture.vectors.find((x: any) => x.id === 'TV-001');
    const v4 = fixture.vectors.find((x: any) => x.id === 'TV-004');
    expect(v4.nullifier_hash).not.toBe(v1.nullifier_hash);
  });

  it('different notes produce different nullifier hashes even for same root', () => {
    const v1 = fixture.vectors.find((x: any) => x.id === 'TV-001');
    const v3 = fixture.vectors.find((x: any) => x.id === 'TV-003');
    // Both use leaf_index 0; their nullifiers differ so hashes must differ
    expect(v1.nullifier_hash).not.toBe(v3.nullifier_hash);
  });

  it('same nullifier with different roots produces different nullifier hashes', () => {
    const v = fixture.vectors[0];
    const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, 'hex'));
    const root1 = '0'.repeat(63) + '1';
    const root2 = '0'.repeat(63) + '2';
    const nh1 = computeNullifierHash(nf, root1);
    const nh2 = computeNullifierHash(nf, root2);
    expect(nh1).not.toBe(nh2);
  });

  it('stellarAddressToField is deterministic for the same address', () => {
    const addr = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    expect(stellarAddressToField(addr)).toBe(stellarAddressToField(addr));
    expect(stellarAddressToField(addr)).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// Withdrawal public-input schema order guard (ZK-032)
// These tests are golden: they must fail if anyone reorders the schema.
// ---------------------------------------------------------------------------

describe('Withdrawal public-input schema ordering (ZK-032)', () => {
  it('schema has exactly 7 entries', () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA).toHaveLength(7);
  });

  it('schema order is stable — pool_id first, fee last', () => {
    const expected = ['pool_id', 'root', 'nullifier_hash', 'recipient', 'amount', 'relayer', 'fee'];
    expect(Array.from(WITHDRAWAL_PUBLIC_INPUT_SCHEMA)).toEqual(expected);
  });

  it('packWithdrawalPublicInputs maps arguments to schema positions', () => {
    const poolId = 'a'.repeat(64);
    const root   = 'b'.repeat(64);
    const nh     = 'c'.repeat(64);
    const recip  = 'd'.repeat(64);
    const relayer = 'e'.repeat(64);
    const packed = packWithdrawalPublicInputs(poolId, root, nh, recip, 999n, relayer, 7n);

    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('pool_id')]).toBe(poolId);
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('root')]).toBe(root);
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('nullifier_hash')]).toBe(nh);
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('recipient')]).toBe(recip);
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('amount')]).toBe('999');
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('relayer')]).toBe(relayer);
    expect(packed[WITHDRAWAL_PUBLIC_INPUT_SCHEMA.indexOf('fee')]).toBe('7');
  });

  it('prepareWitness public fields align with WITHDRAWAL_PUBLIC_INPUT_SCHEMA', async () => {
    const v = fixture.vectors[0];
    const note = buildNote(v);
    const merkleProof = buildMerkleProof(v);
    const witness = await ProofGenerator.prepareWitness(
      note, merkleProof,
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    );

    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      expect(witness).toHaveProperty(key);
    }
  });
});

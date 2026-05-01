import fs from 'fs';
import path from 'path';
import { Note, NoteBackupError } from '../src/note';
import {
  MerkleProof,
  PREPARED_WITHDRAWAL_WITNESS_SCHEMA,
  PreparedWitness,
  ProofGenerator,
  ProvingBackend,
} from '../src/proof';
import { buildWithdrawalProofCacheKey, WithdrawalRequest } from '../src/withdraw';
import { MOCK_HASH_CONTEXT } from '../src/hash_mode';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const RELAYER = 'GBZXN7PIRZGNMHGAH5Q4D5B4H3B7BWQ7M4CW67A4V6APSLW7M4Q6TLE5';
const VECTORS_PATH = path.resolve(__dirname, 'golden/vectors.json');

function makeNote(poolId: string = '11'.repeat(32), amount: bigint = 1000n): Note {
  return new Note(
    Buffer.from('01'.repeat(31), 'hex'),
    Buffer.from('02'.repeat(31), 'hex'),
    poolId,
    amount
  );
}

function makeMerkleProof(): MerkleProof {
  return {
    root: Buffer.from('03'.repeat(32), 'hex'),
    pathElements: Array.from({ length: 20 }, () => Buffer.from('04'.repeat(32), 'hex')),
    pathIndices: Array.from({ length: 20 }, () => 0),
    leafIndex: 7,
  };
}

function makeRequest(note: Note = makeNote()): WithdrawalRequest {
  return {
    note,
    merkleProof: makeMerkleProof(),
    recipient: G,
    relayer: RELAYER,
    fee: 5n,
  };
}

describe('Privacy surface regression', () => {
  it('exportBackup stays prefix + fixed-length hex without plaintext witness metadata', () => {
    const backup = makeNote().exportBackup();

    expect(backup).toMatch(/^privacylayer-note:[0-9a-f]+$/);
    expect(backup.length).toBe('privacylayer-note:'.length + (115 * 2));
    expect(backup).not.toContain('recipient');
    expect(backup).not.toContain('nullifier_hash');
    expect(backup).not.toContain('hash_path');
    expect(backup).not.toContain('{');
  });

  it('importBackup rejects appended plaintext metadata after a valid payload', () => {
    const backup = makeNote().exportBackup();

    expect(() => Note.importBackup(`${backup}:debug-tag`)).toThrow(NoteBackupError);
    try {
      Note.importBackup(`${backup}:debug-tag`);
    } catch (error) {
      expect((error as NoteBackupError).code).toBe('CORRUPT_DATA');
    }
  });

  it('legacy deserialize rejects appended plaintext metadata after a valid payload', () => {
    const legacy = makeNote().serialize();

    expect(() => Note.deserialize(`${legacy}:debug-tag`)).toThrow('Invalid note format');
  });

  it('prepareWitness emits circuit-facing schema fields plus hashMode metadata (ZK-106)', async () => {
    // HASH_MODE: mock (ZK-106) — SHA-256 stand-ins; hashMode: 'mock' is stamped on the witness
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      G,
      RELAYER,
      5n
    );

    // ZK-106: hashMode is the only permitted non-circuit metadata field on the witness.
    // Circuit-facing fields must exactly match PREPARED_WITHDRAWAL_WITNESS_SCHEMA.
    const circuitFields = Object.keys(witness).filter((k) => k !== 'hashMode');
    expect(circuitFields.sort()).toEqual([...PREPARED_WITHDRAWAL_WITNESS_SCHEMA].sort());
    expect(witness).toHaveProperty('hashMode', 'mock');
    expect(witness).not.toHaveProperty('path_indices');
    expect(witness).not.toHaveProperty('commitment');
    expect(witness).not.toHaveProperty('backup');
  });

  it('ProofGenerator.generate strips extra metadata before sending the witness to the backend', async () => {
    // HASH_MODE: mock (ZK-106) — testOnlyAllowMockHash explicitly acknowledges SHA-256 stand-ins
    let backendWitness: PreparedWitness | undefined;
    const backend: ProvingBackend = {
      async generateProof(witness: PreparedWitness): Promise<Uint8Array> {
        backendWitness = witness;
        return new Uint8Array(256);
      },
    };

    const prepared = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      G,
      RELAYER,
      5n
    );
    const polluted = {
      ...prepared,
      recipient_strkey: G,
      merkle_root_hex: prepared.root,
      debug_label: 'do-not-send',
      exported_note: makeNote().exportBackup(),
    };

    await new ProofGenerator(backend).generate(polluted, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });

    expect(backendWitness).toBeDefined();
    // ZK-106: hashMode is stripped by canonicalizePreparedWitness; backend sees only circuit fields
    expect(Object.keys(backendWitness!).sort()).toEqual([...PREPARED_WITHDRAWAL_WITNESS_SCHEMA].sort());
    expect(backendWitness).not.toHaveProperty('hashMode');
    expect(backendWitness).not.toHaveProperty('recipient_strkey');
    expect(backendWitness).not.toHaveProperty('debug_label');
    expect(backendWitness).not.toHaveProperty('exported_note');
  });

  it('proof cache key ignores duplicated request metadata outside the canonical witness', async () => {
    const request = makeRequest();
    const witness = await ProofGenerator.prepareWitness(
      request.note,
      request.merkleProof,
      request.recipient,
      request.relayer,
      request.fee
    );

    const inconsistentRequest: WithdrawalRequest = {
      note: makeNote('aa'.repeat(32), 777n),
      merkleProof: makeMerkleProof(),
      recipient: RELAYER,
      relayer: G,
      fee: 0n,
    };

    expect(buildWithdrawalProofCacheKey(request, witness)).toBe(
      buildWithdrawalProofCacheKey(inconsistentRequest, witness)
    );
  });

  it('golden vector fixture exports stay on the allowed field set only', () => {
    const fixture = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf8'));

    expect(Object.keys(fixture).sort()).toEqual(['description', 'hash_algorithm', 'vectors', 'version']);

    for (const vector of fixture.vectors as any[]) {
      expect(Object.keys(vector).sort()).toEqual([
        'description',
        'fields',
        'id',
        'merkle',
        'note',
        'nullifier_hash',
        'public_inputs',
      ]);
      expect(Object.keys(vector.note).sort()).toEqual(['amount', 'nullifier_hex', 'pool_id', 'secret_hex']);
      expect(Object.keys(vector.fields).sort()).toEqual(['nullifier', 'secret']);
      expect(Object.keys(vector.merkle).sort()).toEqual(['leaf_index', 'path_elements', 'root']);
      expect(Object.keys(vector.public_inputs).sort()).toEqual([
        'amount',
        'fee',
        'nullifier_hash',
        'recipient',
        'relayer',
        'root',
      ]);

      expect(vector).not.toHaveProperty('backup');
      expect(vector).not.toHaveProperty('serialized_note');
      expect(vector).not.toHaveProperty('witness');
      expect(vector.note).not.toHaveProperty('backup');
      expect(vector.note).not.toHaveProperty('recipient');
      expect(vector.merkle).not.toHaveProperty('path_indices');
    }
  });
});

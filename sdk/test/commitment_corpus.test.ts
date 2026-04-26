import fs from 'fs';
import path from 'path';
import { hexToField } from '../src/encoding';
import { Note } from '../src/note';
import { computeNoteCommitmentField } from '../src/poseidon';
import { FIELD_MODULUS } from '../src/zk_constants';

const VECTORS_PATH = path.resolve(__dirname, '../../artifacts/zk/commitment_vectors.json');
const fixture = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf8'));

function buildNote(v: any): Note {
  return new Note(
    Buffer.from(v.note.nullifier_hex, 'hex'),
    Buffer.from(v.note.secret_hex, 'hex'),
    v.note.pool_id,
    1n
  );
}

describe('Shared commitment corpus', () => {
  it('loads the generated corpus structure', () => {
    expect(fixture.version).toBe(1);
    expect(fixture.hash_algorithm).toContain('Poseidon2');
    expect(Array.isArray(fixture.valid)).toBe(true);
    expect(Array.isArray(fixture.invalid)).toBe(true);
    expect(fixture.valid).toHaveLength(4);
    expect(fixture.invalid).toHaveLength(4);
  });

  describe.each(fixture.valid.map((v: any) => [v.id, v]) as [string, any][])(
    '%s',
    (_id, v) => {
      it('Note.getCommitment matches the shared fixture output', () => {
        expect(buildNote(v).getCommitment().toString('hex')).toBe(v.fields.commitment);
      });

      it('direct field computation matches the shared fixture output', () => {
        expect(
          computeNoteCommitmentField(
            Buffer.from(v.note.nullifier_hex, 'hex'),
            Buffer.from(v.note.secret_hex, 'hex'),
            v.note.pool_id
          )
        ).toBe(v.fields.commitment);
      });

      it('all encoded values are canonical BN254 field elements', () => {
        for (const key of ['nullifier', 'secret', 'pool_id', 'commitment'] as const) {
          expect(v.fields[key]).toHaveLength(64);
          expect(hexToField(v.fields[key], `${v.id}.${key}`) < FIELD_MODULUS).toBe(true);
        }
      });
    }
  );

  describe.each(fixture.invalid.map((v: any) => [v.id, v]) as [string, any][])(
    '%s',
    (_id, v) => {
      it('rejects malformed note material before hashing', () => {
        const attempt = () => {
          const note = new Note(
            Buffer.from(v.note.nullifier_hex, 'hex'),
            Buffer.from(v.note.secret_hex, 'hex'),
            v.note.pool_id,
            1n
          );
          note.getCommitment();
        };

        expect(attempt).toThrow(v.expected_error);
      });
    }
  );
});

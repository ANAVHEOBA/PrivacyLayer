import fs from 'fs';
import path from 'path';
import {
  COMMITMENT_DOMAIN_SEP_HEX,
  COMMITMENT_DOMAIN_SEP,
  NULLIFIER_DOMAIN_SEP_HEX,
  FIELD_MODULUS,
} from '../src/zk_constants';
import {
  computeNoteCommitmentField,
  computeNoteCommitmentBytes,
  poseidonFieldHex,
} from '../src/poseidon';
import { Note } from '../src/note';
import {
  noteScalarToField,
  poolIdToField,
  fieldToHex,
  hexToField,
} from '../src/encoding';

const VECTORS_PATH = path.resolve(__dirname, '../../artifacts/zk/v1/commitment_vectors.json');
const fixture = JSON.parse(fs.readFileSync(VECTORS_PATH, 'utf8'));

describe('COMMITMENT_DOMAIN_SEP_HEX constant', () => {
  it('is a 64-character hex string', () => {
    expect(COMMITMENT_DOMAIN_SEP_HEX).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(COMMITMENT_DOMAIN_SEP_HEX)).toBe(true);
  });

  it('is non-zero', () => {
    expect(COMMITMENT_DOMAIN_SEP_HEX).not.toBe('0'.repeat(64));
  });

  it('encodes ASCII "commitment_domain_v1" in the low bytes', () => {
    const ascii = Buffer.from('commitment_domain_v1', 'utf8').toString('hex');
    expect(COMMITMENT_DOMAIN_SEP_HEX.endsWith(ascii)).toBe(true);
  });

  it('is less than the BN254 field modulus', () => {
    expect(COMMITMENT_DOMAIN_SEP < FIELD_MODULUS).toBe(true);
  });

  it('is disjoint from NULLIFIER_DOMAIN_SEP_HEX', () => {
    expect(COMMITMENT_DOMAIN_SEP_HEX).not.toBe(NULLIFIER_DOMAIN_SEP_HEX);
  });
});

describe('computeNoteCommitmentField domain separation', () => {
  const nullifier = Buffer.alloc(31, 0x01);
  const secret = Buffer.alloc(31, 0x02);
  const poolId = '0'.repeat(62) + '03';

  it('prepends COMMITMENT_DOMAIN_SEP_HEX before hashing', () => {
    const expected = poseidonFieldHex([
      COMMITMENT_DOMAIN_SEP_HEX,
      noteScalarToField(nullifier),
      noteScalarToField(secret),
      poolIdToField(poolId),
    ]);
    expect(computeNoteCommitmentField(nullifier, secret, poolId)).toBe(expected);
  });

  it('differs from an undomain-separated hash with same inputs', () => {
    const withDomain = computeNoteCommitmentField(nullifier, secret, poolId);
    const withoutDomain = poseidonFieldHex([
      noteScalarToField(nullifier),
      noteScalarToField(secret),
      poolIdToField(poolId),
    ]);
    expect(withDomain).not.toBe(withoutDomain);
  });

  it('is deterministic across calls', () => {
    const h1 = computeNoteCommitmentField(nullifier, secret, poolId);
    const h2 = computeNoteCommitmentField(nullifier, secret, poolId);
    expect(h1).toBe(h2);
  });

  it('accepts Uint8Array representations identically to Buffer', () => {
    const hBuf = computeNoteCommitmentField(nullifier, secret, poolId);
    const hArr = computeNoteCommitmentField(new Uint8Array(nullifier), new Uint8Array(secret), poolId);
    expect(hBuf).toBe(hArr);
  });

  it('output is a 64-character canonical hex string within BN254 field', () => {
    const h = computeNoteCommitmentField(nullifier, secret, poolId);
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
    expect(hexToField(h, 'commitment') < FIELD_MODULUS).toBe(true);
  });
});

describe('Commitment domain is disjoint from nullifier domain', () => {
  const common = Buffer.alloc(31, 0x42);
  const poolId = '0'.repeat(62) + '01';

  it('produces different hash from nullifier preimage with same inputs', () => {
    const commitment = computeNoteCommitmentField(common, common, poolId);
    const simulatedNullifier = poseidonFieldHex([
      NULLIFIER_DOMAIN_SEP_HEX,
      noteScalarToField(common),
      poolIdToField(poolId),
    ]);
    expect(commitment).not.toBe(simulatedNullifier);
  });

  it('changing secret changes commitment hash', () => {
    const nullifier = Buffer.alloc(31, 0x01);
    const s1 = Buffer.alloc(31, 0x02);
    const s2 = Buffer.alloc(31, 0x03);
    expect(computeNoteCommitmentField(nullifier, s1, poolId)).not.toBe(
      computeNoteCommitmentField(nullifier, s2, poolId)
    );
  });

  it('changing poolId changes commitment hash', () => {
    const nullifier = Buffer.alloc(31, 0x01);
    const secret = Buffer.alloc(31, 0x02);
    const p1 = '0'.repeat(62) + '01';
    const p2 = '0'.repeat(62) + '02';
    expect(computeNoteCommitmentField(nullifier, secret, p1)).not.toBe(
      computeNoteCommitmentField(nullifier, secret, p2)
    );
  });
});

describe('Cross-stack commitment domain corpus verification', () => {
  describe.each(fixture.valid.map((v: any) => [v.id, v]) as [string, any][])(
    '%s — %s',
    (_id, v) => {
      it('direct field computation reproduces shared vector commitment', () => {
        const computed = computeNoteCommitmentField(
          Buffer.from(v.note.nullifier_hex, 'hex'),
          Buffer.from(v.note.secret_hex, 'hex'),
          v.note.pool_id
        );
        expect(computed).toBe(v.fields.commitment);
      });

      it('Note.getCommitment reproduces shared vector commitment', () => {
        const note = new Note(
          Buffer.from(v.note.nullifier_hex, 'hex'),
          Buffer.from(v.note.secret_hex, 'hex'),
          v.note.pool_id,
          1n,
          0n
        );
        expect(note.getCommitment().toString('hex')).toBe(v.fields.commitment);
      });
    }
  );
});

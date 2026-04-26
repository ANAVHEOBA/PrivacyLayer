/**
 * ZK-017: Domain-separated nullifier hashing cross-stack fixtures.
 *
 * Verifies that the SDK's `computeNullifierHash` uses the NULLIFIER_DOMAIN_SEP
 * constant in the same structural position as the Noir circuit
 * (circuits/lib/src/hash/nullifier.nr), ensuring both stacks produce hashes
 * in the same domain and that the nullifier domain is disjoint from the
 * commitment domain.
 */

import { createHash } from 'crypto';
import { computeNullifierHash, fieldToHex } from '../src/encoding';
import { NULLIFIER_DOMAIN_SEP_HEX, FIELD_MODULUS } from '../src/zk_constants';
import { Note } from '../src/note';
import { noteScalarToField, merkleNodeToField } from '../src/encoding';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rawSha256(...parts: Buffer[]): string {
  const digest = createHash('sha256').update(Buffer.concat(parts)).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

function hexBuf(hex: string): Buffer {
  return Buffer.from(hex.padStart(64, '0'), 'hex');
}

// ---------------------------------------------------------------------------
// Domain separator constant
// ---------------------------------------------------------------------------

describe('NULLIFIER_DOMAIN_SEP_HEX constant', () => {
  it('is a 64-character hex string', () => {
    expect(NULLIFIER_DOMAIN_SEP_HEX).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(NULLIFIER_DOMAIN_SEP_HEX)).toBe(true);
  });

  it('is non-zero', () => {
    expect(NULLIFIER_DOMAIN_SEP_HEX).not.toBe('0'.repeat(64));
  });

  it('encodes ASCII "nullifier_domain_v1" in the low bytes', () => {
    const ascii = Buffer.from('nullifier_domain_v1', 'utf8').toString('hex');
    expect(NULLIFIER_DOMAIN_SEP_HEX.endsWith(ascii)).toBe(true);
  });

  it('is less than the BN254 field modulus', () => {
    const value = BigInt('0x' + NULLIFIER_DOMAIN_SEP_HEX);
    expect(value < FIELD_MODULUS).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Domain separation — structural alignment with the Noir circuit
// ---------------------------------------------------------------------------

describe('computeNullifierHash domain separation', () => {
  const nullifierHex = '0'.repeat(62) + '01';
  const rootHex = '0'.repeat(62) + '42';

  it('prepends NULLIFIER_DOMAIN_SEP before hashing', () => {
    const expected = rawSha256(
      hexBuf(NULLIFIER_DOMAIN_SEP_HEX),
      hexBuf(nullifierHex),
      hexBuf(rootHex),
    );
    expect(computeNullifierHash(nullifierHex, rootHex)).toBe(expected);
  });

  it('differs from a two-input hash of the same inputs (domain is active)', () => {
    const withDomain = computeNullifierHash(nullifierHex, rootHex);
    const withoutDomain = rawSha256(hexBuf(nullifierHex), hexBuf(rootHex));
    expect(withDomain).not.toBe(withoutDomain);
  });

  it('is deterministic across calls', () => {
    expect(computeNullifierHash(nullifierHex, rootHex)).toBe(
      computeNullifierHash(nullifierHex, rootHex),
    );
  });

  it('output is a 64-character canonical hex string', () => {
    const h = computeNullifierHash(nullifierHex, rootHex);
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('output is within the BN254 field', () => {
    const h = computeNullifierHash(nullifierHex, rootHex);
    expect(BigInt('0x' + h) < FIELD_MODULUS).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-domain isolation: nullifier hash != commitment hash
// ---------------------------------------------------------------------------

describe('Nullifier domain is disjoint from commitment domain', () => {
  it('same (a, b) inputs produce different hashes in nullifier vs two-field commitment', () => {
    // Simulated commitment hash: SHA-256(nullifier ‖ secret ‖ pool_id)
    const a = '0'.repeat(62) + 'aa';
    const b = '0'.repeat(62) + 'bb';
    const c = '0'.repeat(62) + 'cc';
    const nullifierHash = computeNullifierHash(a, b);
    // Commitment uses 3 inputs without any domain sep in the SHA-256 stand-in
    const commitmentHash = rawSha256(hexBuf(a), hexBuf(b), hexBuf(c));
    expect(nullifierHash).not.toBe(commitmentHash);
  });

  it('changing root changes nullifier hash', () => {
    const nullifier = '0'.repeat(62) + '07';
    const root1 = '0'.repeat(62) + '01';
    const root2 = '0'.repeat(62) + '02';
    expect(computeNullifierHash(nullifier, root1)).not.toBe(
      computeNullifierHash(nullifier, root2),
    );
  });

  it('changing nullifier changes nullifier hash', () => {
    const root = '0'.repeat(62) + '42';
    const n1 = '0'.repeat(62) + '01';
    const n2 = '0'.repeat(62) + '02';
    expect(computeNullifierHash(n1, root)).not.toBe(
      computeNullifierHash(n2, root),
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-stack fixture corpus
// Three concrete vectors consumed by both this SDK test and the Noir test
// in circuits/lib/src/hash/nullifier.nr.
// ---------------------------------------------------------------------------

describe('Cross-stack nullifier domain fixtures', () => {
  const FIXTURES = [
    {
      id: 'ND-001',
      description: 'Small field values – minimal non-zero nullifier and root',
      nullifier: '0'.repeat(62) + '01',
      root:      '0'.repeat(62) + '42',
    },
    {
      id: 'ND-002',
      description: 'Non-trivial values – realistic random-looking inputs',
      nullifier: 'aabbccdd' + '0'.repeat(56),
      root:      '11223344' + '0'.repeat(56),
    },
    {
      id: 'ND-003',
      description: 'Zero nullifier – edge case where nullifier is the additive identity',
      nullifier: '0'.repeat(64),
      root:      '0'.repeat(62) + '01',
    },
  ];

  describe.each(FIXTURES.map((f) => [f.id, f]) as [string, typeof FIXTURES[0]][])(
    '%s — %s',
    (_id, f) => {
      it('SDK computes domain-separated hash matching expected structure', () => {
        const h = computeNullifierHash(f.nullifier, f.root);
        // Verify structural invariants — exact value pinned by test re-computation
        const expected = rawSha256(
          hexBuf(NULLIFIER_DOMAIN_SEP_HEX),
          hexBuf(f.nullifier),
          hexBuf(f.root),
        );
        expect(h).toBe(expected);
        expect(h).toHaveLength(64);
        expect(BigInt('0x' + h) < FIELD_MODULUS).toBe(true);
      });

      it('hash is unique to this (nullifier, root) pair', () => {
        const h = computeNullifierHash(f.nullifier, f.root);
        const hOther = computeNullifierHash(f.root, f.nullifier); // swapped
        expect(h).not.toBe(hOther);
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Note-derived nullifier hash (integration with Note class)
// ---------------------------------------------------------------------------

describe('Note-derived nullifier hash', () => {
  const POOL_ID = 'aa'.repeat(32);
  const AMOUNT = 1_000_000n;

  it('note nullifier field encodes to non-zero 64-char hex', () => {
    const note = Note.deriveDeterministic('seed-nd-001', POOL_ID, AMOUNT);
    const nf = noteScalarToField(note.nullifier);
    expect(nf).toHaveLength(64);
    expect(nf).not.toBe('0'.repeat(64));
  });

  it('computeNullifierHash from note scalar and merkle root is stable', () => {
    const note = Note.deriveDeterministic('seed-nd-001', POOL_ID, AMOUNT);
    const nf = noteScalarToField(note.nullifier);
    const root = merkleNodeToField(Buffer.alloc(32, 0x42));
    const h1 = computeNullifierHash(nf, root);
    const h2 = computeNullifierHash(nf, root);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('two different notes produce different nullifier hashes for the same root', () => {
    const note1 = Note.deriveDeterministic('seed-nd-001', POOL_ID, AMOUNT);
    const note2 = Note.deriveDeterministic('seed-nd-002', POOL_ID, AMOUNT);
    const root = merkleNodeToField(Buffer.alloc(32, 0x01));
    const h1 = computeNullifierHash(noteScalarToField(note1.nullifier), root);
    const h2 = computeNullifierHash(noteScalarToField(note2.nullifier), root);
    expect(h1).not.toBe(h2);
  });
});

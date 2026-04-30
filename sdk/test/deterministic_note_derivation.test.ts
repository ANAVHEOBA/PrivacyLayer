/**
 * ZK-016: Deterministic note derivation for fixtures, seeded tests, and recovery flows.
 *
 * Tests that:
 * - The same seed/pool/amount always produces the same note (golden values pinned).
 * - Derived notes honor canonical BN254 field-width constraints.
 * - The deterministic path is fully isolated from production randomness.
 * - Fixture generation no longer depends on hand-picked hard-coded notes.
 */
import { Note, setDefaultRandomnessSource, resetDefaultRandomnessSource, RandomnessSource } from '../src/note';
import { noteScalarToField } from '../src/encoding';
import { NOTE_SCALAR_BYTE_LENGTH, FIELD_MODULUS } from '../src/zk_constants';

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const POOL_A = 'aa'.repeat(32);
const POOL_B = 'bb'.repeat(32);
const POOL_ZERO = '00'.repeat(32);
const AMOUNT_SMALL = 1n;
const AMOUNT_LARGE = (1n << 64n) - 1n; // max u64

// ---------------------------------------------------------------------------
// Pinned golden values for deterministic derivation.
// These must never change unless the derivation algorithm is intentionally updated.
// ---------------------------------------------------------------------------

const GOLDEN = {
  seed: 'test-seed-001',
  poolId: POOL_A,
  amount: 1000000n,
  nullifierHex: '7118e24a5e68dd8535a9c808da5f53fb6cfa7f064d844751ca783b24202eed',
  secretHex: 'c968938b10907166794c55d547673210030626ff72c0641ad9eb6a290ffad9',
  nullifierField: '007118e24a5e68dd8535a9c808da5f53fb6cfa7f064d844751ca783b24202eed',
  secretField: '00c968938b10907166794c55d547673210030626ff72c0641ad9eb6a290ffad9',
  commitmentHex: 'c181edc743bb1478cbd0c9d1192b8be2f536987bf29f5b9cf9bd13c5a25fbb86',
} as const;

// ---------------------------------------------------------------------------
// Helper: inject a broken randomness source so any accidental production path fails
// ---------------------------------------------------------------------------

class PanicRandomnessSource implements RandomnessSource {
  randomBytes(_length: number): Uint8Array {
    throw new Error('BUG: production randomness used inside a deterministic test');
  }
}

// ---------------------------------------------------------------------------
// Reproducibility — same inputs always produce the same note
// ---------------------------------------------------------------------------

describe('deriveDeterministic — reproducibility', () => {
  it('produces identical nullifier and secret for repeated calls with the same inputs', () => {
    const a = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    const b = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(a.nullifier.toString('hex')).toBe(b.nullifier.toString('hex'));
    expect(a.secret.toString('hex')).toBe(b.secret.toString('hex'));
  });

  it('pins nullifier to the golden hex value', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(note.nullifier.toString('hex')).toBe(GOLDEN.nullifierHex);
  });

  it('pins secret to the golden hex value', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(note.secret.toString('hex')).toBe(GOLDEN.secretHex);
  });

  it('pins commitment to the golden hex value', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(note.getCommitment().toString('hex')).toBe(GOLDEN.commitmentHex);
  });
});

// ---------------------------------------------------------------------------
// Sensitivity — different inputs produce different notes
// ---------------------------------------------------------------------------

describe('deriveDeterministic — sensitivity', () => {
  it('produces a different nullifier when the seed changes', () => {
    const a = Note.deriveDeterministic('seed-a', POOL_A, 1000n);
    const b = Note.deriveDeterministic('seed-b', POOL_A, 1000n);
    expect(a.nullifier.toString('hex')).not.toBe(b.nullifier.toString('hex'));
  });

  it('produces a different note when the pool changes', () => {
    const a = Note.deriveDeterministic('same-seed', POOL_A, 1000n);
    const b = Note.deriveDeterministic('same-seed', POOL_B, 1000n);
    expect(a.nullifier.toString('hex')).not.toBe(b.nullifier.toString('hex'));
  });

  it('produces a different note when the amount changes', () => {
    const a = Note.deriveDeterministic('same-seed', POOL_A, 1000n);
    const b = Note.deriveDeterministic('same-seed', POOL_A, 2000n);
    expect(a.nullifier.toString('hex')).not.toBe(b.nullifier.toString('hex'));
  });

  it('produces a different note for zero pool vs non-zero pool', () => {
    const a = Note.deriveDeterministic('seed', POOL_ZERO, 1000n);
    const b = Note.deriveDeterministic('seed', POOL_A, 1000n);
    expect(a.nullifier.toString('hex')).not.toBe(b.nullifier.toString('hex'));
  });
});

// ---------------------------------------------------------------------------
// Canonical BN254 field-width constraints
// ---------------------------------------------------------------------------

describe('deriveDeterministic — field-width constraints', () => {
  it('produces a 31-byte nullifier (fits within BN254 field unconditionally)', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(note.nullifier.length).toBe(NOTE_SCALAR_BYTE_LENGTH);
  });

  it('produces a 31-byte secret (fits within BN254 field unconditionally)', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(note.secret.length).toBe(NOTE_SCALAR_BYTE_LENGTH);
  });

  it('nullifier converts to a canonical 64-char field hex without reduction', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    const fieldHex = noteScalarToField(note.nullifier);
    expect(fieldHex).toHaveLength(64);
    expect(fieldHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('secret converts to a canonical 64-char field hex without reduction', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    const fieldHex = noteScalarToField(note.secret);
    expect(fieldHex).toHaveLength(64);
    expect(fieldHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('pins nullifier field encoding to the golden value', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(noteScalarToField(note.nullifier)).toBe(GOLDEN.nullifierField);
  });

  it('pins secret field encoding to the golden value', () => {
    const note = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);
    expect(noteScalarToField(note.secret)).toBe(GOLDEN.secretField);
  });

  it('nullifier value is strictly less than FIELD_MODULUS', () => {
    const cases = [
      { seed: 'seed-a', poolId: POOL_A, amount: AMOUNT_SMALL },
      { seed: 'seed-b', poolId: POOL_B, amount: AMOUNT_LARGE },
      { seed: 'seed-c', poolId: POOL_ZERO, amount: 0n },
    ];
    for (const { seed, poolId, amount } of cases) {
      const note = Note.deriveDeterministic(seed, poolId, amount);
      const n = BigInt('0x' + note.nullifier.toString('hex'));
      expect(n).toBeGreaterThanOrEqual(0n);
      // 31 bytes = max 2^248 - 1, always < FIELD_MODULUS (~2^254)
      expect(n).toBeLessThan(FIELD_MODULUS);
    }
  });

  it('secret value is strictly less than FIELD_MODULUS', () => {
    const cases = [
      { seed: 'seed-a', poolId: POOL_A, amount: AMOUNT_SMALL },
      { seed: 'seed-b', poolId: POOL_B, amount: AMOUNT_LARGE },
    ];
    for (const { seed, poolId, amount } of cases) {
      const note = Note.deriveDeterministic(seed, poolId, amount);
      const n = BigInt('0x' + note.secret.toString('hex'));
      expect(n).toBeLessThan(FIELD_MODULUS);
    }
  });
});

// ---------------------------------------------------------------------------
// Isolation from production randomness
// ---------------------------------------------------------------------------

describe('deriveDeterministic — isolation from production randomness', () => {
  afterEach(() => {
    resetDefaultRandomnessSource();
  });

  it('does not call the default randomness source during deterministic derivation', () => {
    setDefaultRandomnessSource(new PanicRandomnessSource());
    // Must not throw — deriveDeterministic must never touch production randomness
    expect(() =>
      Note.deriveDeterministic('seed', POOL_A, 1000n)
    ).not.toThrow();
  });

  it('produces the same note regardless of which randomness source is set', () => {
    const a = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);

    setDefaultRandomnessSource(new PanicRandomnessSource());
    const b = Note.deriveDeterministic(GOLDEN.seed, GOLDEN.poolId, GOLDEN.amount);

    expect(a.nullifier.toString('hex')).toBe(b.nullifier.toString('hex'));
    expect(a.secret.toString('hex')).toBe(b.secret.toString('hex'));
  });
});

// ---------------------------------------------------------------------------
// Byte seed / Buffer seed variants
// ---------------------------------------------------------------------------

describe('deriveDeterministic — seed format variants', () => {
  it('produces the same note for string and Buffer seeds containing the same bytes', () => {
    const str = 'utf8-seed';
    const buf = Buffer.from(str, 'utf8');
    const fromStr = Note.deriveDeterministic(str, POOL_A, 1n);
    const fromBuf = Note.deriveDeterministic(buf, POOL_A, 1n);
    expect(fromStr.nullifier.toString('hex')).toBe(fromBuf.nullifier.toString('hex'));
  });

  it('produces the same note for Buffer and Uint8Array seeds containing the same bytes', () => {
    const buf = Buffer.from('binary-seed');
    const arr = new Uint8Array(buf);
    const fromBuf = Note.deriveDeterministic(buf, POOL_A, 42n);
    const fromArr = Note.deriveDeterministic(arr, POOL_A, 42n);
    expect(fromBuf.nullifier.toString('hex')).toBe(fromArr.nullifier.toString('hex'));
  });
});

// ---------------------------------------------------------------------------
// Fixture generator: generates a self-consistent fixture set from a seed
// ---------------------------------------------------------------------------

describe('deterministic fixture generation (ZK-016 acceptance)', () => {
  function generateFixtures(seeds: string[], poolId: string, amounts: bigint[]) {
    return seeds.flatMap(seed =>
      amounts.map(amount => {
        const note = Note.deriveDeterministic(seed, poolId, amount);
        return {
          seed,
          poolId,
          amount: amount.toString(),
          nullifierHex: note.nullifier.toString('hex'),
          secretHex: note.secret.toString('hex'),
          nullifierField: noteScalarToField(note.nullifier),
          secretField: noteScalarToField(note.secret),
          commitmentHex: note.getCommitment().toString('hex'),
        };
      })
    );
  }

  const seeds = ['fixture-seed-a', 'fixture-seed-b', 'fixture-seed-c'];
  const amounts = [1n, 1000000n, AMOUNT_LARGE];

  it('generates a fixture set without any randomness', () => {
    setDefaultRandomnessSource(new PanicRandomnessSource());
    const fixtures = generateFixtures(seeds, POOL_A, amounts);
    expect(fixtures).toHaveLength(9); // 3 seeds × 3 amounts
    for (const f of fixtures) {
      expect(f.nullifierHex).toHaveLength(62); // 31 bytes = 62 hex chars
      expect(f.nullifierField).toHaveLength(64);
      expect(f.commitmentHex).toHaveLength(64);
    }
  });

  it('fixture set is fully deterministic across calls', () => {
    const first = generateFixtures(seeds, POOL_A, amounts);
    const second = generateFixtures(seeds, POOL_A, amounts);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('all commitments in the fixture set are unique', () => {
    const fixtures = generateFixtures(seeds, POOL_A, amounts);
    const commitments = new Set(fixtures.map(f => f.commitmentHex));
    expect(commitments.size).toBe(fixtures.length);
  });
});

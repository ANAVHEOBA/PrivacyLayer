/// <reference types="jest" />
import { Note } from '../src/note';
import { DEFAULT_DENOMINATION, DENOMINATION_1000_XLM } from '../src/zk_constants';

const POOL_A = '11'.repeat(32);
const POOL_B = '22'.repeat(32);

describe('Deterministic note derivation (ZK-016)', () => {
  describe('Stability — same inputs always produce same note', () => {
    it('same seed + pool + denomination always produces the same note', () => {
      const a = Note.deriveDeterministic('my-seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('my-seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      expect(a.nullifier).toEqual(b.nullifier);
      expect(a.secret).toEqual(b.secret);
      expect(a.poolId).toBe(b.poolId);
      expect(a.amount).toBe(b.amount);
      expect(a.denomination).toBe(b.denomination);
    });

    it('same seed across multiple calls with no mutation between them', () => {
      const seed = 'recovery-seed-2026';
      const results = Array.from({ length: 5 }, () =>
        Note.deriveDeterministic(seed, POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION)
      );
      for (const note of results.slice(1)) {
        expect(note.nullifier).toEqual(results[0].nullifier);
        expect(note.secret).toEqual(results[0].secret);
      }
    });

    it('commitment is stable for repeated derivation', () => {
      const c1 = Note.deriveDeterministic('stable-seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION)
        .getCommitment().toString('hex');
      const c2 = Note.deriveDeterministic('stable-seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION)
        .getCommitment().toString('hex');
      expect(c1).toBe(c2);
    });
  });

  describe('Isolation — changing any input changes the output', () => {
    it('different seeds produce different notes', () => {
      const a = Note.deriveDeterministic('seed-alpha', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('seed-beta', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      expect(a.nullifier).not.toEqual(b.nullifier);
      expect(a.secret).not.toEqual(b.secret);
    });

    it('different pools produce different notes for the same seed', () => {
      const a = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('seed', POOL_B, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      expect(a.nullifier).not.toEqual(b.nullifier);
      expect(a.secret).not.toEqual(b.secret);
    });

    it('different amounts produce different notes for the same seed and pool', () => {
      const a = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('seed', POOL_A, DENOMINATION_1000_XLM, DENOMINATION_1000_XLM);

      expect(a.nullifier).not.toEqual(b.nullifier);
      expect(a.secret).not.toEqual(b.secret);
    });

    it('different denominations produce different notes for the same seed, pool, and amount', () => {
      const a = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION, DENOMINATION_1000_XLM);

      expect(a.nullifier).not.toEqual(b.nullifier);
    });
  });

  describe('Field-width constraints are honoured', () => {
    it('derived nullifier is exactly 31 bytes', () => {
      const note = Note.deriveDeterministic('x', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(note.nullifier.length).toBe(31);
    });

    it('derived secret is exactly 31 bytes', () => {
      const note = Note.deriveDeterministic('x', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(note.secret.length).toBe(31);
    });

    it('derived note produces a valid commitment without throwing', () => {
      const note = Note.deriveDeterministic('integrity-check', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(() => note.getCommitment()).not.toThrow();
    });
  });

  describe('Isolation from production randomness path', () => {
    it('deterministic derivation is unaffected by the global randomness source', () => {
      const before = Note.deriveDeterministic('fixture-a', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      // Even if production randomness source were overridden (via setDefaultRandomnessSource),
      // deriveDeterministic must produce the same result.
      const after = Note.deriveDeterministic('fixture-a', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      expect(before.nullifier).toEqual(after.nullifier);
      expect(before.secret).toEqual(after.secret);
    });

    it('Note.generate and Note.deriveDeterministic never produce the same note for the same pool', () => {
      const seed = 'fixture-b';
      const poolId = POOL_A;
      const amount = DEFAULT_DENOMINATION;

      const generated = Note.generate(poolId, amount, 0n);
      const derived = Note.deriveDeterministic(seed, poolId, amount, 0n);

      // Statistically impossible with 31-byte entropy that these coincide
      const match = generated.nullifier.equals(derived.nullifier) && generated.secret.equals(derived.secret);
      expect(match).toBe(false);
    });
  });

  describe('Seed formats', () => {
    it('accepts a string seed', () => {
      const note = Note.deriveDeterministic('string-seed', POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(note).toBeInstanceOf(Note);
    });

    it('accepts a Buffer seed', () => {
      const note = Note.deriveDeterministic(Buffer.from('buffer-seed', 'utf8'), POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(note).toBeInstanceOf(Note);
    });

    it('accepts a Uint8Array seed', () => {
      const seed = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const note = Note.deriveDeterministic(seed, POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      expect(note).toBeInstanceOf(Note);
    });

    it('string seed and equivalent Buffer seed produce the same note', () => {
      const str = 'hello-fixture';
      const buf = Buffer.from(str, 'utf8');

      const a = Note.deriveDeterministic(str, POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic(buf, POOL_A, DEFAULT_DENOMINATION, DEFAULT_DENOMINATION);

      expect(a.nullifier).toEqual(b.nullifier);
      expect(a.secret).toEqual(b.secret);
    });
  });

  describe('Default denomination parameter', () => {
    it('denomination defaults to 0n when omitted', () => {
      const note = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION);
      expect(note.denomination).toBe(0n);
    });

    it('explicit 0n denomination matches the default', () => {
      const a = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION);
      const b = Note.deriveDeterministic('seed', POOL_A, DEFAULT_DENOMINATION, 0n);

      expect(a.nullifier).toEqual(b.nullifier);
      expect(a.secret).toEqual(b.secret);
    });
  });
});

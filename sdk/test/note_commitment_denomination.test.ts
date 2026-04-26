/// <reference types="jest" />
import { Note } from '../src/note';
import { computeNoteCommitmentField } from '../src/poseidon';
import { DEFAULT_DENOMINATION, DENOMINATION_1000_XLM, DENOMINATION_10000_XLM } from '../src/zk_constants';

const POOL = '11'.repeat(32);
const NUL = Buffer.from('01'.repeat(31), 'hex');
const SEC = Buffer.from('02'.repeat(31), 'hex');

function note(denomination: bigint): Note {
  return new Note(NUL, SEC, POOL, denomination, denomination);
}

describe('Denomination bound into note commitment (ZK-013)', () => {
  describe('Commitment uniqueness across denomination classes', () => {
    it('commitments differ when only the denomination changes', () => {
      const c100 = note(DEFAULT_DENOMINATION).getCommitment().toString('hex');
      const c1000 = note(DENOMINATION_1000_XLM).getCommitment().toString('hex');
      const c10000 = note(DENOMINATION_10000_XLM).getCommitment().toString('hex');

      expect(c100).not.toBe(c1000);
      expect(c100).not.toBe(c10000);
      expect(c1000).not.toBe(c10000);
    });

    it('same nullifier and secret under denomination 0 vs non-zero produce different commitments', () => {
      const cZero = new Note(NUL, SEC, POOL, 1n, 0n).getCommitment().toString('hex');
      const cNonZero = new Note(NUL, SEC, POOL, 1n, DEFAULT_DENOMINATION).getCommitment().toString('hex');

      expect(cZero).not.toBe(cNonZero);
    });

    it('commitment is deterministic: same inputs always produce same output', () => {
      const a = note(DEFAULT_DENOMINATION).getCommitment().toString('hex');
      const b = note(DEFAULT_DENOMINATION).getCommitment().toString('hex');

      expect(a).toBe(b);
    });

    it('denomination is available downstream for withdrawal proof checks', () => {
      const n = note(DENOMINATION_1000_XLM);
      expect(n.denomination).toBe(DENOMINATION_1000_XLM);
      expect(n.amount).toBe(DENOMINATION_1000_XLM);
    });
  });

  describe('computeNoteCommitmentField denomination parameter', () => {
    it('direct hash differs when denomination field differs', () => {
      const h0 = computeNoteCommitmentField(NUL, SEC, POOL, 0n);
      const h1 = computeNoteCommitmentField(NUL, SEC, POOL, DEFAULT_DENOMINATION);
      const h2 = computeNoteCommitmentField(NUL, SEC, POOL, DENOMINATION_1000_XLM);

      expect(h0).not.toBe(h1);
      expect(h0).not.toBe(h2);
      expect(h1).not.toBe(h2);
    });

    it('Note.getCommitment matches direct computeNoteCommitmentField call', () => {
      const n = note(DEFAULT_DENOMINATION);
      const direct = computeNoteCommitmentField(NUL, SEC, POOL, DEFAULT_DENOMINATION);
      expect(n.getCommitment().toString('hex')).toBe(direct);
    });

    it('denomination defaults to 0n in computeNoteCommitmentField', () => {
      const withDefault = computeNoteCommitmentField(NUL, SEC, POOL);
      const withExplicit = computeNoteCommitmentField(NUL, SEC, POOL, 0n);
      expect(withDefault).toBe(withExplicit);
    });
  });

  describe('Denomination as canonical field input (ZK-013)', () => {
    it('denomination is protocol data stored on the note, not display metadata', () => {
      const n = new Note(NUL, SEC, POOL, DEFAULT_DENOMINATION, DENOMINATION_1000_XLM);
      expect(n.denomination).toBe(DENOMINATION_1000_XLM);
      expect(n.amount).toBe(DEFAULT_DENOMINATION);
    });

    it('notes with same nullifier/secret/pool but different denominations have different commitments', () => {
      const denominations = [0n, 1n, DEFAULT_DENOMINATION, DENOMINATION_1000_XLM, DENOMINATION_10000_XLM];
      const commitments = denominations.map((d) =>
        new Note(NUL, SEC, POOL, d, d).getCommitment().toString('hex')
      );

      const uniqueCommitments = new Set(commitments);
      expect(uniqueCommitments.size).toBe(denominations.length);
    });

    it('commitment output is a valid 32-byte hex string', () => {
      const commitment = note(DEFAULT_DENOMINATION).getCommitment();
      expect(commitment).toBeInstanceOf(Buffer);
      expect(commitment.length).toBe(32);
      expect(commitment.toString('hex')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('denomination defaults to 0n in Note constructor', () => {
      const n = new Note(NUL, SEC, POOL, 1000n);
      expect(n.denomination).toBe(0n);
    });
  });
});

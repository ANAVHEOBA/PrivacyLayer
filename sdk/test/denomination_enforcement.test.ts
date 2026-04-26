/// <reference types="jest" />
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import { WitnessValidationError } from '../src/errors';
import { DEFAULT_DENOMINATION, DENOMINATION_1000_XLM } from '../src/zk_constants';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const r32 = Buffer.from('ab'.repeat(32), 'hex');
const s31 = () => Buffer.from('01'.repeat(31), 'hex');
const p20 = () => Array.from({ length: 20 }, () => r32);

function makeNote(amount: bigint = DEFAULT_DENOMINATION) {
  return new Note(s31(), s31(), 'cc'.repeat(32), amount);
}

describe('Denomination Enforcement (ZK-030)', () => {
  describe('SDK validation before witness preparation', () => {
    it('accepts witness when note amount matches default denomination', async () => {
      const note = makeNote(DEFAULT_DENOMINATION);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      const witness = await ProofGenerator.prepareWitness(note, good, G);
      
      expect(witness.amount).toBe(DEFAULT_DENOMINATION.toString());
      expect(witness.denomination).toBe(DEFAULT_DENOMINATION.toString());
    });

    it('accepts witness when note amount matches custom denomination', async () => {
      const note = makeNote(DENOMINATION_1000_XLM);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      const witness = await ProofGenerator.prepareWitness(note, good, G, G, 0n, {
        denomination: DENOMINATION_1000_XLM,
      });
      
      expect(witness.amount).toBe(DENOMINATION_1000_XLM.toString());
      expect(witness.denomination).toBe(DENOMINATION_1000_XLM.toString());
    });

    it('rejects witness when note amount does not match pool denomination', async () => {
      const note = makeNote(999n); // Mismatched amount
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });

    it('rejects witness when note amount is zero but pool has non-zero denomination', async () => {
      const note = makeNote(0n);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });

    it('rejects witness when note amount is arbitrary non-denomination value', async () => {
      const note = makeNote(123456789n);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });

    it('includes denomination in witness error message', async () => {
      const note = makeNote(999n);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow('Denomination mismatch');
    });

    it('uses default denomination when not specified in options', async () => {
      const note = makeNote(DEFAULT_DENOMINATION);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      const witness = await ProofGenerator.prepareWitness(note, good, G);
      
      expect(witness.denomination).toBe(DEFAULT_DENOMINATION.toString());
    });
  });

  describe('Same note secrets under different denominations', () => {
    it('produces different witness amounts for same secrets with different denominations', async () => {
      const nullifier = s31();
      const secret = s31();
      const poolId = 'cc'.repeat(32);
      
      const note100 = new Note(nullifier, secret, poolId, DEFAULT_DENOMINATION);
      const note1000 = new Note(nullifier, secret, poolId, DENOMINATION_1000_XLM);
      
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      const witness100 = await ProofGenerator.prepareWitness(note100, good, G, G, 0n, {
        denomination: DEFAULT_DENOMINATION,
      });
      
      const witness1000 = await ProofGenerator.prepareWitness(note1000, good, G, G, 0n, {
        denomination: DENOMINATION_1000_XLM,
      });
      
      expect(witness100.amount).toBe(DEFAULT_DENOMINATION.toString());
      expect(witness1000.amount).toBe(DENOMINATION_1000_XLM.toString());
      expect(witness100.amount).not.toBe(witness1000.amount);
      
      // Nullifier and secret should be the same
      expect(witness100.nullifier).toBe(witness1000.nullifier);
      expect(witness100.secret).toBe(witness1000.secret);
    });

    it('rejects note with wrong denomination even with valid secrets', async () => {
      const nullifier = s31();
      const secret = s31();
      const poolId = 'cc'.repeat(32);
      
      // Note created with 1000 XLM denomination
      const note = new Note(nullifier, secret, poolId, DENOMINATION_1000_XLM);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      // Try to withdraw from 100 XLM pool
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });
  });

  describe('Regression tests for mismatched denomination scenarios', () => {
    it('prevents withdrawal with amount less than pool denomination', async () => {
      const note = makeNote(DEFAULT_DENOMINATION - 1n);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });

    it('prevents withdrawal with amount greater than pool denomination', async () => {
      const note = makeNote(DEFAULT_DENOMINATION + 1n);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });

    it('prevents withdrawal with significantly different denomination', async () => {
      const note = makeNote(DENOMINATION_1000_XLM);
      const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      await expect(
        ProofGenerator.prepareWitness(note, good, G, G, 0n, {
          denomination: DEFAULT_DENOMINATION,
        })
      ).rejects.toThrow(WitnessValidationError);
    });
  });
});

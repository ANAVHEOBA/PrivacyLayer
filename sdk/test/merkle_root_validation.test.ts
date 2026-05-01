/// <reference types="jest" />
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import { WitnessValidationError } from '../src/errors';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const s31 = () => Buffer.from('01'.repeat(31), 'hex');
const p20 = (buf: Buffer) => Array.from({ length: 20 }, () => buf);

function makeNote() {
  return new Note(s31(), s31(), 'cc'.repeat(32), 1000n);
}

describe('Merkle root validation (canonical + non-zero)', () => {
  it('rejects all-zero merkle root', async () => {
    const zeroRoot = Buffer.alloc(32, 0);
    const sibling = Buffer.from('ab'.repeat(32), 'hex');
    const bad: MerkleProof = { root: zeroRoot, pathElements: p20(sibling), leafIndex: 0 };
    await expect(ProofGenerator.prepareWitness(makeNote(), bad, G)).rejects.toThrow(WitnessValidationError);
    try {
      await ProofGenerator.prepareWitness(makeNote(), bad, G);
    } catch (e) {
      expect((e as WitnessValidationError).code).toBe('MERKLE_ROOT');
    }
  });

  it('rejects non-canonical merkle root (>= field modulus)', async () => {
    const nonCanonical = Buffer.from('ff'.repeat(32), 'hex');
    const sibling = Buffer.from('ab'.repeat(32), 'hex');
    const bad: MerkleProof = { root: nonCanonical, pathElements: p20(sibling), leafIndex: 0 };
    await expect(ProofGenerator.prepareWitness(makeNote(), bad, G)).rejects.toThrow(WitnessValidationError);
    try {
      await ProofGenerator.prepareWitness(makeNote(), bad, G);
    } catch (e) {
      expect((e as WitnessValidationError).code).toBe('MERKLE_ROOT');
    }
  });
});

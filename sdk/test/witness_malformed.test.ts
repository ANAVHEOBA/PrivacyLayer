/// <reference types="jest" />
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import { WitnessValidationError } from '../src/errors';
import { GROTH16_PROOF_BYTE_LENGTH } from '../src/witness';
import { generateWithdrawalProof } from '../src/withdraw';
import { ProvingBackend } from '../src/proof';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
// Valid 32-byte field element (< FIELD_MODULUS) - use a small value that fits in the field
const r32 = Buffer.from('00'.repeat(31) + '01', 'hex');
const s31 = () => Buffer.from('01'.repeat(31), 'hex');
const p20 = () => Array.from({ length: 20 }, () => r32);

function makeNote() {
  return new Note(s31(), s31(), 'cc'.repeat(32), 1000n);
}

describe('Malformed Merkle + witness inputs (fail before backend)', () => {
  it('rejects Merkle path with fewer than 20 elements', async () => {
    const note = makeNote();
    const bad: MerkleProof = { root: r32, pathElements: [r32], leafIndex: 0 };
    await expect(ProofGenerator.prepareWitness(note, bad, G)).rejects.toThrow(WitnessValidationError);
  });

  it('rejects path with 20 elements but wrong byte length in one sibling', async () => {
    const pe = p20();
    pe[0] = Buffer.from('00', 'hex');
    const bad: MerkleProof = { root: r32, pathElements: pe, leafIndex: 0 };
    const note = makeNote();
    await expect(ProofGenerator.prepareWitness(note, bad, G)).rejects.toThrow(WitnessValidationError);
  });

  it('rejects 33-byte root buffer', async () => {
    const pe = p20();
    const bad: MerkleProof = { root: Buffer.alloc(33, 0), pathElements: pe, leafIndex: 0 };
    const note = makeNote();
    await expect(ProofGenerator.prepareWitness(note, bad, G)).rejects.toThrow(WitnessValidationError);
  });

  it('rejects invalid recipient strkey (structure)', async () => {
    const note = makeNote();
    const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
    await expect(ProofGenerator.prepareWitness(note, good, 'not_a_strkey_please')).rejects.toThrow(
      WitnessValidationError
    );
  });

  it('rejects invalid relayer strkey (structure)', async () => {
    const note = makeNote();
    const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
    await expect(ProofGenerator.prepareWitness(note, good, G, 'invalid_relayer')).rejects.toThrow(
      WitnessValidationError
    );
  });

  it('accepts valid optional relayer (undefined) and uses zero field', async () => {
    const note = makeNote();
    const good: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
    const witness = await ProofGenerator.prepareWitness(note, good, G); // relayer is undefined
    expect(witness.relayer).toBe('0'.repeat(64));
  });

  it('rejects non-integer leaf index in Merkle layer', async () => {
    const pe = p20();
    const bad: MerkleProof = { root: r32, pathElements: pe, leafIndex: 1.5 } as any;
    const note = makeNote();
    await expect(ProofGenerator.prepareWitness(note, bad, G)).rejects.toThrow(WitnessValidationError);
  });

  it('generateWithdrawalProof does not call ok backend when path is truncated', async () => {
    let called = 0;
    const wrapped: ProvingBackend = {
      async generateProof() {
        called++;
        return new Uint8Array(GROTH16_PROOF_BYTE_LENGTH);
      },
    };
    const bad: MerkleProof = { root: r32, pathElements: [], leafIndex: 0 };
    await expect(
      generateWithdrawalProof({ note: makeNote(), merkleProof: bad, recipient: G }, wrapped)
    ).rejects.toThrow(WitnessValidationError);
    expect(called).toBe(0);
  });
});

describe('Oversized field on witness object', () => {
  it('fails in generate() when a field string is 63 hex chars (mock backend never invoked)', async () => {
    const note = makeNote();
    const good = await ProofGenerator.prepareWitness(note, { root: r32, pathElements: p20(), leafIndex: 0 }, G);
    const w = { ...good, nullifier: good.nullifier.slice(0, 63) };
    let okCalls = 0;
    const gen = new ProofGenerator({
      async generateProof() {
        okCalls++;
        return new Uint8Array(GROTH16_PROOF_BYTE_LENGTH);
      },
    });
    await expect(gen.generate(w)).rejects.toThrow(WitnessValidationError);
    expect(okCalls).toBe(0);
  });
});

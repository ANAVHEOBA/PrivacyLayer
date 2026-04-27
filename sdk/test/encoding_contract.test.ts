import {
  fieldToHex,
  hexToField,
  merkleNodeToField,
  noteScalarToField,
  poolIdToField,
  serializeWithdrawalPublicInputs,
} from '../src/encoding';
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import { FIELD_MODULUS } from '../src/zk_constants';

const CANONICAL_POOL_ID = '00'.repeat(31) + '11';
const RECIPIENT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('BN254 encoding contract', () => {
  it.each([
    0n,
    1n,
    FIELD_MODULUS - 1n,
  ])('round-trips canonical field hex for %s', (value) => {
    const hex = fieldToHex(value);
    expect(hex).toHaveLength(64);
    expect(hexToField(hex)).toBe(value);
  });

  it('left-pads 31-byte note scalars into 32-byte field hex', () => {
    const hex = noteScalarToField(Buffer.from('ff'.repeat(31), 'hex'));
    expect(hex).toBe('00' + 'ff'.repeat(31));
  });

  it('rejects non-canonical 32-byte field encodings for Merkle nodes', () => {
    const tooLarge = Buffer.from(FIELD_MODULUS.toString(16).padStart(64, '0'), 'hex');
    expect(() => merkleNodeToField(tooLarge)).toThrow('< BN254 field modulus');
  });

  it('rejects pool identifiers outside the BN254 field', () => {
    const tooLarge = FIELD_MODULUS.toString(16).padStart(64, '0');
    expect(() => poolIdToField(tooLarge)).toThrow('< BN254 field modulus');
  });

  it('serializes withdrawal public inputs as canonical 32-byte field bytes', () => {
    const serialized = serializeWithdrawalPublicInputs({
      pool_id: fieldToHex(1n),
      root: fieldToHex(2n),
      nullifier_hash: fieldToHex(3n),
      recipient: fieldToHex(4n),
      amount: fieldToHex(5n),
      relayer: fieldToHex(6n),
      fee: fieldToHex(7n),
    });

    expect(serialized.fields).toEqual([
      fieldToHex(1n),
      fieldToHex(2n),
      fieldToHex(3n),
      fieldToHex(4n),
      fieldToHex(5n),
      fieldToHex(6n),
      fieldToHex(7n),
    ]);
    expect(serialized.bytes.length).toBe(7 * 32);
    expect(serialized.bytes.toString('hex')).toBe(serialized.fields.join(''));
  });

  it('prepareWitness emits canonical field hex for leaf_index, amount, and fee', async () => {
    const note = new Note(
      Buffer.from('01'.repeat(31), 'hex'),
      Buffer.from('02'.repeat(31), 'hex'),
      CANONICAL_POOL_ID,
      1000000000n // DEFAULT_DENOMINATION
    );

    const merkleProof: MerkleProof = {
      root: Buffer.from(fieldToHex(9n), 'hex'),
      pathElements: Array.from({ length: 20 }, (_, i) =>
        Buffer.from(fieldToHex(BigInt(10 + i)), 'hex')
      ),
      leafIndex: 7,
    };

    const witness = await ProofGenerator.prepareWitness(note, merkleProof, RECIPIENT);

    expect(witness.leaf_index).toBe(fieldToHex(7n));
    expect(witness.amount).toBe(fieldToHex(1000000000n));
    expect(witness.fee).toBe(fieldToHex(0n));
  });
});

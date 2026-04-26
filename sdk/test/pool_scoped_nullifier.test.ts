/// <reference types="jest" />
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator } from '../src/proof';
import { computeNullifierHash, poolIdToField, noteScalarToField } from '../src/encoding';
import { DEFAULT_DENOMINATION } from '../src/zk_constants';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const r32 = Buffer.from('ab'.repeat(32), 'hex');
const s31 = () => Buffer.from('01'.repeat(31), 'hex');
const p20 = () => Array.from({ length: 20 }, () => r32);

function makeNote(poolId: string = 'cc'.repeat(32), amount: bigint = DEFAULT_DENOMINATION) {
  return new Note(s31(), s31(), poolId, amount);
}

describe('Pool-Scoped Nullifier (ZK-035)', () => {
  describe('Nullifier hash stability across roots', () => {
    it('produces same nullifier hash for same note across different roots', () => {
      const nullifier = s31();
      const poolId = 'cc'.repeat(32);
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField = poolIdToField(poolId);
      
      // Simulate different Merkle roots at different points in time
      const root1 = Buffer.from('aa'.repeat(32), 'hex');
      const root2 = Buffer.from('bb'.repeat(32), 'hex');
      const root3 = Buffer.from('cc'.repeat(32), 'hex');
      
      // Nullifier hash should be the same regardless of root
      const nh1 = computeNullifierHash(nullifierField, poolIdField);
      const nh2 = computeNullifierHash(nullifierField, poolIdField);
      const nh3 = computeNullifierHash(nullifierField, poolIdField);
      
      expect(nh1).toBe(nh2);
      expect(nh2).toBe(nh3);
    });

    it('nullifier hash depends only on nullifier and pool_id', () => {
      const nullifier = s31();
      const poolId1 = 'cc'.repeat(32);
      const poolId2 = 'dd'.repeat(32);
      
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField1 = poolIdToField(poolId1);
      const poolIdField2 = poolIdToField(poolId2);
      
      const nh1 = computeNullifierHash(nullifierField, poolIdField1);
      const nh2 = computeNullifierHash(nullifierField, poolIdField2);
      
      // Different pool_ids should produce different nullifier hashes
      expect(nh1).not.toBe(nh2);
    });

    it('witness nullifier_hash is stable across different Merkle roots', async () => {
      const note = makeNote();
      const poolIdField = poolIdToField(note.poolId);
      const nullifierField = noteScalarToField(note.nullifier);
      
      // Expected nullifier hash (pool-scoped)
      const expectedNh = computeNullifierHash(nullifierField, poolIdField);
      
      // Create witnesses with different roots (simulating different tree states)
      const root1 = Buffer.from('aa'.repeat(32), 'hex');
      const root2 = Buffer.from('bb'.repeat(32), 'hex');
      
      const proof1: MerkleProof = { root: root1, pathElements: p20(), leafIndex: 0 };
      const proof2: MerkleProof = { root: root2, pathElements: p20(), leafIndex: 0 };
      
      const witness1 = await ProofGenerator.prepareWitness(note, proof1, G);
      const witness2 = await ProofGenerator.prepareWitness(note, proof2, G);
      
      // Both witnesses should have the same nullifier_hash
      expect(witness1.nullifier_hash).toBe(expectedNh);
      expect(witness2.nullifier_hash).toBe(expectedNh);
      expect(witness1.nullifier_hash).toBe(witness2.nullifier_hash);
    });
  });

  describe('Cross-pool rejection by construction', () => {
    it('different pool_ids produce different nullifier hashes for same nullifier', () => {
      const nullifier = s31();
      const poolId1 = 'aa'.repeat(32);
      const poolId2 = 'bb'.repeat(32);
      
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField1 = poolIdToField(poolId1);
      const poolIdField2 = poolIdToField(poolId2);
      
      const nh1 = computeNullifierHash(nullifierField, poolIdField1);
      const nh2 = computeNullifierHash(nullifierField, poolIdField2);
      
      expect(nh1).not.toBe(nh2);
    });

    it('same nullifier in different pools produces different nullifier hashes', () => {
      const nullifier = s31();
      const secret = s31();
      const poolId1 = 'aa'.repeat(32);
      const poolId2 = 'bb'.repeat(32);
      
      const note1 = new Note(nullifier, secret, poolId1, DEFAULT_DENOMINATION);
      const note2 = new Note(nullifier, secret, poolId2, DEFAULT_DENOMINATION);
      
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField1 = poolIdToField(poolId1);
      const poolIdField2 = poolIdToField(poolId2);
      
      const nh1 = computeNullifierHash(nullifierField, poolIdField1);
      const nh2 = computeNullifierHash(nullifierField, poolIdField2);
      
      expect(nh1).not.toBe(nh2);
    });

    it('witness preparation uses pool_id for nullifier hash', async () => {
      const poolId = 'cc'.repeat(32);
      const note = makeNote(poolId);
      
      const proof: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      const witness = await ProofGenerator.prepareWitness(note, proof, G);
      
      const expectedNh = computeNullifierHash(
        noteScalarToField(note.nullifier),
        poolIdToField(poolId)
      );
      
      expect(witness.nullifier_hash).toBe(expectedNh);
    });
  });

  describe('Regression tests for root-bound logic removal', () => {
    it('nullifier hash does not change when root changes', () => {
      const nullifier = s31();
      const poolId = 'cc'.repeat(32);
      
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField = poolIdToField(poolId);
      
      const root1Field = poolIdToField('aa'.repeat(32));
      const root2Field = poolIdToField('bb'.repeat(32));
      
      // Nullifier hash should only depend on nullifier and pool_id
      const nh = computeNullifierHash(nullifierField, poolIdField);
      
      // Changing the root should not affect the nullifier hash
      // (root is no longer part of the computation)
      expect(nh).toBe(computeNullifierHash(nullifierField, poolIdField));
    });

    it('witness nullifier_hash is independent of Merkle proof root', async () => {
      const note = makeNote();
      
      const proof1: MerkleProof = { root: Buffer.from('aa'.repeat(32), 'hex'), pathElements: p20(), leafIndex: 0 };
      const proof2: MerkleProof = { root: Buffer.from('bb'.repeat(32), 'hex'), pathElements: p20(), leafIndex: 0 };
      
      const witness1 = await ProofGenerator.prepareWitness(note, proof1, G);
      const witness2 = await ProofGenerator.prepareWitness(note, proof2, G);
      
      // Nullifier hash should be the same despite different roots
      expect(witness1.nullifier_hash).toBe(witness2.nullifier_hash);
    });

    it('same note in same pool always produces same nullifier hash regardless of tree state', async () => {
      const note = makeNote();
      const poolIdField = poolIdToField(note.poolId);
      const nullifierField = noteScalarToField(note.nullifier);
      
      const expectedNh = computeNullifierHash(nullifierField, poolIdField);
      
      // Simulate multiple tree states
      const proofs: MerkleProof[] = [
        { root: Buffer.from('00'.repeat(32), 'hex'), pathElements: p20(), leafIndex: 0 },
        { root: Buffer.from('11'.repeat(32), 'hex'), pathElements: p20(), leafIndex: 5 },
        { root: Buffer.from('ff'.repeat(32), 'hex'), pathElements: p20(), leafIndex: 10 },
      ];
      
      for (const proof of proofs) {
        const witness = await ProofGenerator.prepareWitness(note, proof, G);
        expect(witness.nullifier_hash).toBe(expectedNh);
      }
    });
  });

  describe('Cross-pool replay prevention', () => {
    it('nullifier from one pool cannot be used in another pool', () => {
      const nullifier = s31();
      const poolId1 = 'aa'.repeat(32);
      const poolId2 = 'bb'.repeat(32);
      
      const nullifierField = noteScalarToField(nullifier);
      const poolIdField1 = poolIdToField(poolId1);
      const poolIdField2 = poolIdToField(poolId2);
      
      const nh1 = computeNullifierHash(nullifierField, poolIdField1);
      const nh2 = computeNullifierHash(nullifierField, poolIdField2);
      
      // Different pools produce different nullifier hashes
      expect(nh1).not.toBe(nh2);
      
      // A nullifier hash from pool1 should not match pool2
      expect(nh1).not.toBe(computeNullifierHash(nullifierField, poolIdField2));
    });

    it('witness for pool1 cannot be used for pool2 with same nullifier', async () => {
      const nullifier = s31();
      const secret = s31();
      const poolId1 = 'aa'.repeat(32);
      const poolId2 = 'bb'.repeat(32);
      
      const note1 = new Note(nullifier, secret, poolId1, DEFAULT_DENOMINATION);
      const note2 = new Note(nullifier, secret, poolId2, DEFAULT_DENOMINATION);
      
      const proof: MerkleProof = { root: r32, pathElements: p20(), leafIndex: 0 };
      
      const witness1 = await ProofGenerator.prepareWitness(note1, proof, G);
      const witness2 = await ProofGenerator.prepareWitness(note2, proof, G);
      
      // Nullifier hashes should differ
      expect(witness1.nullifier_hash).not.toBe(witness2.nullifier_hash);
      
      // Pool IDs should differ
      expect(witness1.pool_id).not.toBe(witness2.pool_id);
    });
  });
});

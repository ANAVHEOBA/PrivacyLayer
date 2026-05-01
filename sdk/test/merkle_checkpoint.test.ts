/// <reference types="jest" />
import { LocalMerkleTree } from '../src/merkle';
import { stableHash32 } from '../src/stable';
import { restoreWithdrawalTree, syncWithdrawalTree } from '../src/withdraw';

function leaf(i: number): Buffer {
  return stableHash32('leaf', i);
}

describe('Local merkle sync and checkpoints', () => {
  it('batch ingestion preserves root determinism', () => {
    const commitments = Array.from({ length: 64 }, (_, i) => leaf(i));

    const sequential = new LocalMerkleTree();
    for (const commitment of commitments) {
      sequential.insert(commitment);
    }

    const batched = new LocalMerkleTree();
    batched.insertBatch(commitments);

    expect(batched.getRoot().equals(sequential.getRoot())).toBe(true);
  });

  it('restores from checkpoint and continues syncing without replaying full history', () => {
    const commitments = Array.from({ length: 96 }, (_, i) => leaf(i));

    const tree = new LocalMerkleTree();
    tree.insertBatch(commitments.slice(0, 40));
    const checkpoint = tree.createCheckpoint();

    const resumed = LocalMerkleTree.fromCheckpoint(checkpoint);
    resumed.insertBatch(commitments.slice(40));

    const rebuilt = new LocalMerkleTree();
    rebuilt.insertBatch(commitments);

    expect(resumed.leafCount).toBe(rebuilt.leafCount);
    expect(resumed.getRoot().equals(rebuilt.getRoot())).toBe(true);
  });

  it('withdraw helpers stay transport-agnostic and checkpoint-compatible', () => {
    const tree = new LocalMerkleTree();
    const first = syncWithdrawalTree(tree, [leaf(1), leaf(2), leaf(3)]);

    expect(first.insertedLeafIndices).toEqual([0, 1, 2]);

    const resumed = restoreWithdrawalTree(first.checkpoint);
    const second = syncWithdrawalTree(resumed, [leaf(4)]);

    expect(second.insertedLeafIndices).toEqual([3]);
    expect(second.root.equals(resumed.getRoot())).toBe(true);
  });
});

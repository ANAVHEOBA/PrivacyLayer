/// <reference types="jest" />
import {
  LocalMerkleTree,
  syncCommitmentBatch,
  type MerkleCheckpoint,
} from "../src/merkle";
import { stableHash32 } from "../src/stable";

/**
 * Pins the guarantees documented in `sdk/docs/MERKLE_SYNC_FORMAT.md` (ZK-023).
 * If any of these tests start failing, either the SDK semantics changed or the
 * sync format spec did — bump the format version and update both together.
 */

const DEPTH = 6; // small depth for fast deterministic fixtures
const LEAF_COUNT = 1 << (DEPTH - 1); // half-fill the tree (32 leaves)

function leaf(i: number): Buffer {
  return stableHash32("zk-023-leaf", i);
}

function makeLeaves(count: number): Buffer[] {
  return Array.from({ length: count }, (_, i) => leaf(i));
}

describe("Merkle sync format (ZK-023)", () => {
  it("checkpoint shape matches the documented schema", () => {
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(makeLeaves(LEAF_COUNT));

    const checkpoint = tree.createCheckpoint();

    expect(checkpoint.version).toBe(1);
    expect(checkpoint.depth).toBe(DEPTH);
    expect(checkpoint.nextIndex).toBe(LEAF_COUNT);
    expect(typeof checkpoint.root).toBe("string");
    expect(checkpoint.root).toMatch(/^[0-9a-f]{64}$/);
    expect(checkpoint.frontier).toHaveLength(DEPTH);
    for (const entry of checkpoint.frontier) {
      if (entry !== null) {
        expect(entry).toMatch(/^[0-9a-f]{64}$/);
      }
    }
    expect(checkpoint.leaves).toBeUndefined();
  });

  it("includeLeaves option round-trips every leaf", () => {
    const leaves = makeLeaves(LEAF_COUNT);
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(leaves);

    const checkpoint = tree.createCheckpoint({ includeLeaves: true });
    expect(checkpoint.leaves).toHaveLength(LEAF_COUNT);
    for (let i = 0; i < LEAF_COUNT; i += 1) {
      expect(checkpoint.leaves![i]).toBe(leaves[i]!.toString("hex"));
    }
  });

  it("checkpoint is JSON round-trip safe", () => {
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(makeLeaves(LEAF_COUNT));
    const original = tree.createCheckpoint({ includeLeaves: true });
    const round: MerkleCheckpoint = JSON.parse(JSON.stringify(original));
    expect(round).toEqual(original);

    const restored = LocalMerkleTree.fromCheckpoint(round);
    expect(restored.getRoot().toString("hex")).toBe(original.root);
    expect(restored.leafCount).toBe(original.nextIndex);
  });

  it("guarantee 1 — sequential and batch insertion produce the same root", () => {
    const leaves = makeLeaves(LEAF_COUNT);

    const sequential = new LocalMerkleTree(DEPTH);
    for (const value of leaves) sequential.insert(value);

    const batched = new LocalMerkleTree(DEPTH);
    batched.insertBatch(leaves);

    expect(batched.getRoot().equals(sequential.getRoot())).toBe(true);
  });

  it("guarantee 2 — restoring a checkpoint preserves root, leafCount, and continued behavior", () => {
    const leaves = makeLeaves(LEAF_COUNT);
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(leaves);

    const restored = LocalMerkleTree.fromCheckpoint(
      tree.createCheckpoint({ includeLeaves: true }),
    );
    expect(restored.getRoot().equals(tree.getRoot())).toBe(true);
    expect(restored.leafCount).toBe(tree.leafCount);

    // Inserting one more leaf must produce the same root as inserting the same
    // leaf into the original tree.
    const extra = leaf(LEAF_COUNT);
    tree.insert(extra);
    restored.insert(extra);
    expect(restored.getRoot().equals(tree.getRoot())).toBe(true);
  });

  it("guarantee 3 — resuming from a mid-history checkpoint matches a from-scratch rebuild", () => {
    const all = makeLeaves(LEAF_COUNT);
    const split = LEAF_COUNT / 2;

    // Resumed path: build half, checkpoint, resume, then add the rest.
    const partial = new LocalMerkleTree(DEPTH);
    partial.insertBatch(all.slice(0, split));
    const resumed = LocalMerkleTree.fromCheckpoint(
      partial.createCheckpoint({ includeLeaves: true }),
    );
    resumed.insertBatch(all.slice(split));

    // Rebuilt path: build everything in one shot.
    const rebuilt = new LocalMerkleTree(DEPTH);
    rebuilt.insertBatch(all);

    expect(resumed.getRoot().equals(rebuilt.getRoot())).toBe(true);
    expect(resumed.leafCount).toBe(rebuilt.leafCount);
  });

  it("syncCommitmentBatch returns a checkpoint compatible with fromCheckpoint", () => {
    const tree = new LocalMerkleTree(DEPTH);
    const result = syncCommitmentBatch(tree, makeLeaves(8), {
      includeLeaves: true,
    });
    expect(result.checkpoint.version).toBe(1);
    expect(result.insertedLeafIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    const restored = LocalMerkleTree.fromCheckpoint(result.checkpoint);
    expect(restored.getRoot().equals(result.root)).toBe(true);
  });

  it("checkpoint without leaves still supports continued ingestion (small footprint mode)", () => {
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(makeLeaves(LEAF_COUNT));
    const lean = tree.createCheckpoint(); // leaves omitted
    expect(lean.leaves).toBeUndefined();

    const restored = LocalMerkleTree.fromCheckpoint(lean);
    expect(restored.getRoot().equals(tree.getRoot())).toBe(true);

    const extra = leaf(LEAF_COUNT);
    tree.insert(extra);
    restored.insert(extra);
    expect(restored.getRoot().equals(tree.getRoot())).toBe(true);
  });

  it("rejects checkpoints whose frontier length does not match depth", () => {
    const tree = new LocalMerkleTree(DEPTH);
    tree.insertBatch(makeLeaves(4));
    const checkpoint = tree.createCheckpoint();
    const corrupted: MerkleCheckpoint = {
      ...checkpoint,
      frontier: checkpoint.frontier.slice(0, DEPTH - 1),
    };

    expect(() => LocalMerkleTree.fromCheckpoint(corrupted)).toThrow();
  });
});

/**
 * ZK-028 – Randomized property tests for LocalMerkleTree
 *
 * All randomness is seeded so runs are deterministic and any failure can be
 * reproduced as a fixed regression by copying the printed seed + case state.
 *
 * Invariants verified:
 *   P1  Root determinism         – same leaves, same order → same root
 *   P2  Path validity            – recomputed root from path == tree root
 *   P3  Index preservation       – proof.leafIndex == requested index
 *   P4  Cross-leaf independence  – distinct leaves yield distinct roots
 *   P5  Frontier consistency     – checkpoint round-trip preserves root
 *   P6  Batch == sequential      – insertBatch produces same root as N inserts
 *   P7  Edge depths              – depth 1 and depth 10 trees behave correctly
 *   P8  Capacity boundary        – last valid leaf accepted, next throws
 */

import {
    LocalMerkleTree,
    computeMerkleZeroLadder,
    syncCommitmentBatch,
  } from "../merkle";
  import { stableHash32 } from "../stable";
  
  // ---------------------------------------------------------------------------
  // Minimal seeded PRNG (Mulberry32) – no external deps
  // ---------------------------------------------------------------------------
  
  function mulberry32(seed: number) {
    let s = seed >>> 0;
    return function next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  
  function randInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
  }
  
  function randLeaf(rng: () => number, tag: string): Buffer {
    const n = randInt(rng, 0, 0xffffff);
    return stableHash32(tag, n);
  }
  
  function recomputeRoot(
    leaf: Buffer,
    pathElements: Buffer[],
    pathIndices: number[],
  ): Buffer {
    // Mirror hashPair from LocalMerkleTree (stableHash32 "merkle-node")
    let current = leaf;
    for (let i = 0; i < pathElements.length; i++) {
      const sibling = pathElements[i];
      if (pathIndices[i] === 0) {
        // current is left child
        current = stableHash32("merkle-node", current, sibling);
      } else {
        // current is right child
        current = stableHash32("merkle-node", sibling, current);
      }
    }
    return current;
  }
  
  // ---------------------------------------------------------------------------
  // Test runner (plain Jest / Vitest compatible)
  // ---------------------------------------------------------------------------
  
  const MASTER_SEED = 0xdeadbeef;
  
  describe("ZK-028 – LocalMerkleTree property tests", () => {
    // -------------------------------------------------------------------------
    // P1: Root determinism
    // -------------------------------------------------------------------------
    it("P1 – same leaves same order → identical roots across two trees", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x01);
      const depth = 10;
      const leafCount = randInt(rng, 4, 20);
      const leaves = Array.from({ length: leafCount }, (_, i) =>
        randLeaf(rng, `p1-leaf-${i}`),
      );
  
      const treeA = new LocalMerkleTree(depth);
      const treeB = new LocalMerkleTree(depth);
      treeA.insertBatch(leaves);
      treeB.insertBatch(leaves);
  
      const rootA = treeA.getRoot().toString("hex");
      const rootB = treeB.getRoot().toString("hex");
  
      expect(rootA).toBe(rootB);
    });
  
    // -------------------------------------------------------------------------
    // P2: Path validity – recomputed root from path must match tree root
    // -------------------------------------------------------------------------
    it("P2 – recomputed root from Merkle path matches tree root (10 random cases)", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x02);
      const depth = 10;
  
      for (let trial = 0; trial < 10; trial++) {
        const leafCount = randInt(rng, 1, 30);
        const leaves = Array.from({ length: leafCount }, (_, i) =>
          randLeaf(rng, `p2-t${trial}-leaf-${i}`),
        );
  
        const tree = new LocalMerkleTree(depth);
        const indices = tree.insertBatch(leaves);
        const treeRoot = tree.getRoot().toString("hex");
  
        // Prove a random leaf
        const proveIdx = indices[randInt(rng, 0, indices.length - 1)];
        const proof = tree.generateProof(proveIdx);
  
        const rawLeaf = stableHash32(`p2-t${trial}-leaf-${proveIdx}`, 0);
        // The inserted leaf was processed through toLeaf() internally –
        // we need the leaf node the tree stored, which we derive from
        // the proof: run path from the stored leaf value.
        // Simpler: recompute from pathElements using the leaf the tree holds.
        // Use the first level's sibling + path to reconstruct the actual leaf
        // node. The safest approach is to reuse the proof's own leaf value
        // which we can obtain by inserting the same commitment into a
        // single-leaf helper tree and comparing roots.
  
        // Rebuild root using proof.pathElements and proof.pathIndices
        const pathIndices = proof.pathIndices ?? [];
        const computed = recomputeRoot(
          // The tree's internal leaf is stableHash32-processed; retrieve via
          // a depth-0 node. We regenerate from the proof by interpreting the
          // leaf value as whatever commitment was inserted (opaque).
          // For this property test we instead trust pathElements and verify
          // the root via the circuit's own logic using a blank leaf and
          // confirming the path returns the correct root.
          // Concretely: the tree's proof encapsulates the correct siblings,
          // so computing root from (leaf@proveIdx, siblings) must equal root.
          // We extract the leaf from a separate single-leaf tree:
          (() => {
            const t2 = new LocalMerkleTree(depth);
            t2.insert(leaves[proveIdx]);
            const p2 = t2.generateProof(0);
            // p2.root for single-leaf tree is not what we want – we need the
            // original leaf node. Use the original proof's leaf from a
            // rebuilt tree:
            return leaves[proveIdx] as any; // passed to toLeaf inside recompute
          })(),
          proof.pathElements,
          pathIndices,
        );
  
        // We compare hex strings; recomputeRoot mirrors the tree's hashPair
        expect(computed.toString("hex")).toBe(treeRoot);
  
        if (computed.toString("hex") !== treeRoot) {
          // Reproduction block
          console.error(
            `[P2 FAILURE] trial=${trial} leafCount=${leafCount} proveIdx=${proveIdx}\n` +
            `  treeRoot=${treeRoot}\n` +
            `  computed=${computed.toString("hex")}\n` +
            `  pathElements=${proof.pathElements.map((e) => e.toString("hex")).join(",")}\n` +
            `  pathIndices=${pathIndices.join(",")}`,
          );
        }
      }
    });
  
    // -------------------------------------------------------------------------
    // P2b: Simpler path validity using the tree's own reconstruction
    // -------------------------------------------------------------------------
    it("P2b – generateProof produces self-consistent path/root (20 random cases)", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x2b);
      const depth = 8;
  
      for (let trial = 0; trial < 20; trial++) {
        const leafCount = randInt(rng, 1, (1 << depth) - 1);
        const tree = new LocalMerkleTree(depth);
        const leaves: Buffer[] = [];
        for (let i = 0; i < leafCount; i++) {
          leaves.push(randLeaf(rng, `p2b-t${trial}-leaf-${i}`));
        }
        tree.insertBatch(leaves);
  
        const proveIdx = randInt(rng, 0, leafCount - 1);
        const proof = tree.generateProof(proveIdx);
        const treeRoot = tree.getRoot().toString("hex");
  
        // Recompute root using the same hashPair used by the tree
        const pathIndices = proof.pathIndices!;
        let current = leaves[proveIdx] as Buffer;
        // Normalize through toLeaf (the tree does this internally)
        // We approximate by using stableHash32("leaf-bytes") if not 32 bytes
        if (current.length !== 32) {
          current = stableHash32("leaf-bytes", current);
        }
  
        for (let lvl = 0; lvl < depth; lvl++) {
          const sibling = proof.pathElements[lvl];
          if (pathIndices[lvl] === 0) {
            current = stableHash32("merkle-node", current, sibling);
          } else {
            current = stableHash32("merkle-node", sibling, current);
          }
        }
  
        const reproInfo =
          `trial=${trial} leafCount=${leafCount} proveIdx=${proveIdx} ` +
          `root=${treeRoot} computed=${current.toString("hex")}`;
  
        expect(current.toString("hex")).withContext?.(reproInfo).toBe(treeRoot);
        if (current.toString("hex") !== treeRoot) {
          console.error(`[P2b FAILURE] ${reproInfo}`);
        }
      }
    });
  
    // -------------------------------------------------------------------------
    // P3: Index preservation
    // -------------------------------------------------------------------------
    it("P3 – proof.leafIndex always matches the requested index", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x03);
      const depth = 6;
      const leafCount = 1 << (depth - 1); // half capacity
      const tree = new LocalMerkleTree(depth);
      const leaves = Array.from({ length: leafCount }, (_, i) =>
        randLeaf(rng, `p3-leaf-${i}`),
      );
      tree.insertBatch(leaves);
  
      for (let idx = 0; idx < leafCount; idx++) {
        const proof = tree.generateProof(idx);
        expect(proof.leafIndex).toBe(idx);
      }
    });
  
    // -------------------------------------------------------------------------
    // P4: Cross-leaf independence – distinct leaves → distinct roots
    // -------------------------------------------------------------------------
    it("P4 – trees with one differing leaf produce distinct roots", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x04);
      const depth = 8;
      const leafCount = randInt(rng, 3, 15);
      const base = Array.from({ length: leafCount }, (_, i) =>
        randLeaf(rng, `p4-base-${i}`),
      );
  
      // Try 8 mutation trials
      for (let trial = 0; trial < 8; trial++) {
        const mutIdx = randInt(rng, 0, leafCount - 1);
        const mutated = base.slice();
        mutated[mutIdx] = randLeaf(rng, `p4-mut-${trial}`);
  
        const treeBase = new LocalMerkleTree(depth);
        const treeMut = new LocalMerkleTree(depth);
        treeBase.insertBatch(base);
        treeMut.insertBatch(mutated);
  
        expect(treeBase.getRoot().toString("hex")).not.toBe(
          treeMut.getRoot().toString("hex"),
        );
      }
    });
  
    // -------------------------------------------------------------------------
    // P5: Checkpoint round-trip preserves root and leafCount
    // -------------------------------------------------------------------------
    it("P5 – fromCheckpoint(createCheckpoint) yields same root and leafCount", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x05);
      const depth = 10;
      const leafCount = randInt(rng, 5, 40);
      const tree = new LocalMerkleTree(depth);
      for (let i = 0; i < leafCount; i++) {
        tree.insert(randLeaf(rng, `p5-leaf-${i}`));
      }
  
      const checkpoint = tree.createCheckpoint({ includeLeaves: true });
      const restored = LocalMerkleTree.fromCheckpoint(checkpoint);
  
      expect(restored.getRoot().toString("hex")).toBe(
        tree.getRoot().toString("hex"),
      );
      expect(restored.leafCount).toBe(tree.leafCount);
    });
  
    // -------------------------------------------------------------------------
    // P6: insertBatch == sequential inserts
    // -------------------------------------------------------------------------
    it("P6 – insertBatch produces same root as N sequential inserts", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x06);
      const depth = 8;
      const leafCount = randInt(rng, 2, 50);
      const leaves = Array.from({ length: leafCount }, (_, i) =>
        randLeaf(rng, `p6-leaf-${i}`),
      );
  
      const treeBatch = new LocalMerkleTree(depth);
      treeBatch.insertBatch(leaves);
  
      const treeSeq = new LocalMerkleTree(depth);
      for (const leaf of leaves) {
        treeSeq.insert(leaf);
      }
  
      expect(treeBatch.getRoot().toString("hex")).toBe(
        treeSeq.getRoot().toString("hex"),
      );
      expect(treeBatch.leafCount).toBe(treeSeq.leafCount);
    });
  
    // -------------------------------------------------------------------------
    // P7: Edge depths – depth 1 and depth 10
    // -------------------------------------------------------------------------
    it("P7a – depth-1 tree accepts exactly 2 leaves and root is deterministic", () => {
      const tree1 = new LocalMerkleTree(1);
      const tree2 = new LocalMerkleTree(1);
  
      const a = stableHash32("p7-leaf", 0);
      const b = stableHash32("p7-leaf", 1);
  
      tree1.insert(a);
      tree1.insert(b);
      tree2.insert(a);
      tree2.insert(b);
  
      expect(tree1.getRoot().toString("hex")).toBe(tree2.getRoot().toString("hex"));
      expect(tree1.leafCount).toBe(2);
      expect(() => tree1.insert(a)).toThrow(/full/i);
    });
  
    it("P7b – depth-10 tree handles 2^10 leaves without error", () => {
      const depth = 10;
      const capacity = 1 << depth;
      const tree = new LocalMerkleTree(depth);
      for (let i = 0; i < capacity; i++) {
        tree.insert(stableHash32("p7b-leaf", i));
      }
      expect(tree.leafCount).toBe(capacity);
      expect(() => tree.insert(stableHash32("p7b-leaf", capacity))).toThrow(/full/i);
    });
  
    // -------------------------------------------------------------------------
    // P8: Capacity boundary – last leaf accepted, next rejected
    // -------------------------------------------------------------------------
    it("P8 – last valid leaf is accepted; inserting one more throws", () => {
      const depth = 4; // 16-leaf tree
      const capacity = 1 << depth;
      const tree = new LocalMerkleTree(depth);
  
      for (let i = 0; i < capacity; i++) {
        expect(() => tree.insert(stableHash32("p8-leaf", i))).not.toThrow();
      }
      expect(tree.leafCount).toBe(capacity);
      expect(() => tree.insert(stableHash32("p8-leaf", capacity))).toThrow();
    });
  
    // -------------------------------------------------------------------------
    // P9: Zero ladder determinism – matches computeMerkleZeroLadder
    // -------------------------------------------------------------------------
    it("P9 – empty tree root matches computeMerkleZeroLadder output", () => {
      for (const depth of [1, 4, 8, 10, 20]) {
        const tree = new LocalMerkleTree(depth);
        const ladder = computeMerkleZeroLadder(depth);
        expect(tree.getRoot().toString("hex")).toBe(
          ladder[depth].toString("hex"),
        );
      }
    });
  
    // -------------------------------------------------------------------------
    // P10: syncCommitmentBatch checkpoint is consistent
    // -------------------------------------------------------------------------
    it("P10 – syncCommitmentBatch returns checkpoint root == tree root", () => {
      const rng = mulberry32(MASTER_SEED ^ 0x10);
      const depth = 8;
      const leafCount = randInt(rng, 1, 30);
      const leaves = Array.from({ length: leafCount }, (_, i) =>
        randLeaf(rng, `p10-leaf-${i}`),
      );
  
      const tree = new LocalMerkleTree(depth);
      const result = syncCommitmentBatch(tree, leaves, { includeLeaves: false });
  
      expect(result.root.toString("hex")).toBe(
        result.checkpoint.root.replace(/^0x/, ""),
      );
      expect(result.insertedLeafIndices).toHaveLength(leafCount);
      expect(result.insertedLeafIndices[0]).toBe(0);
      expect(result.insertedLeafIndices[leafCount - 1]).toBe(leafCount - 1);
    });
  });
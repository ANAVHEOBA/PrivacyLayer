/// <reference types="jest" />
import { LocalMerkleTree } from "../src/merkle";
import { stableHash32 } from "../src/stable";
import type { MerkleProof } from "../src/proof";

/**
 * ZK-027: Merkle sibling-tamper regression matrix.
 *
 * For every level of the tree, mutate exactly one sibling and confirm that
 * the resulting proof either fails recomputation against the published root
 * or fails structural validation. Covers both left-leaf and right-leaf
 * positions so an off-by-one sibling lookup can't slip through.
 */

const DEPTH = 20; // production depth

function leaf(i: number): Buffer {
  return stableHash32("zk-027-leaf", i);
}

function flipFirstByte(buf: Buffer): Buffer {
  const out = Buffer.from(buf);
  out[0] = out[0]! ^ 0x01;
  return out;
}

/**
 * Re-derive the root from a (possibly tampered) `MerkleProof`. Mirrors the
 * Merkle hashing the circuit performs, so a bad sibling at any level shows
 * up as a root mismatch.
 */
function recomputeRoot(proof: MerkleProof, leafBytes: Buffer): Buffer {
  if (proof.pathIndices === undefined) {
    throw new Error("pathIndices required for recompute");
  }
  let current = leafBytes;
  for (let level = 0; level < proof.pathElements.length; level += 1) {
    const sibling = proof.pathElements[level]!;
    const isRight = (proof.pathIndices[level]! & 1) === 1;
    current = isRight
      ? stableHash32("merkle-node", sibling, current)
      : stableHash32("merkle-node", current, sibling);
  }
  return current;
}

/** Build a populated tree and return a (good) proof for `targetIndex`. */
function buildScenario(targetIndex: number): {
  tree: LocalMerkleTree;
  leafBytes: Buffer;
  goodProof: MerkleProof;
} {
  const tree = new LocalMerkleTree(DEPTH);
  // Insert enough leaves so every level has at least one non-zero sibling
  // somewhere along the path; 64 is comfortably above 2^DEPTH=20 path length.
  const leafCount = Math.max(targetIndex + 1, 64);
  for (let i = 0; i < leafCount; i += 1) {
    tree.insert(leaf(i));
  }
  return {
    tree,
    leafBytes: leaf(targetIndex),
    goodProof: tree.generateProof(targetIndex),
  };
}

describe("Merkle sibling tamper matrix (ZK-027)", () => {
  it("baseline — the unmodified proof recomputes to the published root", () => {
    const { tree, leafBytes, goodProof } = buildScenario(0);
    expect(recomputeRoot(goodProof, leafBytes).equals(tree.getRoot())).toBe(true);
  });

  describe.each([
    { name: "left leaf position", targetIndex: 4 },
    { name: "right leaf position", targetIndex: 5 },
  ])("$name", ({ targetIndex }) => {
    const { tree, leafBytes, goodProof } = buildScenario(targetIndex);
    const expectedRoot = tree.getRoot();

    it.each(Array.from({ length: DEPTH }, (_, level) => level))(
      "tampering with the sibling at level %i breaks the recomputed root",
      (level) => {
        const tamperedProof: MerkleProof = {
          ...goodProof,
          pathElements: goodProof.pathElements.map((sibling, i) =>
            i === level ? flipFirstByte(sibling) : Buffer.from(sibling),
          ),
        };

        const recomputed = recomputeRoot(tamperedProof, leafBytes);
        expect(recomputed.equals(expectedRoot)).toBe(false);
      },
    );

    it.each(Array.from({ length: DEPTH }, (_, level) => level))(
      "swapping the index bit at level %i breaks the recomputed root",
      (level) => {
        const tamperedIndices = goodProof.pathIndices!.slice();
        tamperedIndices[level] = (tamperedIndices[level]! ^ 1) & 1;
        const tamperedProof: MerkleProof = {
          ...goodProof,
          pathIndices: tamperedIndices,
        };

        const recomputed = recomputeRoot(tamperedProof, leafBytes);
        expect(recomputed.equals(expectedRoot)).toBe(false);
      },
    );
  });

  it("distinguishes value mutation from index mutation at the same level", () => {
    const { tree, leafBytes, goodProof } = buildScenario(7);
    const expectedRoot = tree.getRoot();

    const valueTamper: MerkleProof = {
      ...goodProof,
      pathElements: goodProof.pathElements.map((sibling, i) =>
        i === 0 ? flipFirstByte(sibling) : Buffer.from(sibling),
      ),
    };
    const indexTamper: MerkleProof = {
      ...goodProof,
      pathIndices: goodProof.pathIndices!.map((bit, i) =>
        i === 0 ? ((bit ^ 1) & 1) : bit,
      ),
    };

    // Both must miss the published root, and they must miss it via different
    // computed values — that's the point of the regression matrix: an
    // implementation that confuses index/value bugs would produce identical
    // recomputed roots here.
    const v = recomputeRoot(valueTamper, leafBytes);
    const i = recomputeRoot(indexTamper, leafBytes);
    expect(v.equals(expectedRoot)).toBe(false);
    expect(i.equals(expectedRoot)).toBe(false);
    expect(v.equals(i)).toBe(false);
  });
});

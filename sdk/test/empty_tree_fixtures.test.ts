/// <reference types="jest" />
import {
  LocalMerkleTree,
  computeMerkleZeroLadder,
  generateBootstrapRootFixtures,
  PRODUCTION_MERKLE_TREE_DEPTH,
} from "../src/merkle";

/**
 * ZK-025: empty-tree and bootstrap-root fixtures.
 *
 * These tests pin the relationship between the canonical zero-node ladder,
 * the empty-tree root, and a freshly-instantiated `LocalMerkleTree`. If any
 * of them break, fixture generation has drifted from runtime behaviour and
 * the first deposit into a pool will be rejected on-chain.
 */

describe("Empty-tree / bootstrap-root fixtures (ZK-025)", () => {
  it("zero-ladder length is depth+1 (one entry per level + leaf level 0)", () => {
    const ladder = computeMerkleZeroLadder(8);
    expect(ladder).toHaveLength(9);
    for (const entry of ladder) {
      expect(entry).toBeInstanceOf(Buffer);
      expect(entry.length).toBe(32);
    }
  });

  it("ladder[0] is the all-zero 32-byte leaf", () => {
    const ladder = computeMerkleZeroLadder(8);
    expect(ladder[0]!.equals(Buffer.alloc(32, 0))).toBe(true);
  });

  it("the empty-tree root matches a freshly-constructed LocalMerkleTree's root", () => {
    for (const depth of [4, 8, 16, PRODUCTION_MERKLE_TREE_DEPTH]) {
      const ladder = computeMerkleZeroLadder(depth);
      const tree = new LocalMerkleTree(depth);
      expect(ladder[depth]!.equals(tree.getRoot())).toBe(true);
    }
  });

  it("zero-ladder is deterministic across calls", () => {
    const a = computeMerkleZeroLadder(12);
    const b = computeMerkleZeroLadder(12);
    for (let i = 0; i < a.length; i += 1) {
      expect(a[i]!.equals(b[i]!)).toBe(true);
    }
  });

  it("generates one fixture per (pool, denomination) class with the same canonical root", () => {
    const classes = [
      { poolId: "pool-A", denomination: "1xlm" },
      { poolId: "pool-A", denomination: "10xlm" },
      { poolId: "pool-B", denomination: "1xlm" },
    ];
    const fixtures = generateBootstrapRootFixtures(classes, 8);
    expect(fixtures).toHaveLength(3);

    const expectedRoot = computeMerkleZeroLadder(8)[8]!.toString("hex");
    for (const fixture of fixtures) {
      expect(fixture.depth).toBe(8);
      expect(fixture.rootHex).toBe(expectedRoot);
      expect(fixture.zeroLadderHex).toHaveLength(9);
    }

    expect(fixtures[0]).toMatchObject({ poolId: "pool-A", denomination: "1xlm" });
    expect(fixtures[1]).toMatchObject({ poolId: "pool-A", denomination: "10xlm" });
    expect(fixtures[2]).toMatchObject({ poolId: "pool-B", denomination: "1xlm" });
  });

  it("the SDK initializes a tree from the empty-root fixture", () => {
    const [fixture] = generateBootstrapRootFixtures(
      [{ poolId: "pool-A", denomination: "1xlm" }],
      6,
    );
    const tree = new LocalMerkleTree(fixture!.depth);
    expect(tree.getRoot().toString("hex")).toBe(fixture!.rootHex);
  });

  it("rejects empty class lists", () => {
    expect(() => generateBootstrapRootFixtures([])).toThrow();
  });

  it("production depth fixture lines up with PRODUCTION_MERKLE_TREE_DEPTH", () => {
    const [fixture] = generateBootstrapRootFixtures([
      { poolId: "p", denomination: "d" },
    ]);
    expect(fixture!.depth).toBe(PRODUCTION_MERKLE_TREE_DEPTH);
  });
});

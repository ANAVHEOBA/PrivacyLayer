# Client-side Merkle synchronization format (ZK-023)

The SDK rebuilds the deposit tree from indexed events so it can produce
withdrawal proofs offline. To avoid recomputing from the genesis root on
every run, the SDK persists a `MerkleCheckpoint` and resumes from it on
the next session.

This doc is the contract for that format. Anything that produces or
consumes a checkpoint — the SDK, fixture tooling, and proof-generation
code paths — MUST agree with what is described here. The format is
deliberately storage-agnostic: persist the JSON-serializable object on
whatever the host environment provides (browser `localStorage`, a
Node-side file, IndexedDB, encrypted disk).

## Format

```ts
interface MerkleCheckpoint {
  /** Schema version. Bumped on any breaking change. */
  version: 1;

  /** Tree depth captured by this checkpoint. Must equal `MERKLE_TREE_DEPTH`. */
  depth: number;

  /** Number of leaves committed so far. Equal to the index where the next leaf will land. */
  nextIndex: number;

  /** Hex-encoded current Merkle root (32 bytes, lowercase, no `0x`). */
  root: string;

  /**
   * Frontier — the rightmost path of the tree. One slot per level (`depth`
   * entries). `null` indicates the slot is the canonical zero node for that
   * level. The frontier alone is enough to keep ingesting new leaves; it is
   * NOT enough to prove inclusion of historical leaves.
   */
  frontier: Array<string | null>;

  /**
   * Optional: every leaf observed so far, in insertion order. Required to
   * generate proofs for arbitrary historical leaves; omitted if the
   * checkpoint is consumed only to keep ingesting new leaves.
   */
  leaves?: string[];
}
```

## Determinism guarantees

The format is restart-safe because every `LocalMerkleTree` operation is
pure: insertion order, `frontier`, and `root` are determined by the leaf
sequence alone. Specifically:

1. **Same input, same output.** A tree built by inserting `[c0, c1, …]`
   one-at-a-time produces the same root as a tree built by
   `insertBatch([c0, c1, …])`.
2. **Round-trip preservation.** `LocalMerkleTree.fromCheckpoint(t.createCheckpoint())`
   yields a tree whose `getRoot()`, `leafCount`, and subsequent
   insertion behavior match `t` exactly.
3. **Resumability.** Inserting leaves `N` through `M` into a checkpoint
   produced after leaf `N-1` yields the same tree as inserting leaves
   `0` through `M` from scratch.

These guarantees are pinned by `test/merkle_checkpoint.test.ts` and the
new `test/merkle_sync_format.test.ts` round-trip suite (ZK-023).

## Usage from proof generation

Proof generation calls `LocalMerkleTree.generateProof(leafIndex)`, which
requires the in-memory leaves array. Persist with `includeLeaves: true`
when the SDK needs to prove arbitrary historical leaves; omit `leaves`
to keep the checkpoint cheap (it stays small and only supports continued
ingestion).

```ts
const tree = new LocalMerkleTree();
tree.insertBatch(commitmentsFromIndexer);

// Persist
await storage.put("merkle-checkpoint", tree.createCheckpoint({ includeLeaves: true }));

// Resume
const restored = LocalMerkleTree.fromCheckpoint(await storage.get("merkle-checkpoint"));
restored.insertBatch(newerCommitments);
const proof = restored.generateProof(targetLeafIndex);
```

## Versioning

`version: 1` is the only currently-supported value. Any breaking change
(e.g. switching the leaf hash domain, packing the frontier differently,
adding a required field) MUST bump `version` and add an entry to the
changelog below; older checkpoints become unreadable and the SDK rebuilds
from genesis.

## Changelog

| Version | Date (UTC) | Change |
|---|---|---|
| 1 | 2026-04-26 | Initial format (ZK-023). |

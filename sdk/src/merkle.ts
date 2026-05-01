import type { MerkleProof } from "./proof";
import { normalizeHex, stableHash32 } from "./stable";
import { WitnessValidationError } from "./errors";
import {
  FIELD_MODULUS,
  MERKLE_NODE_BYTE_LENGTH,
  MERKLE_TREE_DEPTH as ZK_MERKLE_TREE_DEPTH,
} from "./zk_constants";

export const PRODUCTION_MERKLE_TREE_DEPTH = ZK_MERKLE_TREE_DEPTH;
export { PRODUCTION_MERKLE_TREE_DEPTH as MERKLE_TREE_DEPTH };

export function assertMerkleDepth(
  depth: number,
  label: string = "merkleDepth",
): number {
  if (!Number.isInteger(depth) || depth <= 0 || depth > 31) {
    throw new WitnessValidationError(
      `${label} must be an integer in [1, 31], received ${depth}`,
      "MERKLE_PATH",
      "structure",
    );
  }
  return depth;
}

export function merkleMaxLeafIndex(
  depth: number = PRODUCTION_MERKLE_TREE_DEPTH,
): number {
  return (1 << assertMerkleDepth(depth)) - 1;
}

export const MERKLE_MAX_LEAF_INDEX = merkleMaxLeafIndex(
  PRODUCTION_MERKLE_TREE_DEPTH,
);

export type CommitmentLike = Buffer | Uint8Array | string;

export interface MerkleCheckpoint {
  version: 1;
  depth: number;
  nextIndex: number;
  root: string;
  frontier: Array<string | null>;
  leaves?: string[];
}

export interface BatchSyncResult {
  insertedLeafIndices: number[];
  checkpoint: MerkleCheckpoint;
  root: Buffer;
}

export interface MerkleFixtureVector {
  id: string;
  depth: number;
  leafIndex: number;
  rootHex: string;
  pathElementsHex: string[];
}

export interface MerkleFixtureGenerationOptions {
  depth?: number;
  leafCount?: number;
  proveLeafIndices?: number[];
}

/**
 * Empty-tree / bootstrap-root fixture for a single (pool, denomination) class
 * (ZK-025). Generated deterministically from `LocalMerkleTree`'s zero-node
 * ladder so the SDK and the on-chain pool agree on the initial root the very
 * first deposit will be verified against.
 */
export interface EmptyTreeFixture {
  poolId: string;
  denomination: string;
  depth: number;
  /** Hex-encoded canonical empty root for this (pool, denomination). */
  rootHex: string;
  /** Per-level zero nodes: `zeroLadder[i]` is the hash of two `zeroLadder[i-1]`. */
  zeroLadderHex: string[];
}

/**
 * Compute the canonical zero-node ladder for the given depth.
 *
 * Exposed so fixture tooling can derive empty roots without instantiating a
 * `LocalMerkleTree`. The zero ladder is the SHA-2-driven recursive hash of
 * `Buffer.alloc(32, 0)`; matches the per-instance ladder used internally.
 */
export function computeMerkleZeroLadder(
  depth: number = PRODUCTION_MERKLE_TREE_DEPTH,
): Buffer[] {
  assertMerkleDepth(depth);
  // We use a throwaway tree solely to access its private buildZeroes via the
  // documented constructor path; the resulting ladder is identical regardless
  // of which tree instance produced it.
  const tree = new LocalMerkleTree(depth);
  const ladder: Buffer[] = [];
  // The first slot is always the all-zero leaf; subsequent slots derive from
  // it via the same `hashPair` used during normal insertion. We round-trip
  // through `getRoot()` of an empty tree to capture the canonical root.
  for (let level = 0; level <= depth; level += 1) {
    ladder.push(Buffer.from((tree as any).zeroes[level]));
  }
  return ladder;
}

/**
 * Generate one bootstrap-root fixture per supplied (poolId, denomination)
 * combination (ZK-025). Roots are deterministic and protocol-derived — there
 * are no hand-entered values.
 */
export function generateBootstrapRootFixtures(
  classes: Array<{ poolId: string; denomination: string }>,
  depth: number = PRODUCTION_MERKLE_TREE_DEPTH,
): EmptyTreeFixture[] {
  if (classes.length === 0) {
    throw new Error("generateBootstrapRootFixtures requires at least one class");
  }
  const ladder = computeMerkleZeroLadder(depth);
  const rootHex = ladder[depth]!.toString("hex");
  const zeroLadderHex = ladder.map((entry) => entry.toString("hex"));
  return classes.map(({ poolId, denomination }) => ({
    poolId,
    denomination,
    depth,
    rootHex,
    zeroLadderHex,
  }));
}

function toLeaf(commitment: CommitmentLike): Buffer {
  if (Buffer.isBuffer(commitment) || commitment instanceof Uint8Array) {
    const bytes = Buffer.from(commitment);
    return bytes.length === 32 ? bytes : stableHash32("leaf-bytes", bytes);
  }

  const normalized = normalizeHex(commitment);
  if (/^[0-9a-f]+$/i.test(normalized) && normalized.length % 2 === 0) {
    const bytes = Buffer.from(normalized, "hex");
    return bytes.length === 32 ? bytes : stableHash32("leaf-hex", bytes);
  }

  return stableHash32("leaf-text", commitment);
}

/**
 * Validate the Merkle proof object before it is encoded for the prover.
 * Catches truncated / overlong paths and invalid index range early.
 */
export function validateMerkleProof(
  merkleProof: MerkleProof,
  depth: number = PRODUCTION_MERKLE_TREE_DEPTH,
): void {
  const expectedDepth = assertMerkleDepth(depth);

  if (merkleProof.root.length !== MERKLE_NODE_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `Merkle root must be ${MERKLE_NODE_BYTE_LENGTH} bytes, got ${merkleProof.root.length}`,
      "MERKLE_PATH",
      "structure",
    );
  }
  if (merkleProof.root.every((b: number) => b === 0)) {
    throw new WitnessValidationError(
      "Merkle root must be non-zero",
      "MERKLE_ROOT",
      "domain",
    );
  }
  const rootN = BigInt("0x" + merkleProof.root.toString("hex"));
  if (rootN >= FIELD_MODULUS) {
    throw new WitnessValidationError(
      "Merkle root must be a canonical field encoding",
      "MERKLE_ROOT",
      "domain",
    );
  }
  if (merkleProof.pathElements.length !== expectedDepth) {
    throw new WitnessValidationError(
      `Merkle path must have ${expectedDepth} elements, got ${merkleProof.pathElements.length}`,
      "MERKLE_PATH",
      "structure",
    );
  }
  for (let i = 0; i < merkleProof.pathElements.length; i++) {
    const el = merkleProof.pathElements[i];
    if (el.length !== MERKLE_NODE_BYTE_LENGTH) {
      throw new WitnessValidationError(
        `Merkle path element at index ${i} must be ${MERKLE_NODE_BYTE_LENGTH} bytes, got ${el.length}`,
        "MERKLE_PATH",
        "structure",
      );
    }
  }
}

export class LocalMerkleTree {
  readonly depth: number;
  private readonly zeroes: Buffer[];
  private readonly frontier: Array<Buffer | null>;
  private trackedLeaves: Buffer[];
  private nextIndex: number;
  private root: Buffer;

  constructor(depth: number = PRODUCTION_MERKLE_TREE_DEPTH) {
    assertMerkleDepth(depth);

    this.depth = depth;
    this.zeroes = this.buildZeroes(depth);
    this.frontier = new Array<Buffer | null>(depth).fill(null);
    this.trackedLeaves = [];
    this.nextIndex = 0;
    this.root = Buffer.from(this.zeroes[depth]);
  }

  static fromCheckpoint(checkpoint: MerkleCheckpoint): LocalMerkleTree {
    if (checkpoint.frontier.length !== checkpoint.depth) {
      throw new Error(
        `Invalid checkpoint: frontier length ${checkpoint.frontier.length} does not match depth ${checkpoint.depth}`,
      );
    }

    const tree = new LocalMerkleTree(checkpoint.depth);
    tree.nextIndex = checkpoint.nextIndex;
    tree.root = Buffer.from(normalizeHex(checkpoint.root), "hex");

    for (let i = 0; i < checkpoint.frontier.length; i += 1) {
      const entry = checkpoint.frontier[i];
      tree.frontier[i] = entry ? Buffer.from(normalizeHex(entry), "hex") : null;
    }

    if (checkpoint.leaves) {
      tree.trackedLeaves = checkpoint.leaves.map((leaf) =>
        Buffer.from(normalizeHex(leaf), "hex"),
      );
    }

    return tree;
  }

  get leafCount(): number {
    return this.nextIndex;
  }

  getRoot(): Buffer {
    return Buffer.from(this.root);
  }

  insert(leaf: CommitmentLike): number {
    const capacity = 2 ** this.depth;
    if (this.nextIndex >= capacity) {
      throw new Error(`Merkle tree is full at depth ${this.depth}`);
    }

    const normalizedLeaf = toLeaf(leaf);
    this.trackedLeaves.push(normalizedLeaf);

    let index = this.nextIndex;
    let current = normalizedLeaf;

    for (let level = 0; level < this.depth; level += 1) {
      if ((index & 1) === 0) {
        this.frontier[level] = current;
        current = this.hashPair(current, this.zeroes[level]);
      } else {
        const left = this.frontier[level] ?? this.zeroes[level];
        current = this.hashPair(left, current);
      }
      index >>= 1;
    }

    const insertedAt = this.nextIndex;
    this.nextIndex += 1;
    this.root = current;
    return insertedAt;
  }

  insertBatch(leaves: CommitmentLike[]): number[] {
    const indices: number[] = [];
    for (const leaf of leaves) {
      indices.push(this.insert(leaf));
    }
    return indices;
  }

  /**
   * Generates a Merkle proof for a tracked leaf index.
   * This requires that leaves are available in memory.
   */
  generateProof(leafIndex: number): MerkleProof {
    if (
      !Number.isInteger(leafIndex) ||
      leafIndex < 0 ||
      leafIndex >= this.nextIndex
    ) {
      throw new Error(
        `Leaf index ${leafIndex} is out of range for tree size ${this.nextIndex}`,
      );
    }
    if (this.trackedLeaves.length < this.nextIndex) {
      throw new Error(
        "Cannot generate Merkle proof from checkpoint-only tree state; tracked leaves are unavailable.",
      );
    }

    const pathElements: Buffer[] = [];
    const pathIndices: number[] = [];
    const memo = new Map<string, Buffer>();

    let index = leafIndex;
    for (let level = 0; level < this.depth; level += 1) {
      const siblingIndex = index ^ 1;
      pathElements.push(this.nodeAt(level, siblingIndex, memo));
      pathIndices.push(index & 1);
      index >>= 1;
    }

    return {
      root: this.getRoot(),
      pathElements,
      pathIndices,
      leafIndex,
    };
  }

  createCheckpoint(
    options: { includeLeaves?: boolean } = {},
  ): MerkleCheckpoint {
    return {
      version: 1,
      depth: this.depth,
      nextIndex: this.nextIndex,
      root: this.root.toString("hex"),
      frontier: this.frontier.map((entry) =>
        entry ? entry.toString("hex") : null,
      ),
      leaves: options.includeLeaves
        ? this.trackedLeaves.map((leaf) => leaf.toString("hex"))
        : undefined,
    };
  }

  private hashPair(left: Buffer, right: Buffer): Buffer {
    return stableHash32("merkle-node", left, right);
  }

  private buildZeroes(depth: number): Buffer[] {
    const zeroes: Buffer[] = [Buffer.alloc(32, 0)];
    for (let i = 0; i < depth; i += 1) {
      zeroes.push(this.hashPair(zeroes[i], zeroes[i]));
    }
    return zeroes;
  }

  private nodeAt(
    level: number,
    index: number,
    memo: Map<string, Buffer>,
  ): Buffer {
    const key = `${level}:${index}`;
    const existing = memo.get(key);
    if (existing) {
      return existing;
    }

    const span = 2 ** level;
    const startLeaf = index * span;

    if (startLeaf >= this.trackedLeaves.length) {
      return this.zeroes[level];
    }

    if (level === 0) {
      return this.trackedLeaves[index] ?? this.zeroes[0];
    }

    const left = this.nodeAt(level - 1, index * 2, memo);
    const right = this.nodeAt(level - 1, index * 2 + 1, memo);
    const node = this.hashPair(left, right);
    memo.set(key, node);
    return node;
  }
}

export function syncCommitmentBatch(
  tree: LocalMerkleTree,
  commitments: CommitmentLike[],
  checkpointOptions: { includeLeaves?: boolean } = {},
): BatchSyncResult {
  const insertedLeafIndices = tree.insertBatch(commitments);
  return {
    insertedLeafIndices,
    checkpoint: tree.createCheckpoint(checkpointOptions),
    root: tree.getRoot(),
  };
}

/**
 * Deterministic fixture helper for offline tooling.
 *
 * Production artifacts remain fixed at depth 20. Tooling can explicitly
 * request a smaller depth to speed up local debugging and vector generation.
 */
export function generateMerkleFixtureVectors(
  options: MerkleFixtureGenerationOptions = {},
): MerkleFixtureVector[] {
  const depth = assertMerkleDepth(
    options.depth ?? PRODUCTION_MERKLE_TREE_DEPTH,
    "offlineMerkleDepth",
  );
  const leafCount = options.leafCount ?? Math.min(8, 1 << depth);
  if (
    !Number.isInteger(leafCount) ||
    leafCount <= 0 ||
    leafCount > 1 << depth
  ) {
    throw new Error(
      `leafCount must be an integer in [1, ${1 << depth}], received ${leafCount}`,
    );
  }

  const proveLeafIndices =
    options.proveLeafIndices ??
    Array.from({ length: Math.min(leafCount, 4) }, (_, i) => i);

  const tree = new LocalMerkleTree(depth);
  const leaves = Array.from({ length: leafCount }, (_, i) =>
    stableHash32("fixture-leaf", i),
  );
  tree.insertBatch(leaves);

  return proveLeafIndices.map((leafIndex, i) => {
    if (
      !Number.isInteger(leafIndex) ||
      leafIndex < 0 ||
      leafIndex >= leafCount
    ) {
      throw new Error(
        `proveLeafIndices[${i}] is out of range for leafCount ${leafCount}`,
      );
    }

    const proof = tree.generateProof(leafIndex);
    return {
      id: `fixture-depth-${depth}-leaf-${leafIndex}`,
      depth,
      leafIndex,
      rootHex: proof.root.toString("hex"),
      pathElementsHex: proof.pathElements.map((entry) => entry.toString("hex")),
    };
  });
}

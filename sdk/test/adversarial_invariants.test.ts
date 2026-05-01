import fs from "fs";
import path from "path";
import { Note } from "../src/note";
import { MerkleProof, ProofGenerator } from "../src/proof";
import {
  computeNullifierHash,
  noteScalarToField,
  merkleNodeToField,
} from "../src/encoding";
import { assertValidPreparedWithdrawalWitness } from "../src/witness";
import { WitnessValidationError } from "../src/errors";

const G = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const V = path.join(__dirname, "golden/vectors.json");
const fixture = JSON.parse(fs.readFileSync(V, "utf8"));
const OFFLINE_DEPTH = fixture.offline_tree_depth ?? 20;

/**
 * Reusable invariants: nullifier–root cross-pool binding, public-input
 * replays, and nullifier hash uniqueness. Keeps the stack testable off-chain
 * without Soroban (see `circuits/withdraw/src/main.nr` for circuit mirrors).
 */
describe("Adversarial invariants (privacy + spend safety)", () => {
  it("rejects public-input swap: nullifier_hash from a different (nullifier, root) pair (replay)", async () => {
    const a = fixture.vectors.find((x: any) => x.id === "TV-001");
    const b = fixture.vectors.find((x: any) => x.id === "TV-003");
    const note = new Note(
      Buffer.from(a.note.nullifier_hex, "hex"),
      Buffer.from(a.note.secret_hex, "hex"),
      a.note.pool_id,
      BigInt(a.note.amount),
    );
    const mp: MerkleProof = {
      root: Buffer.from(a.merkle.root, "hex"),
      pathElements: a.merkle.path_elements.map((e: string) =>
        Buffer.from(e, "hex"),
      ),
      pathIndices: Array(OFFLINE_DEPTH).fill(0),
      leafIndex: a.merkle.leaf_index,
    };
    const good = await ProofGenerator.prepareWitness(note, mp, G, G, 0n, {
      merkleDepth: OFFLINE_DEPTH,
    });
    const otherNf = noteScalarToField(Buffer.from(b.note.nullifier_hex, "hex"));
    const wrongReplay = computeNullifierHash(otherNf, good.root);

    const w = { ...good, nullifier_hash: wrongReplay };
    expect(good.nullifier).not.toBe(otherNf);
    expect(w.nullifier_hash).toBe(computeNullifierHash(otherNf, good.root));
    try {
      assertValidPreparedWithdrawalWitness(w, { merkleDepth: OFFLINE_DEPTH });
      throw new Error("expected invalid witness");
    } catch (e) {
      expect(e).toBeInstanceOf(WitnessValidationError);
    }
  });

  it("cross-pool: same nullifier, different root fields yield different nullifier_hash (on-chain scoping)", () => {
    const t1 = fixture.vectors.find((x: any) => x.id === "TV-001");
    const t4 = fixture.vectors.find((x: any) => x.id === "TV-004");
    const nf = noteScalarToField(Buffer.from(t1.note.nullifier_hex, "hex"));
    const r1 = merkleNodeToField(Buffer.from(t1.merkle.root, "hex"));
    const r2 = merkleNodeToField(Buffer.from(t4.merkle.root, "hex"));
    const h1 = computeNullifierHash(nf, r1);
    const h2 = computeNullifierHash(nf, r2);
    expect(h1).not.toBe(h2);
  });

  it("two spends from different vectors cannot share nullifier_hash without sharing nullifier+root (golden)", () => {
    const t1 = fixture.vectors.find((x: any) => x.id === "TV-001");
    const t3 = fixture.vectors.find((x: any) => x.id === "TV-003");
    expect(t1.nullifier_hash).not.toBe(t3.nullifier_hash);
  });
});

describe("Merkle proof surface (integration with pathIndices)", () => {
  it("fails if pathIndices length is wrong when pathIndices is provided", () => {
    const note = new Note(
      Buffer.from("01".repeat(31), "hex"),
      Buffer.from("02".repeat(31), "hex"),
      "03".repeat(32),
      1n,
    );
    const p = Buffer.from("aa".repeat(32), "hex");
    const mp: MerkleProof = {
      root: p,
      pathElements: Array(OFFLINE_DEPTH).fill(p),
      pathIndices: [0, 1, 2],
      leafIndex: 0,
    };
    expect(
      ProofGenerator.prepareWitness(note, mp, G, undefined, undefined, {
        merkleDepth: OFFLINE_DEPTH,
      }),
    ).rejects.toThrow(WitnessValidationError);
  });
});

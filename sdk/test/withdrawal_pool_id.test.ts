/// <reference types="jest" />
import { Note } from "../src/note";
import {
  MerkleProof,
  ProofGenerator,
  PreparedWitness,
} from "../src/proof";
import { buildWithdrawalProofCacheKey } from "../src/withdraw";
import { WITHDRAWAL_PUBLIC_INPUT_SCHEMA } from "../src/encoding";
import { assertValidPreparedWithdrawalWitness } from "../src/witness";

/**
 * ZK-029: pool_id MUST be a first-class part of the withdrawal witness and
 * proof shape. These tests pin the cross-stack invariants documented in the
 * issue acceptance criteria:
 *
 *   1. Witness preparation requires a pool identifier (sourced from `note.poolId`).
 *   2. Proof fixtures differ when only pool_id changes (everything else equal).
 *   3. The withdrawal circuit and SDK witness schema stay aligned —
 *      `pool_id` is at index 0 of `WITHDRAWAL_PUBLIC_INPUT_SCHEMA` and
 *      mirrored in `circuits/withdraw/src/main.nr`.
 */

const RECIPIENT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function buildNote(poolId: string): Note {
  return new Note(
    Buffer.from("01".repeat(31), "hex"),
    Buffer.from("02".repeat(31), "hex"),
    poolId,
    1000n,
  );
}

function buildMerkleProof(): MerkleProof {
  return {
    root: Buffer.from("04".repeat(32), "hex"),
    pathElements: Array.from({ length: 20 }, (_, i) =>
      Buffer.from((5 + i).toString(16).padStart(2, "0").repeat(32), "hex"),
    ),
    pathIndices: Array.from({ length: 20 }, () => 0),
    leafIndex: 0,
  };
}

async function prepareFor(poolId: string): Promise<PreparedWitness> {
  return ProofGenerator.prepareWitness(
    buildNote(poolId),
    buildMerkleProof(),
    RECIPIENT,
  );
}

describe("Withdrawal proof pool_id (ZK-029)", () => {
  it("schema places pool_id at index 0 (matches circuits/withdraw/src/main.nr)", () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA[0]).toBe("pool_id");
  });

  it("prepared witness exposes a non-empty pool_id field", async () => {
    const witness = await prepareFor("aa".repeat(32));
    expect(typeof witness.pool_id).toBe("string");
    expect(witness.pool_id).toMatch(/^[0-9a-f]{64}$/);
    expect(witness.pool_id).not.toBe("0".repeat(64));
  });

  it("witness validation rejects a witness whose pool_id is not a canonical field hex string", async () => {
    const good = await prepareFor("aa".repeat(32));
    const bad: PreparedWitness = { ...good, pool_id: "not-a-hex-string" };
    expect(() => assertValidPreparedWithdrawalWitness(bad)).toThrow();
  });

  it("differing pool_ids produce differing prepared witnesses (everything else equal)", async () => {
    const a = await prepareFor("aa".repeat(32));
    const b = await prepareFor("bb".repeat(32));

    expect(a.pool_id).not.toBe(b.pool_id);

    // Every other field must be identical so the test isolates pool_id.
    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      if (key === "pool_id") continue;
      expect(a[key]).toBe(b[key]);
    }
    expect(a.nullifier).toBe(b.nullifier);
    expect(a.secret).toBe(b.secret);
    expect(a.leaf_index).toBe(b.leaf_index);
    expect(a.hash_path).toEqual(b.hash_path);
  });

  it("differing pool_ids yield different cache keys (proof fixtures diverge)", async () => {
    const note1 = buildNote("aa".repeat(32));
    const note2 = buildNote("bb".repeat(32));
    const merkleProof = buildMerkleProof();

    const witness1 = await ProofGenerator.prepareWitness(note1, merkleProof, RECIPIENT);
    const witness2 = await ProofGenerator.prepareWitness(note2, merkleProof, RECIPIENT);

    const key1 = buildWithdrawalProofCacheKey(
      { note: note1, merkleProof, recipient: RECIPIENT },
      witness1,
    );
    const key2 = buildWithdrawalProofCacheKey(
      { note: note2, merkleProof, recipient: RECIPIENT },
      witness2,
    );

    expect(key1).not.toBe(key2);
  });

  it("identical pool_ids yield identical cache keys (cache stays warm)", async () => {
    const merkleProof = buildMerkleProof();
    const note1 = buildNote("aa".repeat(32));
    const note2 = buildNote("aa".repeat(32));

    const witness1 = await ProofGenerator.prepareWitness(note1, merkleProof, RECIPIENT);
    const witness2 = await ProofGenerator.prepareWitness(note2, merkleProof, RECIPIENT);

    const key1 = buildWithdrawalProofCacheKey(
      { note: note1, merkleProof, recipient: RECIPIENT },
      witness1,
    );
    const key2 = buildWithdrawalProofCacheKey(
      { note: note2, merkleProof, recipient: RECIPIENT },
      witness2,
    );

    expect(key1).toBe(key2);
  });
});

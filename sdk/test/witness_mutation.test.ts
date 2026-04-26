import fs from 'fs';
import path from 'path';
import { Note } from '../src/note';
import { MerkleProof, PreparedWitness, ProofGenerator, ProvingError } from '../src/proof';
import { assertValidPreparedWithdrawalWitness, assertValidGroth16ProofBytes, GROTH16_PROOF_BYTE_LENGTH } from '../src/witness';
import { WitnessValidationError } from '../src/errors';
import fs from "fs";
import path from "path";
import { Note } from "../src/note";
import { MerkleProof, PreparedWitness, ProofGenerator } from "../src/proof";
import {
  assertValidPreparedWithdrawalWitness,
  assertValidGroth16ProofBytes,
  GROTH16_PROOF_BYTE_LENGTH,
} from "../src/witness";
import { WitnessValidationError } from "../src/errors";

const VECTORS = path.join(__dirname, "golden/vectors.json");
const fixture = JSON.parse(fs.readFileSync(VECTORS, "utf8"));
const OFFLINE_DEPTH = fixture.offline_tree_depth ?? 20;

function buildNote(v: any): Note {
  return new Note(
    Buffer.from(v.note.nullifier_hex, "hex"),
    Buffer.from(v.note.secret_hex, "hex"),
    v.note.pool_id,
    BigInt(v.note.amount),
  );
}

function buildMerkle(v: any): MerkleProof {
  return {
    root: Buffer.from(v.merkle.root, "hex"),
    pathElements: v.merkle.path_elements.map((e: string) =>
      Buffer.from(e, "hex"),
    ),
    pathIndices: Array(OFFLINE_DEPTH).fill(0),
    leafIndex: v.merkle.leaf_index,
  };
}

/**
 * Isolated single-dimension mutations from a known-good TV-001 witness.
 * Preserves one failure signature per case for refactors and debugging.
 */
describe("Fixture mutation contract (one dimension per case)", () => {
  const v = fixture.vectors.find((x: any) => x.id === "TV-001");

  let good: PreparedWitness;
  const recipient = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

  beforeAll(async () => {
    const note = buildNote(v);
    const mp = buildMerkle(v);
    good = await ProofGenerator.prepareWitness(
      note,
      mp,
      recipient,
      recipient,
      0n,
      { merkleDepth: OFFLINE_DEPTH },
    );
  });

  function mustFailBinding(w: PreparedWitness, part: string) {
    try {
      assertValidPreparedWithdrawalWitness(w, { merkleDepth: OFFLINE_DEPTH });
      throw new Error(`expected failure for ${part}`);
    } catch (e) {
      expect(e).toBeInstanceOf(WitnessValidationError);
      const err = e as WitnessValidationError;
      expect(err.code).toBe("WITNESS_SEMANTICS");
      expect(err.reason).toBe("domain");
    }
  }

  it("M_root: public root flips one hex digit (binding broken)", () => {
    const w: PreparedWitness = {
      ...good,
      root: good.root.slice(0, 63) + (good.root[63] === "1" ? "0" : "1"),
    };
    mustFailBinding(w, "root");
  });

  it("M_nullifier_hash: hash does not match (nullifier, root) pair", () => {
    const w: PreparedWitness = {
      ...good,
      nullifier_hash: "1".padStart(64, "0"),
    };
    mustFailBinding(w, "nullifier_hash");
  });

  it("M_relayer: non-zero relayer field with zero fee", () => {
    const w: PreparedWitness = {
      ...good,
      relayer: "1".padStart(64, "0"),
    };
    try {
      assertValidPreparedWithdrawalWitness(w, { merkleDepth: OFFLINE_DEPTH });
      throw new Error("expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(WitnessValidationError);
      const err = e as WitnessValidationError;
      expect(err.code).toBe("WITNESS_SEMANTICS");
    }
  });

  it("M_fee: fee exceeds amount", () => {
    const w: PreparedWitness = {
      ...good,
      fee: (BigInt(good.amount) + 1n).toString(),
    };
    mustFailBinding(w, "fee>amount");
  });

  it("M_leaf_index: out of range leaf index", () => {
    const w: PreparedWitness = { ...good, leaf_index: "2000000" };
    try {
      assertValidPreparedWithdrawalWitness(w, { merkleDepth: OFFLINE_DEPTH });
      throw new Error("expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(WitnessValidationError);
      const err = e as WitnessValidationError;
      expect(err.code).toBe("LEAF_INDEX");
    }
  });

  it("M_hash_path: one sibling still passes binding but documents inclusion failure at circuit (semantics not checked here)", () => {
    const path = good.hash_path.slice();
    const flip = (path[0]![0] === "0" ? "1" : "0") + path[0]!.slice(1);
    path[0] = flip;
    const w: PreparedWitness = { ...good, hash_path: path };
    assertValidPreparedWithdrawalWitness(w, { merkleDepth: OFFLINE_DEPTH });
  });

  it("M_format_proof: wrong length raw proof bytes (formatter boundary)", () => {
    expect(() => assertValidGroth16ProofBytes(new Uint8Array(32))).toThrow(
      WitnessValidationError,
    );
    const ok = new Uint8Array(GROTH16_PROOF_BYTE_LENGTH);
    expect(() => assertValidGroth16ProofBytes(ok)).not.toThrow();
  });

  it('ProofGenerator.formatProof rejects under-long proof', () => {
    expect(() =>
      ProofGenerator.formatProof(new Uint8Array(1), {
        pool_id: good.pool_id,
        root: good.root,
        nullifier_hash: good.nullifier_hash,
        recipient: good.recipient,
        amount: good.amount,
        relayer: good.relayer,
        fee: good.fee,
      })
    ).toThrow(ProvingError);
  });

  it("ProofGenerator.formatProof rejects missing public inputs before formatting completes", () => {
    expect(() =>
      ProofGenerator.formatProof(new Uint8Array(GROTH16_PROOF_BYTE_LENGTH), {
        root: good.root,
        nullifier_hash: good.nullifier_hash,
        recipient: good.recipient,
        amount: good.amount,
        relayer: good.relayer,
        fee: good.fee,
      } as any),
    ).toThrow("Invalid withdrawal public-input schema");
  });
});

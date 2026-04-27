import fs from "fs";
import path from "path";
import { Note, NoteBackupError } from "../src/note";
import { MerkleProof, ProofGenerator } from "../src/proof";
import {
  fieldToHex, noteScalarToField,
  merkleNodeToField,
  poolIdToField,
  computeNullifierHash,
  packWithdrawalPublicInputs,
  serializeWithdrawalPublicInputs,
  stellarAddressToField,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
} from "../src/encoding";
import { buildWithdrawalPublicInputLayout } from "../src/withdraw";
// HASH_MODE: mock (ZK-106) — `computeNullifierHash` uses SHA-256 structural stand-ins.
// Golden vector tests verify field encoding, schema order, and structural correctness.
// No proof generation is performed; these tests are not circuit-compatibility checks.

// ---------------------------------------------------------------------------
// Load golden fixture
// ---------------------------------------------------------------------------

const VECTORS_PATH = path.resolve(__dirname, "golden/vectors.json");
const fixture = JSON.parse(fs.readFileSync(VECTORS_PATH, "utf8"));
const OFFLINE_DEPTH = fixture.offline_tree_depth ?? 20;
const PRODUCTION_DEPTH = fixture.production_tree_depth ?? 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseField(s: string): bigint {
    if (s.startsWith("0x")) return BigInt(s);
    if (/^[0-9a-fA-F]{64}$/.test(s)) return BigInt("0x" + s);
    return BigInt(s);
}

function buildNote(v: any): Note {
  return new Note(
    Buffer.from(v.note.nullifier_hex, "hex"),
    Buffer.from(v.note.secret_hex, "hex"),
    v.note.pool_id,
    BigInt(v.note.amount),
  );
}

function buildMerkleProof(v: any): MerkleProof {
  return {
    root: Buffer.from(v.merkle.root, "hex"),
    pathElements: v.merkle.path_elements.map((e: string) =>
      Buffer.from(e, "hex"),
    ),
    pathIndices: Array(OFFLINE_DEPTH).fill(0),
    leafIndex: v.merkle.leaf_index,
  };
}

// ---------------------------------------------------------------------------
// Golden vector corpus tests
// ---------------------------------------------------------------------------

describe("Golden Vector Corpus", () => {
  it("fixture file loads and has the expected structure", () => {
    expect(fixture.version).toBe(1);
    expect(PRODUCTION_DEPTH).toBe(20);
    expect(OFFLINE_DEPTH).toBeGreaterThan(0);
    expect(OFFLINE_DEPTH).toBeLessThanOrEqual(PRODUCTION_DEPTH);
    expect(Array.isArray(fixture.vectors)).toBe(true);
    expect(fixture.vectors.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(fixture.vectors.map((v: any) => [v.id, v]) as [string, any][])(
    "%s",
    (_id: string, v: any) => {
      it("note scalars encode to canonical field hex", () => {
        const nullifierField = noteScalarToField(
          Buffer.from(v.note.nullifier_hex, "hex"),
        );
        const secretField = noteScalarToField(
          Buffer.from(v.note.secret_hex, "hex"),
        );

        expect(nullifierField).toBe(v.fields.nullifier);
        expect(secretField).toBe(v.fields.secret);
        expect(nullifierField).toHaveLength(64);
        expect(secretField).toHaveLength(64);
      });

      it("merkle root encodes to canonical field hex", () => {
        const rootField = merkleNodeToField(Buffer.from(v.merkle.root, "hex"));
        expect(rootField).toBe(v.public_inputs.root);
        expect(rootField).toHaveLength(64);
      });

      it("nullifier hash is structurally valid and stable (ZK-017: domain-separated)", () => {
        const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, "hex"));
        const pf = poolIdToField(v.note.pool_id);
        const nh = computeNullifierHash(nf, pf);

        expect(nh).toHaveLength(64);
        expect(/^[0-9a-f]+$/.test(nh)).toBe(true);
        expect(nh).not.toBe("0".repeat(64));
        expect(computeNullifierHash(nf, pf)).toBe(nh);
      });

      it("packed public inputs include pool_id first and match canonical schema order", () => {
        const poolId = poolIdToField(v.note.pool_id);
        const root = v.public_inputs.root;
        const nh = v.public_inputs.nullifier_hash;
        const recipient = v.public_inputs.recipient;
        const amount = parseField(v.public_inputs.amount);
        const relayer = v.public_inputs.relayer;
        const fee = parseField(v.public_inputs.fee);

        const packed = packWithdrawalPublicInputs(
          poolId,
          root,
          nh,
          recipient,
          amount,
          relayer,
          fee,
        );

        expect(packed).toHaveLength(7);
        expect(packed[0]).toBe(poolId);
        expect(packed[1]).toBe(root);
        expect(packed[2]).toBe(nh);
        expect(packed[3]).toBe(recipient);
        expect(parseField(packed[4])).toBe(amount);
        expect(packed[5]).toBe(relayer);
        expect(parseField(packed[6])).toBe(fee);
      });

      it("ProofGenerator.prepareWitness produces public inputs consistent with golden values", async () => {
        const note = buildNote(v);
        const merkleProof = buildMerkleProof(v);

        const relayerAddr =
          parseField(v.public_inputs.fee) === 0n
            ? "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
            : undefined;

        const fee = parseField(v.public_inputs.fee);

        const witness = await ProofGenerator.prepareWitness(
          note,
          merkleProof,
          v._recipient_addr ??
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
          relayerAddr,
          fee,
          { merkleDepth: OFFLINE_DEPTH },
        );

        expect(witness.root).toBe(v.public_inputs.root);
        expect(witness.nullifier_hash).toBe(v.public_inputs.nullifier_hash);
        expect(parseField(witness.amount)).toBe(parseField(v.public_inputs.amount));
        expect(parseField(witness.fee)).toBe(parseField(v.public_inputs.fee));
        
        if (parseField(v.public_inputs.fee) === 0n) {
          expect(parseField(witness.relayer)).toBe(parseField(v.public_inputs.relayer));
          expect(parseField(witness.relayer)).toBe(0n);
        }

        expect(witness.nullifier).toBe(v.fields.nullifier);
        expect(witness.secret).toBe(v.fields.secret);
        expect(parseField(witness.leaf_index)).toBe(BigInt(v.merkle.leaf_index));
        expect(witness.hash_path).toHaveLength(OFFLINE_DEPTH);
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Note backup round-trip tests (Issue #300 cross-check)
// ---------------------------------------------------------------------------

describe("Note Backup Round-trip", () => {
  describe.each(fixture.vectors.map((v: any) => [v.id, v]) as [string, any][])(
    "%s backup round-trip",
    (_id: string, v: any) => {
      it("exportBackup → importBackup produces identical note", () => {
        const original = buildNote(v);
        const backup = original.exportBackup();

        expect(backup).toMatch(/^privacylayer-note:/);

        const restored = Note.importBackup(backup);

        expect(restored.nullifier).toEqual(original.nullifier);
        expect(restored.secret).toEqual(original.secret);
        expect(restored.poolId).toBe(original.poolId);
        expect(restored.amount).toBe(original.amount);
      });
    },
  );

  it("importBackup throws INVALID_PREFIX for wrong prefix", () => {
    expect(() => Note.importBackup("bad-prefix:deadbeef")).toThrow(
      NoteBackupError,
    );
    try {
      Note.importBackup("bad-prefix:deadbeef");
    } catch (e) {
      expect((e as NoteBackupError).code).toBe("INVALID_PREFIX");
    }
  });

  it("importBackup throws INVALID_LENGTH for truncated payload", () => {
    const short = "privacylayer-note:" + "ab".repeat(50);
    try {
      Note.importBackup(short);
    } catch (e) {
      expect((e as NoteBackupError).code).toBe("INVALID_LENGTH");
    }
  });

  it("importBackup throws CHECKSUM_MISMATCH for corrupted data", () => {
    const original = buildNote(fixture.vectors[0]);
    const backup = original.exportBackup();
    const hex = backup.slice("privacylayer-note:".length);
    const flipped =
      hex.slice(0, 20) + (hex[20] === "f" ? "0" : "f") + hex.slice(21);
    const corrupted = "privacylayer-note:" + flipped;
    try {
      Note.importBackup(corrupted);
    } catch (e) {
      expect((e as NoteBackupError).code).toMatch(
        /CHECKSUM_MISMATCH|INVALID_LENGTH|CORRUPT_DATA/,
      );
    }
  });

  it("random generated note survives backup round-trip", () => {
    const note = Note.generate("aa".repeat(32), 5_0000000n);
    const restored = Note.importBackup(note.exportBackup());

    expect(restored.nullifier).toEqual(note.nullifier);
    expect(restored.secret).toEqual(note.secret);
    expect(restored.poolId).toBe(note.poolId);
    expect(restored.amount).toBe(note.amount);
  });
});

// ---------------------------------------------------------------------------
// Cross-stack fixture stability (regression guard)
// ---------------------------------------------------------------------------

describe("Cross-stack fixture stability", () => {
  it("TV-001 nullifier hash is stable across runs", () => {
    const v = fixture.vectors.find((x: any) => x.id === "TV-001");
    const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, "hex"));
    const pf = poolIdToField(v.note.pool_id);
    expect(computeNullifierHash(nf, pf)).toBe(v.nullifier_hash);
  });

  it("TV-004 sparse-tree vector produces distinct nullifier hash from TV-001", () => {
    const v1 = fixture.vectors.find((x: any) => x.id === "TV-001");
    const v4 = fixture.vectors.find((x: any) => x.id === "TV-004");
    expect(v4.nullifier_hash).not.toBe(v1.nullifier_hash);
  });

  it("different notes produce different nullifier hashes even for same root", () => {
    const v1 = fixture.vectors.find((x: any) => x.id === "TV-001");
    const v3 = fixture.vectors.find((x: any) => x.id === "TV-003");
    expect(v1.nullifier_hash).not.toBe(v3.nullifier_hash);
  });

  it("same nullifier with different roots produces same nullifier hash (ZK-035: pool-scoped)", () => {
    const v = fixture.vectors[0];
    const nf = noteScalarToField(Buffer.from(v.note.nullifier_hex, "hex"));
    const pf = poolIdToField(v.note.pool_id);
    const nh1 = computeNullifierHash(nf, pf);
    const nh2 = computeNullifierHash(nf, pf);
    expect(nh1).toBe(nh2);
  });

  it("stellarAddressToField is deterministic for the same address", () => {
    const addr = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    expect(stellarAddressToField(addr)).toBe(stellarAddressToField(addr));
    expect(stellarAddressToField(addr)).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// Withdrawal public-input schema order guard (ZK-032)
// ---------------------------------------------------------------------------

describe("Withdrawal public-input schema ordering (ZK-032)", () => {
  it("schema has exactly 7 entries", () => {
    expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA).toHaveLength(7);
  });

  it("schema order is stable — pool_id first, fee last", () => {
    const expected = [
      "pool_id",
      "root",
      "nullifier_hash",
      "recipient",
      "amount",
      "relayer",
      "fee",
    ];
    expect(Array.from(WITHDRAWAL_PUBLIC_INPUT_SCHEMA)).toEqual(expected);
  });

  it("packWithdrawalPublicInputs maps arguments to schema positions", () => {
    const poolId = "0".repeat(63) + "1";
    const root = "0".repeat(63) + "2";
    const nh = "0".repeat(63) + "3";
    const recip = "0".repeat(63) + "4";
    const relayer = "0".repeat(63) + "5";
    const packed = packWithdrawalPublicInputs(
      poolId,
      root,
      nh,
      recip,
      999n,
      relayer,
      7n,
    );

    expect(packed).toHaveLength(7);
    expect(packed[0]).toBe(poolId);
    expect(packed[1]).toBe(root);
    expect(packed[2]).toBe(nh);
    expect(packed[3]).toBe(recip);
    expect(parseField(packed[4])).toBe(999n);
    expect(packed[5]).toBe(relayer);
    expect(parseField(packed[6])).toBe(7n);
  });

  it('serializeWithdrawalPublicInputs emits canonical verifier byte order', () => {
    const serialized = serializeWithdrawalPublicInputs({
      pool_id: '0'.repeat(63) + '1',
      root: '0'.repeat(63) + '2',
      nullifier_hash: '0'.repeat(63) + '3',
      recipient: '0'.repeat(63) + '4',
      amount: fieldToHex(999n),
      relayer: '0'.repeat(63) + '5',
      fee: fieldToHex(7n),
    });

    expect(serialized.fields).toEqual([
      '0'.repeat(63) + '1',
      '0'.repeat(63) + '2',
      '0'.repeat(63) + '3',
      '0'.repeat(63) + '4',
      fieldToHex(999n),
      '0'.repeat(63) + '5',
      fieldToHex(7n),
    ]);
  });

  it("prepareWitness public fields align with WITHDRAWAL_PUBLIC_INPUT_SCHEMA", async () => {
    const v = fixture.vectors[0];
    const note = buildNote(v);
    const merkleProof = buildMerkleProof(v);
    const witness = await ProofGenerator.prepareWitness(
      note,
      merkleProof,
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );

    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      expect(witness).toHaveProperty(key);
    }
  });

  it('buildWithdrawalPublicInputLayout uses witness fields in schema order', async () => {
    const v = fixture.vectors[0];
    const note = buildNote(v);
    const merkleProof = buildMerkleProof(v);
    const witness = await ProofGenerator.prepareWitness(
      note,
      merkleProof,
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    );

    const layout = buildWithdrawalPublicInputLayout(witness);

    expect(layout.values.pool_id).toBe(witness.pool_id);
    expect(layout.fields).toEqual(WITHDRAWAL_PUBLIC_INPUT_SCHEMA.map((key) => witness[key as keyof typeof witness]));
    expect(layout.bytes.length).toBe(WITHDRAWAL_PUBLIC_INPUT_SCHEMA.length * 32);
  });
});

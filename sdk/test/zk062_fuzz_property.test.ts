import { Note, NoteBackupError } from "../src/note";
import {
  LocalMerkleTree,
  validateMerkleProof,
  computeMerkleZeroLadder,
} from "../src/merkle";
import {
  serializeWithdrawalPublicInputs,
  serializeContractVerifierInputs,
  packWithdrawalPublicInputs,
  encodeAmount,
  encodeFee,
  encodeDenomination,
  encodeNullifierHash,
  encodeStellarAddress,
  encodePoolId,
  encodeMerkleRoot,
  fieldToHex,
  hexToField,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
  CONTRACT_VERIFIER_INPUT_SCHEMA,
  WithdrawalPublicInputs,
} from "../src/public_inputs";
import { WitnessValidationError } from "../src/errors";
import {
  FIELD_MODULUS,
  ZERO_FIELD_HEX,
  STELLAR_ZERO_ACCOUNT,
} from "../src/zk_constants";
import { stableHash32 } from "../src/stable";
import { Keypair } from "@stellar/stellar-base";

const MAX_NOTE_AMOUNT = (1n << 64n) - 1n;

interface MerkleProofShape {
  root: Buffer;
  pathElements: Buffer[];
  pathIndices?: number[];
  leafIndex: number;
}

class SeededPrng {
  private state: number;
  readonly seed: number;

  constructor(seed: number = 0x12345678) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  nextBigInt(min: bigint, max: bigint): bigint {
    const range = max - min + 1n;
    const hi = BigInt(Math.floor(this.nextFloat() * 0x100000000));
    const lo = BigInt(Math.floor(this.nextFloat() * 0x100000000));
    const combined = (hi << 32n) | lo;
    return min + (combined % range);
  }

  nextBytes(length: number): Buffer {
    const buffer = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = this.nextInt(0, 255);
    }
    return buffer;
  }

  asRandomnessSource() {
    return {
      randomBytes: (length: number): Uint8Array =>
        new Uint8Array(this.nextBytes(length)),
    };
  }

  nextCanonicalFieldHex(): string {
    const value = this.nextBigInt(0n, FIELD_MODULUS - 1n);
    return fieldToHex(value);
  }

  nextStellarAccountId(): string {
    return Keypair.random().publicKey();
  }
}

function verifyPathAgainstRoot(
  leaf: Buffer,
  proof: MerkleProofShape,
): boolean {
  let current = leaf;
  const pathIndices = proof.pathIndices ?? [];
  for (let level = 0; level < proof.pathElements.length; level++) {
    const sibling = proof.pathElements[level];
    const isRight = (pathIndices[level] ?? 0) === 1;
    current = isRight
      ? stableHash32("merkle-node", sibling, current)
      : stableHash32("merkle-node", current, sibling);
  }
  return current.equals(proof.root);
}

describe("ZK-062: Note Serialization Fuzz and Property Tests", () => {
  const prng = new SeededPrng(0xdeadbeef);

  it("property: round-trip importBackup(exportBackup()) preserves note state and commitment", () => {
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const poolId = prng.nextBytes(32).toString("hex");
      const amount =
        i === 0
          ? 0n
          : i === 1
          ? 1n
          : i === 2
          ? MAX_NOTE_AMOUNT
          : prng.nextBigInt(0n, MAX_NOTE_AMOUNT);
      const denomination =
        i % 2 === 0 ? amount : prng.nextBigInt(0n, MAX_NOTE_AMOUNT);
      const customPrng = new SeededPrng(prng.nextInt(1, 0x7fffffff));
      const note = Note.generate(
        poolId,
        amount,
        denomination,
        customPrng.asRandomnessSource(),
      );

      const exported = note.exportBackup();
      const imported = Note.importBackup(exported);

      expect(imported.nullifier.equals(note.nullifier)).toBe(true);
      expect(imported.secret.equals(note.secret)).toBe(true);
      expect(imported.poolId).toBe(note.poolId);
      expect(imported.amount).toBe(note.amount);
      expect(imported.denomination).toBe(note.denomination);
      expect(imported.getCommitment().equals(note.getCommitment())).toBe(true);
    }
  });

  it("property: round-trip deserialize(serialize()) preserves legacy note state and commitment", () => {
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      const poolId = prng.nextBytes(32).toString("hex");
      const amount = prng.nextBigInt(0n, MAX_NOTE_AMOUNT);
      const customPrng = new SeededPrng(prng.nextInt(1, 0x7fffffff));
      const note = Note.generate(
        poolId,
        amount,
        0n,
        customPrng.asRandomnessSource(),
      );

      const serialized = note.serialize();
      const deserialized = Note.deserialize(serialized);

      expect(deserialized.nullifier.equals(note.nullifier)).toBe(true);
      expect(deserialized.secret.equals(note.secret)).toBe(true);
      expect(deserialized.poolId).toBe(note.poolId);
      expect(deserialized.amount).toBe(note.amount);
      expect(deserialized.denomination).toBe(0n);
      expect(deserialized.getCommitment().equals(note.getCommitment())).toBe(true);
    }
  });

  it("fuzz: single-byte mutation in note backup payload is detected and rejected", () => {
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const note = Note.generate(
        prng.nextBytes(32).toString("hex"),
        prng.nextBigInt(1n, 1000000n),
        prng.nextBigInt(1n, 1000000n),
      );
      const backup = note.exportBackup();
      const prefix = "privacylayer-note:";
      const hexPayload = backup.slice(prefix.length);
      const payloadBytes = Buffer.from(hexPayload, "hex");

      const mutateByteIndex = prng.nextInt(0, payloadBytes.length - 1);
      const bitFlipMask = 1 << prng.nextInt(0, 7);
      payloadBytes[mutateByteIndex] ^= bitFlipMask;

      const corruptedBackup = prefix + payloadBytes.toString("hex");

      expect(() => Note.importBackup(corruptedBackup)).toThrow(NoteBackupError);
      try {
        Note.importBackup(corruptedBackup);
      } catch (err: any) {
        expect(err).toBeInstanceOf(NoteBackupError);
        expect(
          [
            "CHECKSUM_MISMATCH",
            "INVALID_VERSION",
            "CORRUPT_DATA",
          ].includes(err.code),
        ).toBe(true);
      }
    }
  });

  it("fuzz: structural prefix mutations are rejected with INVALID_PREFIX", () => {
    const invalidPrefixes = [
      "",
      "privacylayer-note",
      "privacylayer-note-",
      "PRIVACYLAYER-NOTE:",
      "note:",
      "privacylayer:",
      "invalid-prefix:",
      ":",
      "   ",
    ];

    for (const prefix of invalidPrefixes) {
      const payload = prng.nextBytes(115).toString("hex");
      const malformedBackup = prefix + payload;
      expect(() => Note.importBackup(malformedBackup)).toThrow(NoteBackupError);
      try {
        Note.importBackup(malformedBackup);
      } catch (err: any) {
        expect(err.code).toBe("INVALID_PREFIX");
      }
    }
  });

  it("fuzz: payload length truncations and extensions are rejected with INVALID_LENGTH or CORRUPT_DATA", () => {
    const validHex = prng.nextBytes(115).toString("hex");
    const deltaLengths = [-10, -5, -2, -1, 1, 2, 5, 10, -115];

    for (const delta of deltaLengths) {
      const targetCharCount = 230 + delta * 2;
      const modifiedHex =
        delta < 0
          ? validHex.slice(0, targetCharCount)
          : validHex + prng.nextBytes(delta).toString("hex");

      const candidate = `privacylayer-note:${modifiedHex}`;
      expect(() => Note.importBackup(candidate)).toThrow(NoteBackupError);
      try {
        Note.importBackup(candidate);
      } catch (err: any) {
        expect(["INVALID_LENGTH", "CORRUPT_DATA"].includes(err.code)).toBe(true);
      }
    }
  });

  it("fuzz: non-hex characters injected into payload are rejected", () => {
    const note = Note.generate(
      prng.nextBytes(32).toString("hex"),
      100n,
      100n,
    );
    const backup = note.exportBackup();
    const nonHexChars = ["g", "z", "x", "!", " ", "-", "Q", "M"];

    for (const char of nonHexChars) {
      const insertionPoint = prng.nextInt(
        "privacylayer-note:".length,
        backup.length - 1,
      );
      const corrupted =
        backup.slice(0, insertionPoint) +
        char +
        backup.slice(insertionPoint + 1);

      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
    }
  });

  describe("regression cases", () => {
    it("regression: corrupted checksum in denomination field produces CHECKSUM_MISMATCH", () => {
      const note = Note.deriveDeterministic(
        prng.nextBytes(32),
        "00".repeat(32),
        1000n,
        1000n,
      );
      const backup = note.exportBackup();
      const prefix = "privacylayer-note:";
      const payloadBytes = Buffer.from(backup.slice(prefix.length), "hex");
      payloadBytes[payloadBytes.length - 1] ^= 0x01;
      const corrupted = prefix + payloadBytes.toString("hex");

      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
      try {
        Note.importBackup(corrupted);
      } catch (err: any) {
        expect(err.code).toBe("CHECKSUM_MISMATCH");
      }
    });

    it("regression: unsupported version byte 0x02 produces INVALID_VERSION", () => {
      const note = Note.deriveDeterministic(
        prng.nextBytes(32),
        "00".repeat(32),
        500n,
        500n,
      );
      const backup = note.exportBackup();
      const prefix = "privacylayer-note:";
      const payloadBytes = Buffer.from(backup.slice(prefix.length), "hex");
      payloadBytes[0] = 0x02;
      const corrupted = prefix + payloadBytes.toString("hex");

      expect(() => Note.importBackup(corrupted)).toThrow(NoteBackupError);
      try {
        Note.importBackup(corrupted);
      } catch (err: any) {
        expect(err.code).toBe("INVALID_VERSION");
      }
    });
  });
});

describe("ZK-062: Witness and Public Input Serialization Fuzz and Property Tests", () => {
  const prng = new SeededPrng(0xabcdef01);

  function createValidPublicInputs(
    feeZero: boolean = true,
  ): WithdrawalPublicInputs {
    const amount = prng.nextBigInt(1000n, 50000n);
    const denomination = prng.nextBigInt(1000n, 50000n);
    const poolId = prng.nextCanonicalFieldHex();
    const nullifier = prng.nextCanonicalFieldHex();
    const nullifierHash = encodeNullifierHash(nullifier, poolId);
    const root = prng.nextCanonicalFieldHex();
    const recipient = encodeStellarAddress(prng.nextStellarAccountId());
    const relayer = feeZero
      ? ZERO_FIELD_HEX
      : encodeStellarAddress(prng.nextStellarAccountId());
    const fee = feeZero ? 0n : prng.nextBigInt(1n, amount);

    return {
      pool_id: poolId,
      root,
      nullifier_hash: nullifierHash,
      recipient,
      amount: encodeAmount(amount),
      relayer,
      fee: encodeFee(fee),
      denomination: encodeDenomination(denomination),
    };
  }

  it("property: serializeWithdrawalPublicInputs produces 256 bytes in canonical schema order", () => {
    const iterations = 50;
    for (let i = 0; i < iterations; i++) {
      const inputs = createValidPublicInputs(i % 2 === 0);
      const serialized = serializeWithdrawalPublicInputs(inputs);

      expect(serialized.bytes.length).toBe(256);
      expect(serialized.fields.length).toBe(8);
      expect(serialized.fields.length).toBe(WITHDRAWAL_PUBLIC_INPUT_SCHEMA.length);

      for (let f = 0; f < WITHDRAWAL_PUBLIC_INPUT_SCHEMA.length; f++) {
        const key = WITHDRAWAL_PUBLIC_INPUT_SCHEMA[f];
        expect(serialized.fields[f]).toBe(inputs[key].toLowerCase());
        const chunk = serialized.bytes.subarray(f * 32, (f + 1) * 32);
        expect(chunk.toString("hex")).toBe(inputs[key].toLowerCase());
      }
    }
  });

  it("property: serializeContractVerifierInputs matches contract schema byte layout", () => {
    const iterations = 30;
    for (let i = 0; i < iterations; i++) {
      const inputs = createValidPublicInputs(i % 2 === 0);
      const contractSerialized = serializeContractVerifierInputs(inputs);

      expect(contractSerialized.bytes.length).toBe(256);
      expect(contractSerialized.fields.length).toBe(
        CONTRACT_VERIFIER_INPUT_SCHEMA.length,
      );

      for (let f = 0; f < CONTRACT_VERIFIER_INPUT_SCHEMA.length; f++) {
        const key = CONTRACT_VERIFIER_INPUT_SCHEMA[f];
        expect(contractSerialized.fields[f]).toBe(inputs[key].toLowerCase());
      }
    }
  });

  it("property: packWithdrawalPublicInputs matches serializeWithdrawalPublicInputs fields", () => {
    const iterations = 25;
    for (let i = 0; i < iterations; i++) {
      const poolId = prng.nextCanonicalFieldHex();
      const root = prng.nextCanonicalFieldHex();
      const nullifierHash = prng.nextCanonicalFieldHex();
      const recipient = encodeStellarAddress(prng.nextStellarAccountId());
      const relayer = encodeStellarAddress(prng.nextStellarAccountId());
      const amount = prng.nextBigInt(100n, 10000n);
      const fee = prng.nextBigInt(1n, amount);
      const denomination = prng.nextBigInt(100n, 10000n);

      const packed = packWithdrawalPublicInputs(
        poolId,
        root,
        nullifierHash,
        recipient,
        amount,
        relayer,
        fee,
        denomination,
      );

      const expected = serializeWithdrawalPublicInputs({
        pool_id: poolId,
        root,
        nullifier_hash: nullifierHash,
        recipient,
        amount: encodeAmount(amount),
        relayer,
        fee: encodeFee(fee),
        denomination: encodeDenomination(denomination),
      });

      expect(packed).toEqual(expected.fields);
    }
  });

  it("fuzz: decimal string amounts, fees, and denominations are rejected (ZK-082)", () => {
    const inputs = createValidPublicInputs(false);
    const decimalValues = ["0", "1", "100", "5000000", "999999999999"];

    for (const dec of decimalValues) {
      expect(() =>
        serializeWithdrawalPublicInputs({
          ...inputs,
          amount: dec,
        }),
      ).toThrow(/not a decimal string/);

      expect(() =>
        serializeWithdrawalPublicInputs({
          ...inputs,
          fee: dec,
        }),
      ).toThrow(/not a decimal string/);

      expect(() =>
        serializeWithdrawalPublicInputs({
          ...inputs,
          denomination: dec,
        }),
      ).toThrow(/not a decimal string/);
    }
  });

  it("fuzz: non-canonical field length or invalid hex characters are rejected", () => {
    const inputs = createValidPublicInputs(true);

    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      const original = inputs[key];
      const shortened = original.slice(0, 63);
      const lengthened = original + "00";
      const nonHex = original.slice(0, 63) + "z";

      for (const invalid of [shortened, lengthened, nonHex]) {
        expect(() =>
          serializeWithdrawalPublicInputs({
            ...inputs,
            [key]: invalid,
          }),
        ).toThrow();
      }
    }
  });

  it("fuzz: missing public input properties are rejected", () => {
    for (const key of WITHDRAWAL_PUBLIC_INPUT_SCHEMA) {
      const inputs = createValidPublicInputs(true);
      const copy = { ...inputs };
      delete (copy as any)[key];

      expect(() => serializeWithdrawalPublicInputs(copy)).toThrow(
        new RegExp(`Missing public input: ${key}`),
      );
    }
  });

  it("property: encodeStellarAddress enforces Ed25519 strkey format and returns canonical field hex", () => {
    for (let i = 0; i < 25; i++) {
      const validAddress = prng.nextStellarAccountId();
      const encoded = encodeStellarAddress(validAddress);
      expect(encoded.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(encoded)).toBe(true);
      const fieldVal = hexToField(encoded);
      expect(fieldVal < FIELD_MODULUS).toBe(true);
    }

    const invalidAddresses = [
      "",
      "G12345",
      "not-an-address",
      "S12345678901234567890123456789012345678901234567890123456",
      "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W3P00",
    ];
    for (const bad of invalidAddresses) {
      expect(() => encodeStellarAddress(bad)).toThrow(WitnessValidationError);
    }
  });

  it("property: encodeNullifierHash produces deterministic BN254 field element", () => {
    for (let i = 0; i < 25; i++) {
      const nullifier = prng.nextCanonicalFieldHex();
      const poolId = prng.nextCanonicalFieldHex();
      const hashA = encodeNullifierHash(nullifier, poolId);
      const hashB = encodeNullifierHash(nullifier, poolId);
      expect(hashA).toBe(hashB);
      expect(hashA.length).toBe(64);
      expect(hexToField(hashA) < FIELD_MODULUS).toBe(true);
    }
  });

  describe("regression cases", () => {
    it("regression: decimal string in amount field throws descriptive error", () => {
      const inputs = createValidPublicInputs(true);
      expect(() =>
        serializeWithdrawalPublicInputs({
          ...inputs,
          amount: "1000",
        }),
      ).toThrow(/amount must be a canonical 64-character field hex string/);
    });

    it("regression: 63-character hex in root field throws 64-digit requirement", () => {
      const inputs = createValidPublicInputs(true);
      expect(() =>
        serializeWithdrawalPublicInputs({
          ...inputs,
          root: "a".repeat(63),
        }),
      ).toThrow(/root must be a 64-digit hex string/);
    });
  });
});

describe("ZK-062: Merkle Path Fuzz and Property Tests", () => {
  const prng = new SeededPrng(0x98765432);

  it("property: generated Merkle proof path elements recompute tree root across depths", () => {
    const testDepths = [3, 4, 6];

    for (const depth of testDepths) {
      const tree = new LocalMerkleTree(depth);
      const leafCount = Math.min(2 ** depth, prng.nextInt(3, 10));
      const leaves: Buffer[] = [];

      for (let i = 0; i < leafCount; i++) {
        const leaf = prng.nextBytes(32);
        leaves.push(leaf);
        tree.insert(leaf);
      }

      for (let i = 0; i < leafCount; i++) {
        const proof = tree.generateProof(i);
        expect(proof.leafIndex).toBe(i);
        expect(proof.pathElements.length).toBe(depth);
        expect(proof.pathIndices).toBeDefined();
        expect(proof.pathIndices!.length).toBe(depth);
        expect(proof.root.equals(tree.getRoot())).toBe(true);

        const valid = verifyPathAgainstRoot(leaves[i], proof);
        expect(valid).toBe(true);
      }
    }
  });

  it("property: single-bit sibling mutation in Merkle path causes verification failure", () => {
    const depth = 5;
    const tree = new LocalMerkleTree(depth);
    const leafCount = 8;
    const leaves: Buffer[] = [];

    for (let i = 0; i < leafCount; i++) {
      const leaf = prng.nextBytes(32);
      leaves.push(leaf);
      tree.insert(leaf);
    }

    for (let i = 0; i < leafCount; i++) {
      const proof = tree.generateProof(i);

      for (let level = 0; level < depth; level++) {
        const corruptedPathElements = proof.pathElements.map((el, idx) => {
          if (idx === level) {
            const copy = Buffer.from(el);
            copy[prng.nextInt(0, 31)] ^= 1 << prng.nextInt(0, 7);
            return copy;
          }
          return el;
        });

        const corruptedProof: MerkleProofShape = {
          ...proof,
          pathElements: corruptedPathElements,
        };

        const valid = verifyPathAgainstRoot(leaves[i], corruptedProof);
        expect(valid).toBe(false);
      }
    }
  });

  it("property: batch insertion is strictly equivalent to sequential insertion", () => {
    const depth = 4;
    const iterations = 15;

    for (let it = 0; it < iterations; it++) {
      const count = prng.nextInt(1, 2 ** depth);
      const leaves = Array.from({ length: count }, () => prng.nextBytes(32));

      const seqTree = new LocalMerkleTree(depth);
      for (const leaf of leaves) {
        seqTree.insert(leaf);
      }

      const batchTree = new LocalMerkleTree(depth);
      batchTree.insertBatch(leaves);

      expect(seqTree.getRoot().equals(batchTree.getRoot())).toBe(true);
      expect(seqTree.leafCount).toBe(batchTree.leafCount);
    }
  });

  it("property: empty tree root matches computeMerkleZeroLadder canonical zero root", () => {
    for (let depth = 1; depth <= 12; depth++) {
      const emptyTree = new LocalMerkleTree(depth);
      const ladder = computeMerkleZeroLadder(depth);
      expect(emptyTree.getRoot().equals(ladder[depth])).toBe(true);
    }
  });

  it("fuzz: validateMerkleProof enforces node byte length and non-zero canonical root", () => {
    const depth = 4;
    const tree = new LocalMerkleTree(depth);
    tree.insert(prng.nextBytes(32));
    const proof = tree.generateProof(0);

    const zeroRootProof: MerkleProofShape = {
      ...proof,
      root: Buffer.alloc(32, 0),
    };
    expect(() => validateMerkleProof(zeroRootProof as any, depth)).toThrow(
      WitnessValidationError,
    );

    const shortRootProof: MerkleProofShape = {
      ...proof,
      root: prng.nextBytes(31),
    };
    expect(() => validateMerkleProof(shortRootProof as any, depth)).toThrow(
      WitnessValidationError,
    );

    const wrongPathLengthProof: MerkleProofShape = {
      ...proof,
      pathElements: proof.pathElements.slice(0, depth - 1),
    };
    expect(() =>
      validateMerkleProof(wrongPathLengthProof as any, depth),
    ).toThrow(WitnessValidationError);

    const corruptedElementLengthProof: MerkleProofShape = {
      ...proof,
      pathElements: proof.pathElements.map((el, i) =>
        i === 0 ? Buffer.alloc(31, 1) : el,
      ),
    };
    expect(() =>
      validateMerkleProof(corruptedElementLengthProof as any, depth),
    ).toThrow(WitnessValidationError);
  });

  describe("regression cases", () => {
    it("regression: leaf index out of range throws descriptive error", () => {
      const tree = new LocalMerkleTree(4);
      tree.insert(prng.nextBytes(32));

      expect(() => tree.generateProof(-1)).toThrow(/out of range/);
      expect(() => tree.generateProof(1)).toThrow(/out of range/);
      expect(() => tree.generateProof(100)).toThrow(/out of range/);
    });

    it("regression: insertion past tree capacity throws full error", () => {
      const depth = 2;
      const tree = new LocalMerkleTree(depth);
      const capacity = 2 ** depth;

      for (let i = 0; i < capacity; i++) {
        tree.insert(prng.nextBytes(32));
      }

      expect(() => tree.insert(prng.nextBytes(32))).toThrow(/full/);
    });
  });
});

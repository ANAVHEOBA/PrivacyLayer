import { Note } from "./note";
import {
  WithdrawalPublicInputs,
  fieldToHex,
  merkleNodeToField,
  noteScalarToField,
  poolIdToField,
  computeNullifierHash,
  serializeWithdrawalPublicInputs,
  stellarAddressToField,
} from "./encoding";
import { WitnessValidationError } from "./errors";
import {
  assertValidGroth16ProofBytes,
  assertValidPreparedWithdrawalWitness,
} from "./witness";
import { STELLAR_ZERO_ACCOUNT, ZERO_FIELD_HEX, DEFAULT_DENOMINATION } from "./zk_constants";
import {
  PRODUCTION_MERKLE_TREE_DEPTH,
  assertMerkleDepth,
  merkleMaxLeafIndex,
  validateMerkleProof,
} from "./merkle";

export type ProvingErrorCode =
  | "ARTIFACT_ERROR"
  | "WITNESS_ERROR"
  | "BACKEND_ERROR"
  | "FORMATTING_ERROR";

/**
 * ProvingError
 *
 * A stable error model for proof generation failures.
 */
export class ProvingError extends Error {
  constructor(
    message: string,
    public readonly code: ProvingErrorCode,
    public readonly cause?: any,
  ) {
    super(message);
    this.name = "ProvingError";
  }
}

export interface MerkleProof {
  root: Buffer;
  pathElements: Buffer[];
  /** If provided and non-empty, must match the Merkle path length (e.g. 20). */
  pathIndices?: number[];
  leafIndex: number;
}

export interface Groth16Proof {
  proof: Uint8Array;
  publicInputs: string[];
  publicInputBytes: Uint8Array;
}

/**
 * @deprecated Use PreparedWitness. This type uses path_elements/path_indices which
 * do not align with the Noir circuit's hash_path parameter (ZK-007).
 */
export interface WithdrawalWitness {
  root: string;
  nullifier_hash: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
  pool_id: string;
  nullifier: string;
  secret: string;
  leaf_index: string;
  path_elements: string[];
  path_indices: string[];
}

export interface ProofCache {
  get(
    key: string,
  ): Promise<Uint8Array | Buffer | undefined> | Uint8Array | Buffer | undefined;
  set(key: string, proof: Uint8Array | Buffer): Promise<void> | void;
  delete?(key: string): Promise<void> | void;
}

/**
 * Lightweight in-memory cache implementation for environments
 * that do not provide their own storage adapter.
 */
export class InMemoryProofCache implements ProofCache {
  private readonly entries = new Map<string, Buffer>();

  get(key: string): Buffer | undefined {
    const entry = this.entries.get(key);
    return entry ? Buffer.from(entry) : undefined;
  }

  set(key: string, proof: Uint8Array | Buffer): void {
    this.entries.set(key, Buffer.from(proof));
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

/**
 * ProvingBackend
 *
 * Abstraction for the proof generation engine (e.g., Barretenberg).
 * This allows the SDK to remain agnostic of the runtime (Node.js vs Browser).
 */
export interface ProvingBackend {
  /**
   * Generates a proof for the given witness.
   * @param witness The circuit-friendly witness inputs.
   * @returns The generated proof as a Uint8Array.
   */
  generateProof(witness: any): Promise<Uint8Array>;
}

/**
 * VerifyingBackend
 *
 * Abstraction for the proof verification engine.
 */
export interface VerifyingBackend {
  /**
   * Verifies a proof against public inputs and circuit artifacts.
   * @param proof The generated proof bytes.
   * @param publicInputs The public inputs for the circuit.
   * @param artifacts The circuit artifacts (vkey, acir, etc).
   * @returns A boolean indicating if the proof is valid.
   */
  verifyProof(
    proof: Uint8Array,
    publicInputs: string[],
    artifacts: any,
  ): Promise<boolean>;
}

/**
 * PreparedWitness
 *
 * Strongly-typed witness ready for the withdrawal circuit entrypoint defined
 * in circuits/withdraw/src/main.nr.  All field values are canonical 64-char
 * hex strings (32 bytes, big-endian, no 0x prefix).
 */
export interface PreparedWitness {
  // Private witnesses
  nullifier: string;
  secret: string;
  leaf_index: string;
  hash_path: string[];
  // Public inputs
  pool_id: string;
  root: string;
  nullifier_hash: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
  denomination: string;
}

export const PREPARED_WITHDRAWAL_WITNESS_SCHEMA = [
  'nullifier',
  'secret',
  'leaf_index',
  'hash_path',
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
  'denomination',
] as const;

function canonicalizePreparedWitness(witness: PreparedWitness): PreparedWitness {
  return {
    nullifier: witness.nullifier,
    secret: witness.secret,
    leaf_index: witness.leaf_index,
    hash_path: witness.hash_path.map((entry) => entry),
    pool_id: witness.pool_id,
    root: witness.root,
    nullifier_hash: witness.nullifier_hash,
    recipient: witness.recipient,
    amount: witness.amount,
    relayer: witness.relayer,
    fee: witness.fee,
    denomination: witness.denomination,
  };
}

export interface WitnessPreparationOptions {
  merkleDepth?: number;
  denomination?: bigint;
}

/**
 * ProofGenerator
 *
 * Logic to orchestrate Noir proof generation for withdrawals.
 * This class prepares the circuit witnesses and interacts with a ProvingBackend.
 */
export class ProofGenerator {
  private backend?: ProvingBackend;

  constructor(backend?: ProvingBackend) {
    this.backend = backend;
  }

  /**
   * Sets or updates the proving backend.
   */
  setBackend(backend: ProvingBackend) {
    this.backend = backend;
  }

  /**
   * Generates a proof using the configured backend.
   */
  async generate(
    witness: any,
    options: WitnessPreparationOptions = {},
  ): Promise<Uint8Array> {
    if (!this.backend) {
      throw new ProvingError(
        "Proving backend not configured. Please provide a backend to the ProofGenerator.",
        "BACKEND_ERROR",
      );
    }
    try {
      assertValidPreparedWithdrawalWitness(witness, options);
    } catch (e: any) {
      throw new ProvingError(
        `Invalid witness: ${e.message}`,
        "WITNESS_ERROR",
        e,
      );
    }

    try {
      return await this.backend.generateProof(canonicalizePreparedWitness(witness));
    } catch (e: any) {
      throw new ProvingError(
        `Backend proof generation failed: ${e.message}`,
        "BACKEND_ERROR",
        e,
      );
    }
  }

  /**
   * Prepares the witness inputs for the Noir withdrawal circuit.
   *
   * All field values are canonical 64-char hex strings produced by the
   * encoding helpers in encoding.ts.  The returned shape exactly mirrors
   * the circuit parameter list in circuits/withdraw/src/main.nr:
   *
   *   Private:  nullifier, secret, leaf_index, hash_path
   *   Public:   pool_id, root, nullifier_hash, recipient, amount, relayer, fee, denomination
   *
   * ZK-030: Validates that the note amount matches the pool's fixed denomination.
   */
  static async prepareWitness(
    note: Note,
    merkleProof: MerkleProof,
    recipient: string,
    relayer: string = STELLAR_ZERO_ACCOUNT,
    fee: bigint = 0n,
    options: WitnessPreparationOptions = {},
  ): Promise<PreparedWitness> {
    const expectedDepth = assertMerkleDepth(
      options.merkleDepth ?? PRODUCTION_MERKLE_TREE_DEPTH,
      "merkleDepth",
    );

    validateMerkleProof(merkleProof, expectedDepth);

    if (
      merkleProof.pathIndices !== undefined &&
      merkleProof.pathIndices.length > 0 &&
      merkleProof.pathIndices.length !== expectedDepth
    ) {
      throw new WitnessValidationError(
        `pathIndices length must equal tree depth ${expectedDepth}, got ${merkleProof.pathIndices.length}`,
        "MERKLE_PATH",
        "structure",
      );
    }

    const maxLeafIndex = merkleMaxLeafIndex(expectedDepth);
    if (
      !Number.isInteger(merkleProof.leafIndex) ||
      merkleProof.leafIndex < 0 ||
      merkleProof.leafIndex > maxLeafIndex
    ) {
      throw new WitnessValidationError(
        `leafIndex out of range for tree depth (max ${maxLeafIndex})`,
        "LEAF_INDEX",
        "domain",
      );
    }

    // ZK-030: Validate denomination matches note amount
    const expectedDenomination = options.denomination ?? DEFAULT_DENOMINATION;
    if (note.amount !== expectedDenomination) {
      throw new WitnessValidationError(
        `Denomination mismatch: note amount ${note.amount} does not match pool denomination ${expectedDenomination}`,
        "DENOMINATION",
        "domain",
      );
    }

    const rootField = merkleNodeToField(merkleProof.root);
    const nullifierField = noteScalarToField(note.nullifier);
    const secretField = noteScalarToField(note.secret);
    const poolIdField = poolIdToField(note.poolId);
    // ZK-035: Pool-scoped nullifier hash - stable across roots, prevents cross-pool replay
    const nullifierHash = computeNullifierHash(nullifierField, poolIdField);
    const recipientField = stellarAddressToField(recipient);
    const relayerField =
      fee === 0n ? ZERO_FIELD_HEX : stellarAddressToField(relayer);

    return {
      nullifier: nullifierField,
      secret: secretField,
      leaf_index: fieldToHex(BigInt(merkleProof.leafIndex)),
      hash_path: merkleProof.pathElements.map((e) => merkleNodeToField(e)),
      pool_id: poolIdField,
      root: rootField,
      nullifier_hash: nullifierHash,
      recipient: recipientField,
      amount: fieldToHex(note.amount),
      relayer: relayerField,
      fee: fee.toString(),
      denomination: expectedDenomination.toString(),
    };
  }

  /**
   * Formats a raw proof from Noir/Barretenberg into the format
   * expected by the Soroban contract.
   */
  static formatProofPayload(
    rawProof: Uint8Array,
    publicInputs: WithdrawalPublicInputs
  ): Groth16Proof {
    try {
      assertValidGroth16ProofBytes(rawProof, "rawProof");
    } catch (e: any) {
      throw new ProvingError(
        `Invalid proof format from backend: ${e.message}`,
        "FORMATTING_ERROR",
        e,
      );
    }

    try {
      const serialized = serializeWithdrawalPublicInputs(publicInputs);
      return {
        proof: Buffer.from(rawProof),
        publicInputs: serialized.fields,
        publicInputBytes: serialized.bytes,
      };
    } catch (e: any) {
      throw new ProvingError(
        `Invalid withdrawal public-input schema: ${e.message}`,
        'FORMATTING_ERROR',
        e
      );
    }
  }

  /**
   * Formats a raw proof from Noir/Barretenberg into the proof bytes
   * expected by the Soroban contract.
   */
  static formatProof(rawProof: Uint8Array, publicInputs: WithdrawalPublicInputs): Buffer {
    // Soroban contract expects Proof struct: { a: BytesN<64>, b: BytesN<128>, c: BytesN<64> }
    return Buffer.from(this.formatProofPayload(rawProof, publicInputs).proof);
  }
}

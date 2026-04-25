import { Note } from './note';
import {
  merkleNodeToField,
  noteScalarToField,
  poolIdToField,
  computeNullifierHash,
  stellarAddressToField,
} from './encoding';
import { WitnessValidationError } from './errors';
import { assertValidGroth16ProofBytes, assertValidPreparedWithdrawalWitness } from './witness';
import { MERKLE_TREE_DEPTH, STELLAR_ZERO_ACCOUNT, ZERO_FIELD_HEX } from './zk_constants';

export type ProvingErrorCode =
  | 'ARTIFACT_ERROR'
  | 'WITNESS_ERROR'
  | 'BACKEND_ERROR'
  | 'FORMATTING_ERROR';

/**
 * ProvingError
 *
 * A stable error model for proof generation failures.
 */
export class ProvingError extends Error {
  constructor(
    message: string,
    public readonly code: ProvingErrorCode,
    public readonly cause?: any
  ) {
    super(message);
    this.name = 'ProvingError';
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
  get(key: string): Promise<Uint8Array | Buffer | undefined> | Uint8Array | Buffer | undefined;
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
  verifyProof(proof: Uint8Array, publicInputs: string[], artifacts: any): Promise<boolean>;
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
  async generate(witness: any): Promise<Uint8Array> {
    if (!this.backend) {
      throw new ProvingError(
        'Proving backend not configured. Please provide a backend to the ProofGenerator.',
        'BACKEND_ERROR'
      );
    }
    try {
      assertValidPreparedWithdrawalWitness(witness);
    } catch (e: any) {
      throw new ProvingError(`Invalid witness: ${e.message}`, 'WITNESS_ERROR', e);
    }

    try {
      return await this.backend.generateProof(witness);
    } catch (e: any) {
      throw new ProvingError(`Backend proof generation failed: ${e.message}`, 'BACKEND_ERROR', e);
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
   *   Public:   pool_id, root, nullifier_hash, recipient, amount, relayer, fee
   */
  static async prepareWitness(
    note: Note,
    merkleProof: MerkleProof,
    recipient: string,
    relayer: string = STELLAR_ZERO_ACCOUNT,
    fee: bigint = 0n
  ): Promise<PreparedWitness> {
    if (
      merkleProof.pathIndices !== undefined &&
      merkleProof.pathIndices.length > 0 &&
      merkleProof.pathIndices.length !== MERKLE_TREE_DEPTH
    ) {
      throw new WitnessValidationError(
        `pathIndices length must equal tree depth ${MERKLE_TREE_DEPTH}, got ${merkleProof.pathIndices.length}`,
        'MERKLE_PATH',
        'structure'
      );
    }

    const rootField       = merkleNodeToField(merkleProof.root);
    const nullifierField  = noteScalarToField(note.nullifier);
    const secretField     = noteScalarToField(note.secret);
    const poolIdField     = poolIdToField(note.poolId);
    const nullifierHash   = computeNullifierHash(nullifierField, rootField);
    const recipientField  = stellarAddressToField(recipient);
    const relayerField    = fee === 0n ? ZERO_FIELD_HEX : stellarAddressToField(relayer);

    return {
      nullifier:     nullifierField,
      secret:        secretField,
      leaf_index:    merkleProof.leafIndex.toString(),
      hash_path:     merkleProof.pathElements.map((e) => merkleNodeToField(e)),
      pool_id:       poolIdField,
      root:          rootField,
      nullifier_hash: nullifierHash,
      recipient:     recipientField,
      amount:        note.amount.toString(),
      relayer:       relayerField,
      fee:           fee.toString(),
    };
  }

  /**
   * Formats a raw proof from Noir/Barretenberg into the format
   * expected by the Soroban contract.
   */
  static formatProof(rawProof: Uint8Array): Buffer {
    // Soroban contract expects Proof struct: { a: BytesN<64>, b: BytesN<128>, c: BytesN<64> }
    try {
      assertValidGroth16ProofBytes(rawProof, 'rawProof');
    } catch (e: any) {
      throw new ProvingError(`Invalid proof format from backend: ${e.message}`, 'FORMATTING_ERROR', e);
    }
    return Buffer.from(rawProof);
  }
}

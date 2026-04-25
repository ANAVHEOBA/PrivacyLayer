import { Note } from './note';
import {
  computeNullifierHash,
  fieldToHex,
  merkleNodeToField,
  noteScalarToField,
  poolIdToField,
  stellarAddressToField,
} from './encoding';
import { validateMerkleProof } from './merkle';
import { assertValidGroth16ProofBytes, assertValidPreparedWithdrawalWitness, assertValidStellarAccountId } from './witness';

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
   * All field values are encoded with canonical helpers from encoding.ts:
   * - Note scalars (nullifier, secret) are 31-byte buffers → field hex
   * - Merkle nodes are 32-byte buffers → field hex (reduced mod r)
   * - Stellar addresses are SHA-256 hashed → field hex (stand-in for contract decoder)
   * - nullifier_hash = H(nullifier_field, root_field) matching the circuit definition
   *
   * The returned shape exactly matches the circuit parameter list in
   * circuits/withdraw/src/main.nr.
   */
  static async prepareWitness(
    note: Note,
    merkleProof: MerkleProof,
    recipient: string,
    relayer: string = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    fee: bigint = 0n
  ): Promise<PreparedWitness> {
    try {
      validateMerkleProof(merkleProof);
      assertValidStellarAccountId(recipient, 'recipient');
      if (fee > 0n) {
        assertValidStellarAccountId(relayer, 'relayer');
      }
    } catch (e: any) {
      throw new ProvingError(`Formatting error during witness prep: ${e.message}`, 'FORMATTING_ERROR', e);
    }

    const nullifierField = noteScalarToField(note.nullifier);
    const secretField = noteScalarToField(note.secret);
    const poolIdField = poolIdToField(note.poolId);
    const rootField = merkleNodeToField(merkleProof.root);
    const nullifierHash = computeNullifierHash(nullifierField, rootField);
    const recipientField = stellarAddressToField(recipient);
    const relayerField = fee === 0n ? fieldToHex(0n) : stellarAddressToField(relayer);

    const witness: PreparedWitness = {
      // Private witnesses
      nullifier: nullifierField,
      secret: secretField,
      leaf_index: merkleProof.leafIndex.toString(),
      hash_path: merkleProof.pathElements.map(merkleNodeToField),
      // Public inputs
      pool_id: poolIdField,
      root: rootField,
      nullifier_hash: nullifierHash,
      recipient: recipientField,
      amount: note.amount.toString(),
      relayer: relayerField,
      fee: fee.toString(),
    };

    try {
      assertValidPreparedWithdrawalWitness(witness);
    } catch (e: any) {
      throw new ProvingError(`Inconsistent witness generated: ${e.message}`, 'WITNESS_ERROR', e);
    }

    return witness;
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

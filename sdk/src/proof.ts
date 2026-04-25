import { Note } from './note';
import {
  computeNullifierHash,
  fieldToHex,
  merkleNodeToField,
  noteScalarToField,
  stellarAddressToField,
} from './encoding';
import { validateMerkleProof } from './merkle';
import { assertValidGroth16ProofBytes, assertValidPreparedWithdrawalWitness, assertValidStellarAccountId } from './witness';
import { WitnessValidationError } from './errors';
import {
  ProofError,
  errNoProvingBackend,
  wrapProofError,
  ProofErrorCode,
} from './proofErrors';

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
   *
   * @throws {ProofError} With stable error code on failure.
   * @see ProofErrorCode for all possible error codes.
   */
  async generate(witness: any): Promise<Uint8Array> {
    if (!this.backend) {
      throw errNoProvingBackend();
    }

    // assertValidPreparedWithdrawalWitness throws WitnessValidationError (backwards compatible)
    assertValidPreparedWithdrawalWitness(witness);

    try {
      return await this.backend.generateProof(witness);
    } catch (e) {
      // Wrap backend errors with stable classification
      const message = e instanceof Error ? e.message : 'Unknown backend error';
      const lower = message.toLowerCase();

      if (lower.includes('constraint') || lower.includes('unsatis')) {
        throw wrapProofError(e, ProofErrorCode.CONSTRAINT_VIOLATION);
      }
      if (lower.includes('timeout') || lower.includes('abort')) {
        throw wrapProofError(e, ProofErrorCode.PROOF_GENERATION_TIMEOUT);
      }
      if (lower.includes('memory') || lower.includes('oom') || lower.includes('out of memory')) {
        throw wrapProofError(e, ProofErrorCode.PROOF_GENERATION_OOM);
      }
      if (lower.includes('wasm') || lower.includes('webassembly')) {
        throw wrapProofError(e, ProofErrorCode.WASM_RUNTIME_ERROR);
      }

      throw wrapProofError(e, ProofErrorCode.PROVING_BACKEND_FAILURE);
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
   *
   * @throws {ProofError} With WITNESS_VALIDATION_FAILED or MERKLE_PROOF_INVALID on failure.
   */
  static async prepareWitness(
    note: Note,
    merkleProof: MerkleProof,
    recipient: string,
    relayer: string = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    fee: bigint = 0n
  ): Promise<PreparedWitness> {
    // Validation asserts throw WitnessValidationError directly (backwards compatible)
    validateMerkleProof(merkleProof);
    assertValidStellarAccountId(recipient, 'recipient');
    if (fee > 0n) {
      assertValidStellarAccountId(relayer, 'relayer');
    }
    const nullifierField = noteScalarToField(note.nullifier);
    const secretField = noteScalarToField(note.secret);
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
      root: rootField,
      nullifier_hash: nullifierHash,
      recipient: recipientField,
      amount: note.amount.toString(),
      relayer: relayerField,
      fee: fee.toString(),
    };
    assertValidPreparedWithdrawalWitness(witness);
    return witness;
  }

  /**
   * Formats a raw proof from Noir/Barretenberg into the format
   * expected by the Soroban contract.
   *
   * @throws {WitnessValidationError} With PROOF_FORMAT code if validation fails.
   */
  static formatProof(rawProof: Uint8Array): Buffer {
    // Soroban contract expects Proof struct: { a: BytesN<64>, b: BytesN<128>, c: BytesN<64> }
    // Note: assertValidGroth16ProofBytes throws WitnessValidationError
    assertValidGroth16ProofBytes(rawProof, 'rawProof');
    return Buffer.from(rawProof);
  }
}

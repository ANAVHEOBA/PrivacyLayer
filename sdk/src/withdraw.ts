import { Note } from "./note";
import {
  MerkleProof,
  PreparedWitness,
  ProofCache,
  ProofGenerator,
  ProvingBackend,
  VerifyingBackend,
} from "./proof";
import {
  BatchSyncResult,
  CommitmentLike,
  LocalMerkleTree,
  MerkleCheckpoint,
  syncCommitmentBatch,
} from "./merkle";
import {
  SerializedWithdrawalPublicInputs,
  WithdrawalPublicInputs,
  serializeWithdrawalPublicInputs,
} from "./encoding";
import { stableHash32, stableStringify } from "./stable";
import { WitnessValidationError } from "./errors";
import { assertCapability, isCapabilitySupported, ZkCapabilities, detectCapabilities } from "./capabilities";

/**
 * WithdrawalRequest
 *
 * Parameters for generating a withdrawal proof.
 */
export interface WithdrawalRequest {
  note: Note;
  merkleProof: MerkleProof;
  recipient: string;
  relayer?: string;
  fee?: bigint;
}

export interface WithdrawalProofGenerationOptions {
  cache?: ProofCache;
  cacheKey?: string;
  merkleDepth?: number;
  denomination?: bigint;
  /**
   * ZK-106: Forward to `ProofGenerator.generate()` to allow a mock-hash witness
   * through the production guard.  Set to `true` ONLY in tests.
   * See {@link WitnessPreparationOptions.testOnlyAllowMockHash}.
   */
  testOnlyAllowMockHash?: true;
}

interface WithdrawalCacheMaterial {
  privateInputs: {
    nullifier: string;
    secret: string;
    leaf_index: string;
    hash_path: string[];
  };
  publicInputs: WithdrawalPublicInputs;
  pool: string;
  denomination: string;
}

function buildCacheMaterial(
  request: WithdrawalRequest,
  witness: PreparedWitness,
): WithdrawalCacheMaterial {
  const serialized = serializeWithdrawalPublicInputs(witness);
  return {
    privateInputs: {
      nullifier: witness.nullifier,
      secret: witness.secret,
      leaf_index: witness.leaf_index,
      hash_path: witness.hash_path.slice(),
    },
    publicInputs: serialized.values,
    pool: request.note.poolId,
    denomination: witness.denomination,
  };
}

export function buildWithdrawalProofCacheKey(
  request: WithdrawalRequest,
  witness: PreparedWitness,
): string {
  const material = buildCacheMaterial(request, witness);
  const canonical = stableStringify(material);
  return `withdraw-proof:${stableHash32("withdraw-proof-cache-v1", canonical).toString("hex")}`;
}

/**
 * Transport-agnostic helper for syncing new deposit commitments into a local tree.
 */
export function syncWithdrawalTree(
  tree: LocalMerkleTree,
  commitments: CommitmentLike[],
  checkpointOptions: { includeLeaves?: boolean } = {},
): BatchSyncResult {
  return syncCommitmentBatch(tree, commitments, checkpointOptions);
}

export function restoreWithdrawalTree(
  checkpoint: MerkleCheckpoint,
): LocalMerkleTree {
  return LocalMerkleTree.fromCheckpoint(checkpoint);
}

function assertNamedWithdrawalPublicInputs(
  publicInputs: WithdrawalPublicInputs | PreparedWitness | string[],
): asserts publicInputs is WithdrawalPublicInputs | PreparedWitness {
  if (Array.isArray(publicInputs)) {
    throw new WitnessValidationError(
      "Public inputs must be provided as named fields so canonical schema order can be enforced",
      "PUBLIC_INPUT_SCHEMA",
      "structure",
    );
  }
}

export function buildWithdrawalPublicInputLayout(
  publicInputs: WithdrawalPublicInputs | PreparedWitness,
): SerializedWithdrawalPublicInputs {
  return serializeWithdrawalPublicInputs(publicInputs);
}

/**
 * Checks if the current runtime can generate withdrawal proofs.
 *
 * @returns true if proof generation is supported, false otherwise
 */
export function canGenerateWithdrawalProof(): boolean {
  return isCapabilitySupported('prove');
}

/**
 * Gets the current runtime capabilities relevant to withdrawal operations.
 */
export function getWithdrawalCapabilities(): ZkCapabilities {
  return detectCapabilities();
}

/**
 * generateWithdrawalProof
 *
 * A stable API for generating a withdrawal proof across environments.
 * It abstracts the proving backend so that the SDK remains environment-agnostic.
 *
 * @param request The withdrawal parameters.
 * @param backend The proving backend to use (e.g., Node or Browser Barretenberg).
 * @returns The formatted proof as a Buffer.
 */
export async function generateWithdrawalProof(
  request: WithdrawalRequest,
  backend: ProvingBackend,
  options: WithdrawalProofGenerationOptions = {},
): Promise<Buffer> {
  // Fail fast if the runtime doesn't support proving
  assertCapability('prove');

  const { note, merkleProof, recipient, relayer, fee } = request;

  // 1. Prepare witness inputs for the circuit
  const witness = await ProofGenerator.prepareWitness(
    note,
    merkleProof,
    recipient,
    relayer,
    fee,
    { 
      merkleDepth: options.merkleDepth,
      denomination: options.denomination,
    },
  );

  const key =
    options.cacheKey ?? buildWithdrawalProofCacheKey(request, witness);
  if (options.cache) {
    const cached = await options.cache.get(key);
    if (cached) {
      return Buffer.from(cached);
    }
  }

  // 2. Generate the raw proof using the injected backend
  const proofGenerator = new ProofGenerator(backend);
  const rawProof = await proofGenerator.generate(witness, {
    merkleDepth: options.merkleDepth,
    denomination: options.denomination,
    testOnlyAllowMockHash: options.testOnlyAllowMockHash,
  });

  // 3. Format the proof for the Soroban contract
  const proof = ProofGenerator.formatProof(
    rawProof,
    buildWithdrawalPublicInputLayout(witness).values,
  );
  if (options.cache) {
    await options.cache.set(key, proof);
  }
  return proof;
}

/**
 * extractPublicInputs
 *
 * Extracts the public inputs from a prepared witness in the canonical order
 * defined by WITHDRAWAL_PUBLIC_INPUT_SCHEMA (pool_id … fee).
 */
export function extractPublicInputs(witness: PreparedWitness): string[] {
  return buildWithdrawalPublicInputLayout(witness).fields;
}

/**
 * verifyWithdrawalProof
 *
 * Verifies a withdrawal proof off-chain using circuit artifacts.
 *
 * @param proof The proof bytes to verify.
 * @param publicInputs The public inputs used for the proof.
 * @param artifacts The circuit artifacts (vkey, etc).
 * @param backend The verifying backend to use.
 */
export async function verifyWithdrawalProof(
  proof: Uint8Array,
  publicInputs: WithdrawalPublicInputs | PreparedWitness | string[],
  artifacts: any,
  backend: VerifyingBackend,
): Promise<boolean> {
  assertNamedWithdrawalPublicInputs(publicInputs);
  return backend.verifyProof(
    proof,
    buildWithdrawalPublicInputLayout(publicInputs).fields,
    artifacts,
  );
}

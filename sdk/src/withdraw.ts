import { Note } from './note';
import { MerkleProof, ProofGenerator, ProvingBackend, Groth16Proof } from './proof';
import {
  ProofCache,
  InMemoryProofCache,
  cacheKeyFromWitness,
  defaultProofCache,
} from './proofCache';

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

/**
 * generateWithdrawalProof
 * 
 * A stable API for generating a withdrawal proof across environments.
 * It abstracts the proving backend so that the SDK remains environment-agnostic.
 * 
 * @param request The withdrawal parameters.
 * @param backend The proving backend to use (e.g., Node or Browser Barretenberg).
 * @param cache Optional proof cache for avoiding redundant proving work.
 *              Pass `defaultProofCache` to use the shared global cache.
 * @returns The formatted proof as a Buffer.
 */
export async function generateWithdrawalProof(
  request: WithdrawalRequest,
  backend: ProvingBackend,
  cache?: ProofCache
): Promise<Buffer> {
  const { note, merkleProof, recipient, relayer, fee } = request;

  // 1. Prepare witness inputs for the circuit
  const witness = await ProofGenerator.prepareWitness(
    note,
    merkleProof,
    recipient,
    relayer,
    fee
  );

  // 2. Check cache for existing proof
  if (cache) {
    const cacheKey = cacheKeyFromWitness(witness);
    const cached = cache.get(cacheKey);
    if (cached) {
      // Cache hit: return the pre-formatted proof bytes
      return Buffer.from(cached.proof);
    }
  }

  // 3. Generate the raw proof using the injected backend
  const proofGenerator = new ProofGenerator(backend);
  const rawProof = await proofGenerator.generate(witness);

  // 4. Cache the result if caching is enabled
  if (cache) {
    const cacheKey = cacheKeyFromWitness(witness);
    const publicInputs = extractPublicInputs(witness);
    cache.set(cacheKey, {
      proof: rawProof,
      publicInputs,
    });
  }

  // 5. Format the proof for the Soroban contract
  return ProofGenerator.formatProof(rawProof);
}

/**
 * extractPublicInputs
 * 
 * Extracts the public inputs from a witness object in the order
 * expected by the circuit and the verifier.
 */
export function extractPublicInputs(witness: any): string[] {
  // Ordered according to circuits/withdraw/src/main.nr:
  // 1. root
  // 2. nullifier_hash
  // 3. recipient
  // 4. amount
  // 5. relayer
  // 6. fee
  return [
    witness.root,
    witness.nullifier_hash,
    witness.recipient,
    witness.amount,
    witness.relayer,
    witness.fee
  ];
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
  publicInputs: string[],
  artifacts: any,
  backend: import('./proof').VerifyingBackend
): Promise<boolean> {
  return backend.verifyProof(proof, publicInputs, artifacts);
}

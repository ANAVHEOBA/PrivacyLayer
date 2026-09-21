/**
 * Proof generation utilities for the PrivacyLayer SDK.
 *
 * The withdraw proof now includes an explicit recipient hash as a public
 * input. The rest of the proof generation pipeline remains unchanged.
 */

import { makeWithdrawPublicInputs } from './public_inputs';
import { generateProof } from './zk_proof_generator'; // hypothetical helper

export interface WithdrawProof {
  proof: Uint8Array;          // Serialized proof bytes
  publicInputs: bigint[];     // Public inputs matching the circuit order
}

/**
 * Generate a withdraw proof bound to a specific recipient.
 *
 * @param params Parameters required for proof generation.
 * @returns WithdrawProof containing the proof and public inputs.
 */
export async function generateWithdrawProof(params: {
  merkleRoot: bigint;
  nullifier: bigint;
  amount: bigint;
  fee: bigint;
  recipient: string;
  // ... any additional witness data ...
}): Promise<WithdrawProof> {
  const publicInputs = makeWithdrawPublicInputs(
    params.merkleRoot,
    params.nullifier,
    params.amount,
    params.fee,
    params.recipient,
  );

  // The witness generation (including the recipient address) is unchanged;
  // we simply pass the public inputs to the underlying prover.
  const proof = await generateProof('withdraw', {
    // witness fields...
    recipient: params.recipient,
    // other witness data...
  }, publicInputs);

  return { proof, publicInputs };
}

import { Note } from './note';
import { fieldToHex, bufferToField } from './encoding';

/**
 * DepositPayload
 *
 * Contains the note material (to be saved by the user) and the commitment
 * (to be submitted to the Soroban contract).
 */
export interface DepositPayload {
  /** The private note material. Must be backed up by the user. */
  note: Note;
  /** The note commitment (Hash(nullifier, secret, poolId)) as a hex field element. */
  commitment: string;
}

/**
 * generateDepositPayload
 *
 * Orchestrates the creation of a new shielded note for a deposit.
 * It generates the random secrets, computes the on-chain commitment,
 * and packages them for the caller.
 *
 * @param poolId The 32-byte hex identifier for the target shielded pool.
 * @param amount The bigint amount (in stroops/base units) being deposited.
 * @returns A promise resolving to the deposit payload.
 */
export async function generateDepositPayload(
  poolId: string,
  amount: bigint
): Promise<DepositPayload> {
  // 1. Generate the note material (random nullifier and secret)
  const note = Note.generate(poolId, amount);

  // 2. Compute the commitment
  // Note.getCommitment() returns a 32-byte Buffer.
  // We convert it to a canonical field hex string for the ZK circuit/contract.
  const commitmentBuffer = note.getCommitment();
  const commitment = fieldToHex(bufferToField(commitmentBuffer));

  return {
    note,
    commitment,
  };
}

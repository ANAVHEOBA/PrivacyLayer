import { Note } from './note';
import { deriveCanonicalPoolId, PoolTokenIdentity } from './encoding';

export interface DepositRequest {
  poolId: string;
  amount: bigint;
  note?: Note;
}

export interface CanonicalDepositRequest {
  token: PoolTokenIdentity;
  denomination: bigint;
  networkDomainHex: string;
  note?: Note;
}

export interface DepositPayload {
  note: Note;
  poolId: string;
  amount: bigint;
  commitment: Buffer;
}

/**
 * Creates deposit payload data from either a supplied note or a new note.
 */
export function createDeposit(request: DepositRequest): DepositPayload {
  const note = request.note ?? Note.generate(request.poolId, request.amount);

  return {
    note,
    poolId: note.poolId,
    amount: note.amount,
    commitment: note.getCommitment()
  };
}

/**
 * Creates a deposit payload using the canonical pool-id derivation contract.
 */
export function createCanonicalDeposit(request: CanonicalDepositRequest): DepositPayload {
  const poolId = deriveCanonicalPoolId(request.token, request.denomination, request.networkDomainHex);
  return createDeposit({
    poolId,
    amount: request.denomination,
    note: request.note,
  });
}

export function createBatchCommitments(notes: Note[]): Buffer[] {
  return notes.map((note) => note.getCommitment());
}

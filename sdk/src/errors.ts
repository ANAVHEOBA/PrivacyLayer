/**
 * Thrown when withdrawal witness or proof inputs fail structural validation
 * (lengths, encodings) before a proving backend is invoked. Use
 * `code` to distinguish from honest proving/verification errors.
 */
export class WitnessValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'MERKLE_PATH'
      | 'MERKLE_ROOT'
      | 'LEAF_INDEX'
      | 'FIELD_ENCODING'
      | 'ADDRESS'
      | 'WITNESS_SEMANTICS'
      | 'PUBLIC_INPUT_SCHEMA'
      | 'PROOF_FORMAT'
      | 'DENOMINATION',
    public readonly reason?: 'structure' | 'domain'
  ) {
    super(message);
    this.name = 'WitnessValidationError';
    this.reason = reason ?? 'structure';
  }
}

/**
 * ZK-116: Differentiated withdraw failure taxonomy.
 *
 * SDK prechecks and contract error codes map onto these classes so
 * integrations can respond safely without leaking internal ZK state.
 *
 * | Class           | Meaning                                              |
 * |-----------------|------------------------------------------------------|
 * | STALE_ROOT      | Merkle root not in pool's rolling root history       |
 * | SPENT_NULLIFIER | Nullifier already used — double-spend attempt        |
 * | MALFORMED_INPUT | Proof bytes or public inputs are structurally wrong  |
 * | INVALID_PROOF   | Groth16 verification failed for well-formed inputs   |
 * | PRECHECK_FAILED | SDK-side validation failed before proof submission   |
 */
export type WithdrawFailureClass =
  | 'STALE_ROOT'
  | 'SPENT_NULLIFIER'
  | 'MALFORMED_INPUT'
  | 'INVALID_PROOF'
  | 'PRECHECK_FAILED';

/**
 * Contract error codes (from Error enum in errors.rs) mapped to their
 * WithdrawFailureClass (ZK-116).
 */
export const CONTRACT_ERROR_CLASS: Record<number, WithdrawFailureClass> = {
  40: 'STALE_ROOT',       // Error::UnknownRoot
  41: 'SPENT_NULLIFIER',  // Error::NullifierAlreadySpent
  42: 'INVALID_PROOF',    // Error::InvalidProof
  60: 'MALFORMED_INPUT',  // Error::MalformedProofA
  61: 'MALFORMED_INPUT',  // Error::MalformedProofB
  62: 'MALFORMED_INPUT',  // Error::MalformedProofC
  70: 'MALFORMED_INPUT',  // Error::PublicInputsTooShort
  71: 'MALFORMED_INPUT',  // Error::PublicInputsTooLong
};

/**
 * Map a raw contract error code to a WithdrawFailureClass.
 * Returns undefined for codes outside the withdraw-failure range.
 */
export function classifyWithdrawError(contractErrorCode: number): WithdrawFailureClass | undefined {
  return CONTRACT_ERROR_CLASS[contractErrorCode];
}

/**
 * Thrown by SDK withdraw helpers to surface a typed withdraw failure
 * instead of a generic Error.  Mirrors the contract error taxonomy (ZK-116).
 */
export class WithdrawFailureError extends Error {
  constructor(
    message: string,
    public readonly failureClass: WithdrawFailureClass,
    public readonly contractErrorCode?: number,
  ) {
    super(message);
    this.name = 'WithdrawFailureError';
  }
}

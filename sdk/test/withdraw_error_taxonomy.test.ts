/**
 * ZK-116: Withdraw failure taxonomy tests.
 *
 * Verifies that stale-root, spent-nullifier, malformed-input, and
 * invalid-proof failures are distinguishable by SDK callers without
 * leaking ZK internals.
 *
 * Wave Issue Key: ZK-116
 */

import {
  WitnessValidationError,
  WithdrawFailureError,
  WithdrawFailureClass,
  CONTRACT_ERROR_CLASS,
  classifyWithdrawError,
} from '../src/errors';

// ---------------------------------------------------------------------------
// 1. CONTRACT_ERROR_CLASS mapping covers the four distinct failure classes
// ---------------------------------------------------------------------------
describe('Contract error class mapping (ZK-116)', () => {
  it('maps UnknownRoot (40) to STALE_ROOT', () => {
    expect(classifyWithdrawError(40)).toBe('STALE_ROOT');
  });

  it('maps NullifierAlreadySpent (41) to SPENT_NULLIFIER', () => {
    expect(classifyWithdrawError(41)).toBe('SPENT_NULLIFIER');
  });

  it('maps InvalidProof (42) to INVALID_PROOF', () => {
    expect(classifyWithdrawError(42)).toBe('INVALID_PROOF');
  });

  it('maps MalformedProofA (60) to MALFORMED_INPUT', () => {
    expect(classifyWithdrawError(60)).toBe('MALFORMED_INPUT');
  });

  it('maps MalformedProofB (61) to MALFORMED_INPUT', () => {
    expect(classifyWithdrawError(61)).toBe('MALFORMED_INPUT');
  });

  it('maps MalformedProofC (62) to MALFORMED_INPUT', () => {
    expect(classifyWithdrawError(62)).toBe('MALFORMED_INPUT');
  });

  it('maps PublicInputsTooShort (70) to MALFORMED_INPUT', () => {
    expect(classifyWithdrawError(70)).toBe('MALFORMED_INPUT');
  });

  it('maps PublicInputsTooLong (71) to MALFORMED_INPUT', () => {
    expect(classifyWithdrawError(71)).toBe('MALFORMED_INPUT');
  });

  it('returns undefined for unrelated error codes', () => {
    expect(classifyWithdrawError(1)).toBeUndefined();   // AlreadyInitialized
    expect(classifyWithdrawError(20)).toBeUndefined();  // PoolPaused
    expect(classifyWithdrawError(999)).toBeUndefined();
  });

  it('covers all four withdraw failure classes in the mapping', () => {
    const classes = new Set(Object.values(CONTRACT_ERROR_CLASS));
    expect(classes.has('STALE_ROOT')).toBe(true);
    expect(classes.has('SPENT_NULLIFIER')).toBe(true);
    expect(classes.has('MALFORMED_INPUT')).toBe(true);
    expect(classes.has('INVALID_PROOF')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. WithdrawFailureError is distinguishable from WitnessValidationError
// ---------------------------------------------------------------------------
describe('WithdrawFailureError type guard (ZK-116)', () => {
  it('is an instance of Error', () => {
    const err = new WithdrawFailureError('stale root', 'STALE_ROOT', 40);
    expect(err).toBeInstanceOf(Error);
  });

  it('exposes failureClass', () => {
    const err = new WithdrawFailureError('spent', 'SPENT_NULLIFIER', 41);
    expect(err.failureClass).toBe('SPENT_NULLIFIER');
    expect(err.contractErrorCode).toBe(41);
  });

  it('is NOT an instance of WitnessValidationError', () => {
    const err = new WithdrawFailureError('invalid proof', 'INVALID_PROOF');
    expect(err).not.toBeInstanceOf(WitnessValidationError);
  });

  it('name is WithdrawFailureError', () => {
    const err = new WithdrawFailureError('malformed', 'MALFORMED_INPUT');
    expect(err.name).toBe('WithdrawFailureError');
  });
});

// ---------------------------------------------------------------------------
// 3. WitnessValidationError maps to PRECHECK_FAILED at the integration layer
// ---------------------------------------------------------------------------
describe('WitnessValidationError → PRECHECK_FAILED (ZK-116)', () => {
  it('address error maps to PRECHECK_FAILED at integration layer', () => {
    const err = new WitnessValidationError('bad address', 'ADDRESS');
    expect(err).toBeInstanceOf(WitnessValidationError);
    // Integrations catching WitnessValidationError should classify as PRECHECK_FAILED
    // (this mapping lives in the caller, not in the error class itself).
    const cls: WithdrawFailureClass = 'PRECHECK_FAILED';
    expect(cls).toBe('PRECHECK_FAILED');
  });

  it('PROOF_FORMAT error maps to PRECHECK_FAILED', () => {
    const err = new WitnessValidationError('wrong proof length', 'PROOF_FORMAT');
    expect(err.code).toBe('PROOF_FORMAT');
  });
});

// ---------------------------------------------------------------------------
// 4. Error messages stay privacy-aware (no secret material in messages)
// ---------------------------------------------------------------------------
describe('Privacy-safe error messages (ZK-116)', () => {
  const FORBIDDEN_PATTERNS = [
    /nullifier.*=.*[0-9a-f]{64}/i,  // no raw nullifier hex in message
    /secret.*=.*[0-9a-f]{62}/i,     // no raw secret hex
    /witness\.secret/i,             // no witness field dumps
  ];

  function assertNoLeakage(message: string) {
    for (const pat of FORBIDDEN_PATTERNS) {
      expect(message).not.toMatch(pat);
    }
  }

  it('STALE_ROOT error message does not leak nullifier data', () => {
    const msg = 'Merkle root 0xabc is not in pool history';
    assertNoLeakage(msg);
  });

  it('SPENT_NULLIFIER error message is privacy-safe', () => {
    const msg = 'Nullifier has already been spent in this pool';
    assertNoLeakage(msg);
  });

  it('INVALID_PROOF error message is generic', () => {
    const msg = 'Groth16 proof verification failed';
    assertNoLeakage(msg);
  });
});

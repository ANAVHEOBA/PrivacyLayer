import {
  ProofError,
  ProofErrorCode,
  isProofError,
  isProofErrorCode,
  errNoProvingBackend,
  errNoVerifyingBackend,
  errWitnessValidation,
  errMerkleProof,
  errBackendFailure,
  errProofFormat,
  errVerificationFailed,
  wrapProofError,
} from '../src/proofErrors';

describe('proofErrors module', () => {
  // -------------------------------------------------------------------------
  // Error codes
  // -------------------------------------------------------------------------

  describe('ProofErrorCode', () => {
    it('defines all expected error codes', () => {
      expect(ProofErrorCode.NO_PROVING_BACKEND).toBe('NO_PROVING_BACKEND');
      expect(ProofErrorCode.PROVING_BACKEND_FAILURE).toBe('PROVING_BACKEND_FAILURE');
      expect(ProofErrorCode.NO_VERIFYING_BACKEND).toBe('NO_VERIFYING_BACKEND');
      expect(ProofErrorCode.WITNESS_VALIDATION_FAILED).toBe('WITNESS_VALIDATION_FAILED');
      expect(ProofErrorCode.MERKLE_PROOF_INVALID).toBe('MERKLE_PROOF_INVALID');
      expect(ProofErrorCode.PROOF_FORMAT_INVALID).toBe('PROOF_FORMAT_INVALID');
      expect(ProofErrorCode.VERIFICATION_FAILED).toBe('VERIFICATION_FAILED');
      expect(ProofErrorCode.CONSTRAINT_VIOLATION).toBe('CONSTRAINT_VIOLATION');
      expect(ProofErrorCode.PROOF_GENERATION_TIMEOUT).toBe('PROOF_GENERATION_TIMEOUT');
    });
  });

  // -------------------------------------------------------------------------
  // ProofError base class
  // -------------------------------------------------------------------------

  describe('ProofError', () => {
    it('constructs with correct code and message', () => {
      const err = new ProofError(ProofErrorCode.PROOF_FORMAT_INVALID, 'Bad proof');
      expect(err.code).toBe(ProofErrorCode.PROOF_FORMAT_INVALID);
      expect(err.message).toBe('Bad proof');
      expect(err.name).toBe('ProofError');
    });

    it('captures cause when provided', () => {
      const cause = new Error('Root cause');
      const err = new ProofError(ProofErrorCode.PROVING_BACKEND_FAILURE, 'Backend died', { cause });
      expect(err.cause).toBe(cause);
    });

    it('captures context when provided', () => {
      const context = { backend: 'barretenberg', attempt: 2 };
      const err = new ProofError(ProofErrorCode.PROVING_BACKEND_FAILURE, 'Failed', { context });
      expect(err.context).toEqual(context);
    });

    it('serializes to JSON correctly', () => {
      const cause = new Error('Underlying');
      const err = new ProofError(ProofErrorCode.WITNESS_VALIDATION_FAILED, 'Bad witness', { cause });
      const json = err.toJSON();

      expect(json).toEqual({
        name: 'ProofError',
        code: ProofErrorCode.WITNESS_VALIDATION_FAILED,
        message: 'Bad witness',
        context: undefined,
        cause: 'Underlying',
      });
    });

    it('maintains correct prototype chain for instanceof', () => {
      const err = errNoProvingBackend();
      expect(err instanceof ProofError).toBe(true);
      expect(err instanceof Error).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Type guards
  // -------------------------------------------------------------------------

  describe('type guards', () => {
    it('recognizes ProofError instances', () => {
      const err = errNoProvingBackend();
      expect(isProofError(err)).toBe(true);
    });

    it('rejects non-ProofError objects', () => {
      expect(isProofError(new Error('plain'))).toBe(false);
      expect(isProofError(null)).toBe(false);
      expect(isProofError(undefined)).toBe(false);
      expect(isProofError({})).toBe(false);
      expect(isProofError({ code: 'FOO' })).toBe(false); // name missing
    });

    it('matches specific error codes', () => {
      const err = errMerkleProof('bad path');
      expect(isProofErrorCode(err, ProofErrorCode.MERKLE_PROOF_INVALID)).toBe(true);
      expect(isProofErrorCode(err, ProofErrorCode.WITNESS_VALIDATION_FAILED)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Factory functions
  // -------------------------------------------------------------------------

  describe('factory functions', () => {
    it('errNoProvingBackend creates correct error', () => {
      const err = errNoProvingBackend();
      expect(err.code).toBe(ProofErrorCode.NO_PROVING_BACKEND);
      expect(err.message).toContain('Proving backend not configured');
    });

    it('errNoVerifyingBackend creates correct error', () => {
      const err = errNoVerifyingBackend();
      expect(err.code).toBe(ProofErrorCode.NO_VERIFYING_BACKEND);
      expect(err.message).toContain('Verifying backend not configured');
    });

    it('errWitnessValidation creates correct error', () => {
      const cause = new Error('leaf index out of range');
      const err = errWitnessValidation('Validation failed', cause);
      expect(err.code).toBe(ProofErrorCode.WITNESS_VALIDATION_FAILED);
      expect(err.cause).toBe(cause);
    });

    it('errMerkleProof creates correct error', () => {
      const err = errMerkleProof('Path length mismatch');
      expect(err.code).toBe(ProofErrorCode.MERKLE_PROOF_INVALID);
    });

    it('errBackendFailure creates correct error', () => {
      const err = errBackendFailure('WASM crashed');
      expect(err.code).toBe(ProofErrorCode.PROVING_BACKEND_FAILURE);
    });

    it('errProofFormat creates correct error', () => {
      const err = errProofFormat('Wrong length');
      expect(err.code).toBe(ProofErrorCode.PROOF_FORMAT_INVALID);
    });

    it('errVerificationFailed creates correct error', () => {
      const err = errVerificationFailed('Verification rejected');
      expect(err.code).toBe(ProofErrorCode.VERIFICATION_FAILED);
    });
  });

  // -------------------------------------------------------------------------
  // wrapProofError
  // -------------------------------------------------------------------------

  describe('wrapProofError', () => {
    it('passes through existing ProofError unchanged', () => {
      const original = errBackendFailure('Original error');
      const wrapped = wrapProofError(original);
      expect(wrapped).toBe(original);
    });

    it('wraps plain Error into ProofError with default code', () => {
      const plain = new Error('Something bad');
      const wrapped = wrapProofError(plain);
      expect(wrapped.code).toBe(ProofErrorCode.PROOF_GENERATION_FAILED);
      expect(wrapped.message).toBe('Something bad');
      expect(wrapped.cause).toBe(plain);
    });

    it('wraps non-Error values into ProofError', () => {
      const wrapped = wrapProofError('Just a string');
      expect(wrapped.code).toBe(ProofErrorCode.PROOF_GENERATION_FAILED);
      expect(wrapped.message).toBe('Just a string');
    });

    it('uses custom default code when provided', () => {
      const plain = new Error('Verification blew up');
      const wrapped = wrapProofError(plain, ProofErrorCode.VERIFICATION_FAILED);
      expect(wrapped.code).toBe(ProofErrorCode.VERIFICATION_FAILED);
    });
  });
});

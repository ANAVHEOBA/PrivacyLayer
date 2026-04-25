import { WitnessValidationError } from './errors';

/**
 * Stable error types for proof generation and verification.
 *
 * All proof-generation failures into stable, programmatic error codes.
 *
 * Error codes are semantically meaningful and guaranteed to remain stable
 * across versions, allowing callers to reliably handle specific failure modes.
 *
 * Philosophy:
 * - Each error code represents a distinct failure mode that requires specific handling.
 * - Callers can rely on the `code` field for branching, not `message`.
 * - New error codes may be added, but existing codes will not be removed.
 */

// ---------------------------------------------------------------------------
// Core error codes
// ---------------------------------------------------------------------------

/**
 * Stable error codes for proof generation and verification.
 * These codes will remain stable across SDK versions.
 */
export enum ProofErrorCode {
  // ─────────────────────────────────────────────────────────────────────
  // Configuration & setup errors
  // ─────────────────────────────────────────────────────────────────────

  /**
   * No proving backend was configured when attempting to generate a proof. */
  NO_PROVING_BACKEND = 'NO_PROVING_BACKEND',

  /**
   * Proving backend was configured but failed to initialize or produce proofs.
   * This indicates the backend implementation itself has a problem.
   */
  PROVING_BACKEND_FAILURE = 'PROVING_BACKEND_FAILURE',

  /**
   * No verifying backend was configured when attempting to verify a proof.
   */
  NO_VERIFYING_BACKEND = 'NO_VERIFYING_BACKEND',

  /**
   * Requested backend is not available in this environment (e.g., WASM in Node.js).
   */
  BACKEND_NOT_AVAILABLE = 'BACKEND_NOT_AVAILABLE',

  /**
   * Proving key or circuit artifacts are missing or corrupt.
   */
  CIRCUIT_ARTIFACTS_MISSING = 'CIRCUIT_ARTIFACTS_MISSING',

  /**
   * Proving key or circuit artifacts version mismatch.
   */
  CIRCUIT_ARTIFACTS_VERSION_MISMATCH = 'CIRCUIT_ARTIFACTS_VERSION_MISMATCH',

  // ─────────────────────────────────────────────────────────────────────
  // Witness & input validation errors
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Witness failed structural validation (lengths, encodings, ranges).
   * Details are available in the `cause` field when possible.
   */
  WITNESS_VALIDATION_FAILED = 'WITNESS_VALIDATION_FAILED',

  /**
   * Merkle proof is invalid or inconsistent.
   */
  MERKLE_PROOF_INVALID = 'MERKLE_PROOF_INVALID',

  /**
   * Note is invalid (corrupt, wrong version, already spent, etc).
   */
  NOTE_INVALID = 'NOTE_INVALID',

  /**
   * Stellar address encoding failed or produced an out-of-range field element.
   */
  ADDRESS_ENCODING_FAILED = 'ADDRESS_ENCODING_FAILED',

  // ─────────────────────────────────────────────────────────────────────
  // Proving errors
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Witness is valid but the circuit rejected it (constraint violation).
   * This usually indicates a bug in witness preparation or a circuit bug.
   */
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  /**
   * Proving process timed out or was aborted.
   */
  PROOF_GENERATION_TIMEOUT = 'PROOF_GENERATION_TIMEOUT',

  /**
   * Out of memory during proof generation.
   */
  PROOF_GENERATION_OOM = 'PROOF_GENERATION_OOM',

  /**
   * Prover internal error (catch-all for unknown proving failures without a stable code).
   */
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',

  // ─────────────────────────────────────────────────────────────────────
  // Verification errors
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Proof format is invalid or corrupted.
   */
  PROOF_FORMAT_INVALID = 'PROOF_FORMAT_INVALID',

  /**
   * Public inputs are malformed or out of range.
   */
  PUBLIC_INPUTS_INVALID = 'PUBLIC_INPUTS_INVALID',

  /**
   * Proof was generated for a different circuit than we're verifying against.
   */
  CIRCUIT_MISMATCH = 'CIRCUIT_MISMATCH',

  /**
   * Verification key is invalid or corrupted.
   */
  VERIFICATION_KEY_INVALID = 'VERIFICATION_KEY_INVALID',

  /**
   * Verification failed for an unspecified reason.
   * NOTE: This is the catch-all and does NOT mean the proof is invalid!
   * Always check this error's `cause` field.
   */
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',

  // ─────────────────────────────────────────────────────────────────────
  // Runtime / Environment errors
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Not enough entropy available for secure randomness.
   */
  INSUFFICIENT_ENTROPY = 'INSUFFICIENT_ENTROPY',

  /**
   * WebAssembly / WASM runtime failure.
   */
  WASM_RUNTIME_ERROR = 'WASM_RUNTIME_ERROR',
}

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

/**
 * Base class for all proof-related errors.
 * Callers should switch on `code`, not message content.
 */
export class ProofError extends Error {
  /**
   * Stable error code identifying the failure mode.
   * Use this field for programmatic error handling.
   */
  public readonly code: ProofErrorCode;

  /**
   * Original underlying error, if available.
   */
  public readonly cause?: Error;

  /**
   * Optional additional context about the failure.
   */
  public readonly context?: Record<string, unknown>;

  constructor(
    code: ProofErrorCode,
    message: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  ) {
    super(message);
    this.name = 'ProofError';
    this.code = code;
    this.cause = options?.cause;
    this.context = options?.context;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ProofError.prototype);

    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProofError);
    }
  }

  /**
   * Convert to a serializable object for logging or transport.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/**
 * Type guard: is ProofError or WitnessValidationError.
 * Both represent stable, classifiable SDK errors.
 */
export function isProofError(err: unknown): err is ProofError {
  if (err == null || typeof err !== 'object') return false;

  const asObj = err as { code?: unknown; name?: string };

  // Direct ProofError match
  if (asObj.name === 'ProofError' && typeof asObj.code === 'string') {
    return true;
  }

  // WitnessValidationError also counts as a classifiable proof error
  if (asObj.name === 'WitnessValidationError' && typeof asObj.code === 'string') {
    return true;
  }

  return false;
}

/**
 * Type guard: Error has specific ProofErrorCode.
 * Works with both ProofError and WitnessValidationError (legacy).
 */
export function isProofErrorCode<T extends ProofErrorCode>(
  err: unknown,
  code: T
): err is { code: T } {
  if (!isProofError(err)) return false;

  // Direct match
  if (err.code === code) return true;

  // Legacy WitnessValidationError mapping
  const legacyMapping: Record<string, ProofErrorCode> = {
    MERKLE_PATH: ProofErrorCode.MERKLE_PROOF_INVALID,
    PROOF_FORMAT: ProofErrorCode.PROOF_FORMAT_INVALID,
    LEAF_INDEX: ProofErrorCode.WITNESS_VALIDATION_FAILED,
    FIELD_ENCODING: ProofErrorCode.WITNESS_VALIDATION_FAILED,
    ADDRESS: ProofErrorCode.WITNESS_VALIDATION_FAILED,
    WITNESS_SEMANTICS: ProofErrorCode.WITNESS_VALIDATION_FAILED,
  };

  const asAny = err as { code: string };
  return legacyMapping[asAny.code] === code;
}

// ---------------------------------------------------------------------------
// Convenience factories for common cases
// ---------------------------------------------------------------------------

/**
 * No proving backend configured.
 */
export function errNoProvingBackend(options?: { cause?: Error }): ProofError {
  return new ProofError(
    ProofErrorCode.NO_PROVING_BACKEND,
    'Proving backend not configured. Call setBackend() with a ProvingBackend before generating proofs.',
    options
  );
}

/**
 * No verifying backend configured.
 */
export function errNoVerifyingBackend(options?: { cause?: Error }): ProofError {
  return new ProofError(
    ProofErrorCode.NO_VERIFYING_BACKEND,
    'Verifying backend not configured. Provide a VerifyingBackend to verify proofs.',
    options
  );
}

/**
 * Witness validation failed.
 */
export function errWitnessValidation(message: string, cause?: Error): ProofError {
  return new ProofError(ProofErrorCode.WITNESS_VALIDATION_FAILED, message, { cause });
}

/**
 * Merkle proof invalid.
 */
export function errMerkleProof(message: string, cause?: Error): ProofError {
  return new ProofError(ProofErrorCode.MERKLE_PROOF_INVALID, message, { cause });
}

/**
 * Proof generation failed in the backend.
 */
export function errBackendFailure(message: string, cause?: Error): ProofError {
  return new ProofError(ProofErrorCode.PROVING_BACKEND_FAILURE, message, { cause });
}

/**
 * Invalid proof format.
 */
export function errProofFormat(message: string, cause?: Error): ProofError {
  return new ProofError(ProofErrorCode.PROOF_FORMAT_INVALID, message, { cause });
}

/**
 * Verification failed.
 */
export function errVerificationFailed(message: string, cause?: Error): ProofError {
  return new ProofError(ProofErrorCode.VERIFICATION_FAILED, message, { cause });
}

/**
 * Map legacy WitnessValidationError code to ProofErrorCode.
 */
export function mapWitnessCode(code: string): ProofErrorCode {
  const mapping: Record<string, ProofErrorCode> = {
    MERKLE_PATH: ProofErrorCode.MERKLE_PROOF_INVALID,
    PROOF_FORMAT: ProofErrorCode.PROOF_FORMAT_INVALID,
    LEAF_INDEX: ProofErrorCode.WITNESS_VALIDATION_FAILED,
    FIELD_ENCODING: ProofErrorCode.WITNESS_VALIDATION_FAILED,
    ADDRESS: ProofErrorCode.ADDRESS_ENCODING_FAILED,
    WITNESS_SEMANTICS: ProofErrorCode.WITNESS_VALIDATION_FAILED,
  };
  return mapping[code] ?? ProofErrorCode.WITNESS_VALIDATION_FAILED;
}

/**
 * Convert a WitnessValidationError to an equivalent ProofError.
 */
export function fromWitnessValidationError(wve: WitnessValidationError): ProofError {
  return new ProofError(mapWitnessCode(wve.code), wve.message, { cause: wve });
}

/**
 * Wrap an unknown error into a ProofError, preserving as much context as possible.
 */
export function wrapProofError(err: unknown, defaultCode: ProofErrorCode = ProofErrorCode.PROOF_GENERATION_FAILED): ProofError {
  if (isProofError(err)) {
    return err as ProofError;
  }

  // Convert legacy WitnessValidationError
  if (err instanceof WitnessValidationError) {
    return fromWitnessValidationError(err);
  }

  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? err : undefined;

  return new ProofError(defaultCode, message, { cause });
}

export default {
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
};

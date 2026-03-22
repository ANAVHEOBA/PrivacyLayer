// ============================================================
// PrivacyLayer SDK — Comprehensive Error Handling
// ============================================================
// Custom error hierarchy for the PrivacyLayer TypeScript SDK.
//
// Design principles:
//   - Every error has a unique, stable error code for i18n
//   - Errors carry structured details for debugging
//   - Sensitive information (secrets, nullifiers) is NEVER exposed
//   - Errors map 1:1 to Soroban contract error codes where applicable
//   - Recovery hints guide users toward resolution
// ============================================================

// ──────────────────────────────────────────────────────────────
// Error Codes — stable identifiers for i18n and logging
// ──────────────────────────────────────────────────────────────

/**
 * Stable error codes for internationalization and programmatic handling.
 * Codes are grouped by category prefix:
 *   - PL_NET_*   : Network / RPC errors
 *   - PL_VAL_*   : Validation errors
 *   - PL_PROOF_* : Proof generation / verification errors
 *   - PL_CTR_*   : Contract interaction errors
 *   - PL_WAL_*   : Wallet errors
 *   - PL_SDK_*   : Internal SDK errors
 */
export enum ErrorCode {
  // ── Network Errors ──────────────────────────────────────
  /** RPC request timed out */
  NETWORK_TIMEOUT = 'PL_NET_001',
  /** Network is unreachable */
  NETWORK_UNREACHABLE = 'PL_NET_002',
  /** Transaction submission failed */
  TRANSACTION_FAILED = 'PL_NET_003',
  /** Transaction expired before inclusion */
  TRANSACTION_EXPIRED = 'PL_NET_004',
  /** RPC returned unexpected response */
  RPC_ERROR = 'PL_NET_005',
  /** Rate limited by RPC provider */
  RATE_LIMITED = 'PL_NET_006',
  /** Maximum retry attempts exceeded */
  MAX_RETRIES_EXCEEDED = 'PL_NET_007',

  // ── Validation Errors ───────────────────────────────────
  /** Note format is invalid or corrupted */
  INVALID_NOTE_FORMAT = 'PL_VAL_001',
  /** Stellar address is invalid */
  INVALID_ADDRESS = 'PL_VAL_002',
  /** Amount is invalid (zero, negative, or wrong denomination) */
  INVALID_AMOUNT = 'PL_VAL_003',
  /** Commitment is the zero value */
  ZERO_COMMITMENT = 'PL_VAL_004',
  /** Nullifier format is invalid */
  INVALID_NULLIFIER = 'PL_VAL_005',
  /** Secret format is invalid */
  INVALID_SECRET = 'PL_VAL_006',
  /** Merkle proof path is invalid */
  INVALID_MERKLE_PROOF = 'PL_VAL_007',
  /** Fee exceeds denomination amount */
  FEE_EXCEEDS_AMOUNT = 'PL_VAL_008',
  /** Relayer address provided but fee is zero */
  INVALID_RELAYER_FEE = 'PL_VAL_009',
  /** Input field exceeds BN254 field modulus */
  FIELD_OVERFLOW = 'PL_VAL_010',

  // ── Proof Errors ────────────────────────────────────────
  /** Noir circuit compilation failed */
  CIRCUIT_COMPILATION_FAILED = 'PL_PROOF_001',
  /** ZK proof generation failed */
  PROOF_GENERATION_FAILED = 'PL_PROOF_002',
  /** ZK proof verification failed */
  PROOF_VERIFICATION_FAILED = 'PL_PROOF_003',
  /** WASM prover module failed to load */
  WASM_LOAD_FAILED = 'PL_PROOF_004',
  /** WASM prover ran out of memory */
  WASM_OUT_OF_MEMORY = 'PL_PROOF_005',
  /** Witness generation failed */
  WITNESS_GENERATION_FAILED = 'PL_PROOF_006',

  // ── Contract Errors ─────────────────────────────────────
  /** Contract is paused — deposits and withdrawals blocked */
  CONTRACT_PAUSED = 'PL_CTR_001',
  /** Insufficient balance for deposit */
  INSUFFICIENT_BALANCE = 'PL_CTR_002',
  /** Nullifier has already been spent (double-spend) */
  NULLIFIER_ALREADY_SPENT = 'PL_CTR_003',
  /** Merkle root is not in the contract's root history */
  UNKNOWN_ROOT = 'PL_CTR_004',
  /** Contract has not been initialized */
  CONTRACT_NOT_INITIALIZED = 'PL_CTR_005',
  /** Contract has already been initialized */
  CONTRACT_ALREADY_INITIALIZED = 'PL_CTR_006',
  /** Caller is not the admin */
  UNAUTHORIZED_ADMIN = 'PL_CTR_007',
  /** Merkle tree is full (max 2^20 deposits) */
  TREE_FULL = 'PL_CTR_008',
  /** Verifying key has not been set */
  NO_VERIFYING_KEY = 'PL_CTR_009',
  /** Verifying key is malformed */
  MALFORMED_VERIFYING_KEY = 'PL_CTR_010',
  /** Failed to parse contract error response */
  CONTRACT_PARSE_ERROR = 'PL_CTR_011',
  /** Unknown contract error code */
  UNKNOWN_CONTRACT_ERROR = 'PL_CTR_012',

  // ── Wallet Errors ───────────────────────────────────────
  /** Wallet is not connected */
  WALLET_NOT_CONNECTED = 'PL_WAL_001',
  /** User rejected the transaction */
  USER_REJECTED = 'PL_WAL_002',
  /** Insufficient funds in wallet */
  INSUFFICIENT_FUNDS = 'PL_WAL_003',
  /** Wallet is on wrong network */
  NETWORK_MISMATCH = 'PL_WAL_004',
  /** Wallet does not support required features */
  WALLET_UNSUPPORTED = 'PL_WAL_005',

  // ── SDK Internal Errors ─────────────────────────────────
  /** Unexpected internal error */
  INTERNAL_ERROR = 'PL_SDK_001',
  /** Configuration is missing or invalid */
  INVALID_CONFIG = 'PL_SDK_002',
}

// ──────────────────────────────────────────────────────────────
// Error Messages — user-friendly, never exposing secrets
// ──────────────────────────────────────────────────────────────

/**
 * Default English error messages keyed by ErrorCode.
 * These messages are safe for display to end users —
 * they never contain sensitive data like private keys,
 * nullifiers, or secret values.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Network
  [ErrorCode.NETWORK_TIMEOUT]:
    'The RPC request timed out. Check your network connection or try a different RPC endpoint.',
  [ErrorCode.NETWORK_UNREACHABLE]:
    'Unable to reach the Stellar network. Verify your internet connection and RPC URL.',
  [ErrorCode.TRANSACTION_FAILED]:
    'Transaction submission failed. The transaction may have been rejected by the network.',
  [ErrorCode.TRANSACTION_EXPIRED]:
    'Transaction expired before it could be included in a ledger. Try submitting again.',
  [ErrorCode.RPC_ERROR]:
    'The RPC server returned an unexpected error. Try again or use a different endpoint.',
  [ErrorCode.RATE_LIMITED]:
    'Too many requests to the RPC server. Please wait before retrying.',
  [ErrorCode.MAX_RETRIES_EXCEEDED]:
    'Maximum retry attempts exceeded. The operation could not be completed.',

  // Validation
  [ErrorCode.INVALID_NOTE_FORMAT]:
    'The note is malformed or corrupted. Ensure it was exported correctly.',
  [ErrorCode.INVALID_ADDRESS]:
    'The provided Stellar address is invalid. Addresses must be valid Ed25519 public keys.',
  [ErrorCode.INVALID_AMOUNT]:
    'The amount is invalid. Use one of the supported denominations: 10/100/1000 XLM or 100/1000 USDC.',
  [ErrorCode.ZERO_COMMITMENT]:
    'Commitment cannot be zero. This indicates a malformed note.',
  [ErrorCode.INVALID_NULLIFIER]:
    'The nullifier value is invalid. The note may be corrupted.',
  [ErrorCode.INVALID_SECRET]:
    'The secret value is invalid. The note may be corrupted.',
  [ErrorCode.INVALID_MERKLE_PROOF]:
    'The Merkle proof path is invalid. Try re-syncing the Merkle tree.',
  [ErrorCode.FEE_EXCEEDS_AMOUNT]:
    'The relayer fee exceeds the withdrawal denomination. Reduce the fee amount.',
  [ErrorCode.INVALID_RELAYER_FEE]:
    'A relayer address was provided but the fee is zero. Set a non-zero fee or remove the relayer.',
  [ErrorCode.FIELD_OVERFLOW]:
    'A field value exceeds the BN254 scalar field modulus. Check all input values.',

  // Proof
  [ErrorCode.CIRCUIT_COMPILATION_FAILED]:
    'ZK circuit compilation failed. Ensure the WASM prover is correctly installed.',
  [ErrorCode.PROOF_GENERATION_FAILED]:
    'ZK proof generation failed. The inputs may be invalid or the circuit constraints unsatisfied.',
  [ErrorCode.PROOF_VERIFICATION_FAILED]:
    'ZK proof verification failed. The proof is invalid or the public inputs do not match.',
  [ErrorCode.WASM_LOAD_FAILED]:
    'Failed to load the WASM prover module. Ensure the WASM file is accessible.',
  [ErrorCode.WASM_OUT_OF_MEMORY]:
    'The WASM prover ran out of memory. Try reducing concurrent operations.',
  [ErrorCode.WITNESS_GENERATION_FAILED]:
    'Witness generation failed. The circuit inputs may be inconsistent.',

  // Contract
  [ErrorCode.CONTRACT_PAUSED]:
    'The privacy pool is currently paused by the admin. Deposits and withdrawals are temporarily blocked.',
  [ErrorCode.INSUFFICIENT_BALANCE]:
    'Insufficient token balance for this deposit. Ensure you have enough XLM or USDC.',
  [ErrorCode.NULLIFIER_ALREADY_SPENT]:
    'This note has already been withdrawn (nullifier spent). Each note can only be used once.',
  [ErrorCode.UNKNOWN_ROOT]:
    'The Merkle root is not recognized by the contract. The tree may have advanced too far — re-sync and retry.',
  [ErrorCode.CONTRACT_NOT_INITIALIZED]:
    'The privacy pool contract has not been initialized yet.',
  [ErrorCode.CONTRACT_ALREADY_INITIALIZED]:
    'The privacy pool contract has already been initialized.',
  [ErrorCode.UNAUTHORIZED_ADMIN]:
    'This operation requires admin privileges.',
  [ErrorCode.TREE_FULL]:
    'The Merkle tree is full (maximum 1,048,576 deposits reached).',
  [ErrorCode.NO_VERIFYING_KEY]:
    'No verifying key has been set on the contract. The admin must set one before withdrawals.',
  [ErrorCode.MALFORMED_VERIFYING_KEY]:
    'The verifying key stored on-chain is malformed.',
  [ErrorCode.CONTRACT_PARSE_ERROR]:
    'Failed to parse the contract error response.',
  [ErrorCode.UNKNOWN_CONTRACT_ERROR]:
    'The contract returned an unrecognized error code.',

  // Wallet
  [ErrorCode.WALLET_NOT_CONNECTED]:
    'No wallet is connected. Please connect your Freighter or other Stellar wallet.',
  [ErrorCode.USER_REJECTED]:
    'The transaction was rejected by the user in their wallet.',
  [ErrorCode.INSUFFICIENT_FUNDS]:
    'Your wallet does not have sufficient funds for this transaction.',
  [ErrorCode.NETWORK_MISMATCH]:
    'Your wallet is connected to a different network. Switch to the correct Stellar network.',
  [ErrorCode.WALLET_UNSUPPORTED]:
    'Your wallet does not support the required signing features.',

  // SDK
  [ErrorCode.INTERNAL_ERROR]:
    'An unexpected internal error occurred in the SDK.',
  [ErrorCode.INVALID_CONFIG]:
    'SDK configuration is missing or invalid. Check your initialization parameters.',
};

// ──────────────────────────────────────────────────────────────
// Base Error Class
// ──────────────────────────────────────────────────────────────

/**
 * Base error class for all PrivacyLayer SDK errors.
 *
 * Every error carries:
 *   - `code`      : Stable error code for i18n and programmatic handling
 *   - `message`   : Human-readable description (English, never contains secrets)
 *   - `details`   : Optional structured context for debugging
 *   - `timestamp` : When the error occurred (ISO 8601)
 *   - `cause`     : Original error that triggered this one (if any)
 *
 * @example
 * ```typescript
 * try {
 *   await sdk.deposit(commitment);
 * } catch (err) {
 *   if (err instanceof PrivacyLayerError) {
 *     console.error(`[${err.code}] ${err.message}`);
 *     if (err.isRetryable) {
 *       // retry the operation
 *     }
 *   }
 * }
 * ```
 */
export class PrivacyLayerError extends Error {
  /** Stable error code for i18n and programmatic handling */
  public readonly code: ErrorCode;

  /** Optional structured context (never contains sensitive data) */
  public readonly details?: Record<string, unknown>;

  /** ISO 8601 timestamp of when the error occurred */
  public readonly timestamp: string;

  /** Whether this error is potentially recoverable by retrying */
  public readonly isRetryable: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
    },
  ) {
    const msg = message ?? ERROR_MESSAGES[code] ?? 'Unknown error';
    super(msg);

    this.name = 'PrivacyLayerError';
    this.code = code;
    this.details = options?.details;
    this.cause = options?.cause;
    this.timestamp = new Date().toISOString();
    this.isRetryable = options?.isRetryable ?? false;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a JSON-safe representation of the error for logging.
   * Never includes stack traces or sensitive data in production logs.
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

// ──────────────────────────────────────────────────────────────
// Network Errors
// ──────────────────────────────────────────────────────────────

/**
 * Errors related to network communication and RPC calls.
 *
 * These errors are typically retryable — the SDK's retry logic
 * will automatically retry with exponential backoff for transient
 * network failures.
 *
 * @example
 * ```typescript
 * try {
 *   await sdk.getRoot();
 * } catch (err) {
 *   if (err instanceof NetworkError) {
 *     console.error(`Network issue: ${err.message}`);
 *     // err.isRetryable is typically true for network errors
 *   }
 * }
 * ```
 */
export class NetworkError extends PrivacyLayerError {
  /** HTTP status code, if applicable */
  public readonly statusCode?: number;

  /** RPC endpoint URL that failed (safe to log — no auth tokens) */
  public readonly endpoint?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
      statusCode?: number;
      endpoint?: string;
    },
  ) {
    super(code, message, {
      details: options?.details,
      cause: options?.cause,
      isRetryable: options?.isRetryable ?? true,
    });

    this.name = 'NetworkError';
    this.statusCode = options?.statusCode;
    this.endpoint = options?.endpoint;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ──────────────────────────────────────────────────────────────
// Validation Errors
// ──────────────────────────────────────────────────────────────

/**
 * Errors related to input validation.
 *
 * These errors are NOT retryable — the input must be corrected
 * before retrying.
 *
 * @example
 * ```typescript
 * try {
 *   sdk.validateNote(note);
 * } catch (err) {
 *   if (err instanceof ValidationError) {
 *     console.error(`Invalid input: ${err.message}`);
 *     console.error(`Field: ${err.field}`);
 *   }
 * }
 * ```
 */
export class ValidationError extends PrivacyLayerError {
  /** The field or parameter that failed validation */
  public readonly field?: string;

  /** The constraint that was violated */
  public readonly constraint?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      field?: string;
      constraint?: string;
    },
  ) {
    super(code, message, {
      details: options?.details,
      cause: options?.cause,
      isRetryable: false,
    });

    this.name = 'ValidationError';
    this.field = options?.field;
    this.constraint = options?.constraint;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ──────────────────────────────────────────────────────────────
// Proof Generation Errors
// ──────────────────────────────────────────────────────────────

/**
 * Errors related to ZK proof generation and verification.
 *
 * These errors may or may not be retryable depending on the
 * root cause. WASM memory errors are retryable (after GC),
 * while invalid inputs are not.
 *
 * @example
 * ```typescript
 * try {
 *   const proof = await sdk.generateProof(note, merkleProof);
 * } catch (err) {
 *   if (err instanceof ProofGenerationError) {
 *     if (err.code === ErrorCode.WASM_OUT_OF_MEMORY) {
 *       // Wait and retry
 *     }
 *   }
 * }
 * ```
 */
export class ProofGenerationError extends PrivacyLayerError {
  /** The proof generation phase that failed */
  public readonly phase?: 'compilation' | 'witness' | 'proving' | 'verification';

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
      phase?: 'compilation' | 'witness' | 'proving' | 'verification';
    },
  ) {
    super(code, message, {
      details: options?.details,
      cause: options?.cause,
      isRetryable: options?.isRetryable ?? false,
    });

    this.name = 'ProofGenerationError';
    this.phase = options?.phase;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ──────────────────────────────────────────────────────────────
// Contract Errors
// ──────────────────────────────────────────────────────────────

/**
 * Errors returned by the Soroban smart contract.
 *
 * These map directly to the `Error` enum in the Rust contract
 * (`contracts/privacy_pool/src/types/errors.rs`).
 *
 * @example
 * ```typescript
 * try {
 *   await sdk.withdraw(proof, publicInputs);
 * } catch (err) {
 *   if (err instanceof ContractError) {
 *     console.error(`Contract error ${err.contractErrorCode}: ${err.message}`);
 *   }
 * }
 * ```
 */
export class ContractError extends PrivacyLayerError {
  /** The original numeric error code from the Soroban contract */
  public readonly contractErrorCode?: number;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
      contractErrorCode?: number;
    },
  ) {
    super(code, message, {
      details: options?.details,
      cause: options?.cause,
      isRetryable: options?.isRetryable ?? false,
    });

    this.name = 'ContractError';
    this.contractErrorCode = options?.contractErrorCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ──────────────────────────────────────────────────────────────
// Wallet Errors
// ──────────────────────────────────────────────────────────────

/**
 * Errors related to wallet connection and signing.
 *
 * User rejection errors are NOT retryable automatically —
 * the user must explicitly approve the transaction.
 *
 * @example
 * ```typescript
 * try {
 *   await sdk.connectWallet();
 * } catch (err) {
 *   if (err instanceof WalletError) {
 *     if (err.code === ErrorCode.USER_REJECTED) {
 *       showMessage('Transaction cancelled by user.');
 *     }
 *   }
 * }
 * ```
 */
export class WalletError extends PrivacyLayerError {
  /** The wallet provider that raised the error (e.g., "Freighter") */
  public readonly walletProvider?: string;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      details?: Record<string, unknown>;
      cause?: Error;
      isRetryable?: boolean;
      walletProvider?: string;
    },
  ) {
    super(code, message, {
      details: options?.details,
      cause: options?.cause,
      isRetryable: options?.isRetryable ?? false,
    });

    this.name = 'WalletError';
    this.walletProvider = options?.walletProvider;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ──────────────────────────────────────────────────────────────
// Contract Error Code Mapping
// ──────────────────────────────────────────────────────────────

/**
 * Map from Soroban contract error codes (u32) to SDK ErrorCode.
 * These match the `Error` enum in `contracts/privacy_pool/src/types/errors.rs`.
 */
const CONTRACT_ERROR_MAP: Record<number, ErrorCode> = {
  1: ErrorCode.CONTRACT_ALREADY_INITIALIZED,
  2: ErrorCode.CONTRACT_NOT_INITIALIZED,
  10: ErrorCode.UNAUTHORIZED_ADMIN,
  20: ErrorCode.CONTRACT_PAUSED,
  21: ErrorCode.TREE_FULL,
  30: ErrorCode.INVALID_AMOUNT,
  31: ErrorCode.ZERO_COMMITMENT,
  40: ErrorCode.UNKNOWN_ROOT,
  41: ErrorCode.NULLIFIER_ALREADY_SPENT,
  42: ErrorCode.PROOF_VERIFICATION_FAILED,
  43: ErrorCode.FEE_EXCEEDS_AMOUNT,
  44: ErrorCode.INVALID_RELAYER_FEE,
  45: ErrorCode.INVALID_ADDRESS,
  50: ErrorCode.NO_VERIFYING_KEY,
  51: ErrorCode.MALFORMED_VERIFYING_KEY,
  60: ErrorCode.PROOF_VERIFICATION_FAILED,
  61: ErrorCode.PROOF_VERIFICATION_FAILED,
  62: ErrorCode.PROOF_VERIFICATION_FAILED,
  70: ErrorCode.PROOF_VERIFICATION_FAILED,
  71: ErrorCode.PROOF_VERIFICATION_FAILED,
};

/**
 * Parse a Soroban contract error code into a typed ContractError.
 *
 * Maps the numeric error code from the on-chain `Error` enum to the
 * appropriate SDK error with a human-readable message.
 *
 * @param contractCode - The numeric error code from the contract (u32)
 * @param rawError     - The original error for chaining
 * @returns A typed ContractError with the appropriate code and message
 */
export function parseContractError(
  contractCode: number,
  rawError?: Error,
): ContractError {
  const sdkCode = CONTRACT_ERROR_MAP[contractCode] ?? ErrorCode.UNKNOWN_CONTRACT_ERROR;

  return new ContractError(sdkCode, undefined, {
    cause: rawError,
    contractErrorCode: contractCode,
    details: { contractCode },
  });
}

// ──────────────────────────────────────────────────────────────
// Error Guards (Type Narrowing)
// ──────────────────────────────────────────────────────────────

/** Type guard for PrivacyLayerError */
export function isPrivacyLayerError(err: unknown): err is PrivacyLayerError {
  return err instanceof PrivacyLayerError;
}

/** Type guard for NetworkError */
export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError;
}

/** Type guard for ValidationError */
export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError;
}

/** Type guard for ProofGenerationError */
export function isProofGenerationError(err: unknown): err is ProofGenerationError {
  return err instanceof ProofGenerationError;
}

/** Type guard for ContractError */
export function isContractError(err: unknown): err is ContractError {
  return err instanceof ContractError;
}

/** Type guard for WalletError */
export function isWalletError(err: unknown): err is WalletError {
  return err instanceof WalletError;
}

/**
 * Check if an error is retryable.
 * Works with both PrivacyLayerError and unknown errors.
 */
export function isRetryableError(err: unknown): boolean {
  if (isPrivacyLayerError(err)) {
    return err.isRetryable;
  }
  return false;
}

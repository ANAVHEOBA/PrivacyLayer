// ============================================================
// PrivacyLayer SDK — Error Handler
// ============================================================
// High-level error handling utilities that wrap SDK operations
// with proper error classification, logging, and recovery.
// ============================================================

import {
  ErrorCode,
  NetworkError,
  PrivacyLayerError,
  ProofGenerationError,
  ValidationError,
  WalletError,
  isPrivacyLayerError,
  parseContractError,
} from './errors';
import { Logger } from './logger';
import { RetryConfig, withRetry } from './retry';

// ──────────────────────────────────────────────────────────────
// Error Handler Configuration
// ──────────────────────────────────────────────────────────────

/**
 * Configuration for the ErrorHandler.
 */
export interface ErrorHandlerConfig {
  /** Logger instance for recording errors */
  logger?: Logger;

  /** Retry configuration for transient failures */
  retryConfig?: Partial<RetryConfig>;

  /** Custom error handler callback — invoked for every error */
  onError?: (error: PrivacyLayerError) => void;
}

// ──────────────────────────────────────────────────────────────
// Error Classification
// ──────────────────────────────────────────────────────────────

/**
 * Classify a raw error into the appropriate PrivacyLayerError subclass.
 *
 * This function examines error messages, types, and properties to
 * determine the most specific error type. It handles:
 *   - Known Soroban contract errors (numeric codes)
 *   - Network/fetch errors
 *   - Wallet rejection errors
 *   - WASM/proof errors
 *   - Generic/unknown errors
 *
 * @param error - The raw error to classify
 * @returns A typed PrivacyLayerError subclass instance
 */
export function classifyError(error: unknown): PrivacyLayerError {
  // Already classified
  if (isPrivacyLayerError(error)) {
    return error;
  }

  const rawError = error instanceof Error ? error : new Error(String(error));
  const message = rawError.message.toLowerCase();

  // ── Network errors ──────────────────────────────────────
  if (
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnaborted')
  ) {
    return new NetworkError(ErrorCode.NETWORK_TIMEOUT, undefined, {
      cause: rawError,
      isRetryable: true,
    });
  }

  if (
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    (message.includes('network') &&
      !message.includes('wrong network') &&
      !message.includes('network mismatch'))
  ) {
    return new NetworkError(ErrorCode.NETWORK_UNREACHABLE, undefined, {
      cause: rawError,
      isRetryable: true,
    });
  }

  if (message.includes('rate limit') || message.includes('429')) {
    return new NetworkError(ErrorCode.RATE_LIMITED, undefined, {
      cause: rawError,
      isRetryable: true,
      statusCode: 429,
    });
  }

  if (
    message.includes('transaction failed') ||
    message.includes('tx_failed')
  ) {
    return new NetworkError(ErrorCode.TRANSACTION_FAILED, undefined, {
      cause: rawError,
      isRetryable: false,
    });
  }

  if (
    message.includes('transaction expired') ||
    message.includes('tx_too_late')
  ) {
    return new NetworkError(ErrorCode.TRANSACTION_EXPIRED, undefined, {
      cause: rawError,
      isRetryable: true,
    });
  }

  // ── Contract errors (Soroban numeric codes) ─────────────
  const contractCodeMatch = message.match(
    /contract(?:\s+call)?\s+(?:error|failed).*?(?:code|#)\s*(\d+)/i,
  );
  if (contractCodeMatch) {
    const code = parseInt(contractCodeMatch[1], 10);
    return parseContractError(code, rawError);
  }

  // Check for HostError with contract error patterns
  if (message.includes('hosterror') || message.includes('host_error')) {
    const codeMatch = message.match(/error\(contract,\s*#?(\d+)\)/i);
    if (codeMatch) {
      const code = parseInt(codeMatch[1], 10);
      return parseContractError(code, rawError);
    }
  }

  // ── Wallet errors ──────────────────────────────────────
  if (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('user cancelled') ||
    message.includes('rejected by user')
  ) {
    return new WalletError(ErrorCode.USER_REJECTED, undefined, {
      cause: rawError,
    });
  }

  if (
    message.includes('wallet not') ||
    message.includes('no wallet') ||
    message.includes('not connected')
  ) {
    return new WalletError(ErrorCode.WALLET_NOT_CONNECTED, undefined, {
      cause: rawError,
    });
  }

  if (
    message.includes('insufficient funds') ||
    message.includes('insufficient balance')
  ) {
    return new WalletError(ErrorCode.INSUFFICIENT_FUNDS, undefined, {
      cause: rawError,
    });
  }

  if (
    message.includes('wrong network') ||
    message.includes('network mismatch')
  ) {
    return new WalletError(ErrorCode.NETWORK_MISMATCH, undefined, {
      cause: rawError,
    });
  }

  // ── Proof/WASM errors ─────────────────────────────────
  if (
    message.includes('wasm') &&
    (message.includes('load') || message.includes('instantiat'))
  ) {
    return new ProofGenerationError(ErrorCode.WASM_LOAD_FAILED, undefined, {
      cause: rawError,
      phase: 'compilation',
    });
  }

  if (message.includes('out of memory') || message.includes('oom')) {
    return new ProofGenerationError(ErrorCode.WASM_OUT_OF_MEMORY, undefined, {
      cause: rawError,
      isRetryable: true,
      phase: 'proving',
    });
  }

  if (message.includes('proof') && message.includes('fail')) {
    return new ProofGenerationError(
      ErrorCode.PROOF_GENERATION_FAILED,
      undefined,
      {
        cause: rawError,
        phase: 'proving',
      },
    );
  }

  if (message.includes('witness') && message.includes('fail')) {
    return new ProofGenerationError(
      ErrorCode.WITNESS_GENERATION_FAILED,
      undefined,
      {
        cause: rawError,
        phase: 'witness',
      },
    );
  }

  // ── Validation errors ─────────────────────────────────
  if (message.includes('invalid address')) {
    return new ValidationError(ErrorCode.INVALID_ADDRESS, undefined, {
      cause: rawError,
      field: 'address',
    });
  }

  if (message.includes('invalid amount')) {
    return new ValidationError(ErrorCode.INVALID_AMOUNT, undefined, {
      cause: rawError,
      field: 'amount',
    });
  }

  // ── Fallback ──────────────────────────────────────────
  return new PrivacyLayerError(ErrorCode.INTERNAL_ERROR, rawError.message, {
    cause: rawError,
  });
}

// ──────────────────────────────────────────────────────────────
// Error Handler
// ──────────────────────────────────────────────────────────────

/**
 * High-level error handler that wraps SDK operations with:
 *   - Automatic error classification
 *   - Structured logging
 *   - Retry logic for transient failures
 *   - Custom error callbacks
 *
 * @example
 * ```typescript
 * const handler = new ErrorHandler({
 *   logger: new Logger({ level: LogLevel.DEBUG }),
 *   retryConfig: { maxRetries: 5 },
 *   onError: (err) => telemetry.report(err),
 * });
 *
 * const result = await handler.execute(
 *   () => contract.deposit(commitment),
 *   'deposit',
 * );
 * ```
 */
export class ErrorHandler {
  private readonly logger?: Logger;
  private readonly retryConfig?: Partial<RetryConfig>;
  private readonly onError?: (error: PrivacyLayerError) => void;

  constructor(config?: ErrorHandlerConfig) {
    this.logger = config?.logger;
    this.retryConfig = config?.retryConfig;
    this.onError = config?.onError;
  }

  /**
   * Execute an async operation with full error handling.
   *
   * @typeParam T         - Return type of the operation
   * @param fn            - The async operation to execute
   * @param operationName - Name of the operation for logging
   * @returns The result of the operation
   * @throws A classified PrivacyLayerError on failure
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    try {
      this.logger?.debug(`Starting operation: ${operationName}`);

      const result = await withRetry(fn, {
        ...this.retryConfig,
        onRetry: (error, attempt, delayMs) => {
          const classified = classifyError(error);
          this.logger?.warn(
            `Retrying ${operationName} (attempt ${attempt})`,
            { delayMs, attempt },
            classified,
          );
          this.retryConfig?.onRetry?.(error, attempt, delayMs);
        },
      });

      this.logger?.debug(`Operation completed: ${operationName}`);
      return result;
    } catch (error: unknown) {
      const classified = classifyError(error);

      this.logger?.error(
        `Operation failed: ${operationName}`,
        classified,
        { operation: operationName },
      );

      if (this.onError) {
        this.onError(classified);
      }

      throw classified;
    }
  }

  /**
   * Execute a synchronous operation with error handling.
   * Does not apply retry logic (synchronous operations are
   * not retryable in the same way).
   *
   * @typeParam T         - Return type of the operation
   * @param fn            - The synchronous operation to execute
   * @param operationName - Name of the operation for logging
   * @returns The result of the operation
   * @throws A classified PrivacyLayerError on failure
   */
  executeSync<T>(
    fn: () => T,
    operationName: string,
  ): T {
    try {
      this.logger?.debug(`Starting sync operation: ${operationName}`);
      const result = fn();
      this.logger?.debug(`Sync operation completed: ${operationName}`);
      return result;
    } catch (error: unknown) {
      const classified = classifyError(error);

      this.logger?.error(
        `Sync operation failed: ${operationName}`,
        classified,
        { operation: operationName },
      );

      if (this.onError) {
        this.onError(classified);
      }

      throw classified;
    }
  }
}

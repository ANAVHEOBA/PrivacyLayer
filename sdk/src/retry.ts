// ============================================================
// PrivacyLayer SDK — Retry Logic with Exponential Backoff
// ============================================================
// Provides configurable retry logic for transient failures
// (network timeouts, rate limiting, temporary RPC errors).
//
// Features:
//   - Exponential backoff with jitter
//   - Configurable max retries, base delay, and max delay
//   - Per-error-type retry decisions
//   - Abort signal support for cancellation
//   - Hooks for logging/telemetry on each retry
// ============================================================

import {
  ErrorCode,
  NetworkError,
  isPrivacyLayerError,
  isRetryableError,
} from './errors';

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

/**
 * Configuration for the retry mechanism.
 *
 * @example
 * ```typescript
 * const config: RetryConfig = {
 *   maxRetries: 5,
 *   baseDelayMs: 1000,
 *   maxDelayMs: 30_000,
 *   backoffMultiplier: 2,
 *   jitterFactor: 0.1,
 * };
 * ```
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts.
   * Set to 0 to disable retries entirely.
   * @default 3
   */
  maxRetries: number;

  /**
   * Base delay in milliseconds before the first retry.
   * Subsequent retries multiply this by the backoff multiplier.
   * @default 1000
   */
  baseDelayMs: number;

  /**
   * Maximum delay in milliseconds between retries.
   * Prevents exponential backoff from growing unbounded.
   * @default 30000
   */
  maxDelayMs: number;

  /**
   * Multiplier for exponential backoff.
   * delay = baseDelayMs * (backoffMultiplier ^ attempt)
   * @default 2
   */
  backoffMultiplier: number;

  /**
   * Jitter factor (0-1) to randomize delay and prevent thundering herd.
   * A value of 0.1 adds +/- 10% random jitter to each delay.
   * @default 0.1
   */
  jitterFactor: number;

  /**
   * Optional abort signal for cancelling retry loops.
   */
  abortSignal?: AbortSignal;

  /**
   * Optional custom function to determine if an error is retryable.
   * If not provided, uses the default isRetryableError check.
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /**
   * Optional callback invoked before each retry attempt.
   * Useful for logging and telemetry.
   */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: Readonly<RetryConfig> = Object.freeze({
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
});

// ──────────────────────────────────────────────────────────────
// Delay Calculation
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the delay for a given retry attempt using exponential
 * backoff with jitter.
 *
 * Formula: min(maxDelay, baseDelay * multiplier^attempt) * (1 +/- jitter)
 *
 * @param attempt    - The current retry attempt (0-indexed)
 * @param config     - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff
  const exponentialDelay =
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter: delay * (1 + random(-jitter, +jitter))
  const jitter = config.jitterFactor * (2 * Math.random() - 1);
  const finalDelay = cappedDelay * (1 + jitter);

  return Math.max(0, Math.round(finalDelay));
}

/**
 * Sleep for a given number of milliseconds.
 * Supports cancellation via AbortSignal.
 *
 * @param ms          - Duration in milliseconds
 * @param abortSignal - Optional abort signal for cancellation
 * @returns Promise that resolves after the delay or rejects on abort
 */
export function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new DOMException('Retry aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);

    if (abortSignal) {
      const onAbort = (): void => {
        clearTimeout(timer);
        reject(new DOMException('Retry aborted', 'AbortError'));
      };
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

// ──────────────────────────────────────────────────────────────
// Retry Executor
// ──────────────────────────────────────────────────────────────

/**
 * Execute an async function with retry logic and exponential backoff.
 *
 * Only retries errors that are marked as retryable (e.g., network
 * timeouts, rate limiting). Non-retryable errors (e.g., validation
 * errors, user rejection) are thrown immediately.
 *
 * @typeParam T - Return type of the function
 * @param fn     - Async function to execute and potentially retry
 * @param config - Retry configuration (merged with defaults)
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const root = await withRetry(
 *   () => rpcClient.getRoot(),
 *   { maxRetries: 5, baseDelayMs: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const mergedConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt >= mergedConfig.maxRetries) {
        break;
      }

      // Check if the error is retryable
      const shouldRetry = mergedConfig.shouldRetry
        ? mergedConfig.shouldRetry(error, attempt)
        : isRetryableError(error);

      if (!shouldRetry) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delayMs = calculateDelay(attempt, mergedConfig);

      // Invoke onRetry callback
      if (mergedConfig.onRetry) {
        mergedConfig.onRetry(error, attempt + 1, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs, mergedConfig.abortSignal);
    }
  }

  // All retries exhausted — wrap in MAX_RETRIES_EXCEEDED if it was retryable
  if (isPrivacyLayerError(lastError)) {
    throw new NetworkError(
      ErrorCode.MAX_RETRIES_EXCEEDED,
      `Operation failed after ${mergedConfig.maxRetries} retries: ${lastError.message}`,
      {
        cause: lastError instanceof Error ? lastError : undefined,
        isRetryable: false,
        details: {
          maxRetries: mergedConfig.maxRetries,
          originalCode: lastError.code,
        },
      },
    );
  }

  throw lastError;
}

// ──────────────────────────────────────────────────────────────
// Retry Decorator
// ──────────────────────────────────────────────────────────────

/**
 * Creates a retryable version of an async function.
 *
 * @typeParam TArgs   - Function argument types
 * @typeParam TResult - Function return type
 * @param fn     - The async function to wrap
 * @param config - Retry configuration
 * @returns A new function that retries on transient failures
 *
 * @example
 * ```typescript
 * const retryableGetRoot = retryable(
 *   (contractId: string) => rpcClient.getRoot(contractId),
 *   { maxRetries: 5 }
 * );
 *
 * const root = await retryableGetRoot('CABC...');
 * ```
 */
export function retryable<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config?: Partial<RetryConfig>,
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}

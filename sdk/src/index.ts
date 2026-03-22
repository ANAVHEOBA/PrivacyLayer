// ============================================================
// PrivacyLayer SDK — Public API
// ============================================================
// Re-exports all public types, classes, and utilities.
// ============================================================

// ── Error Types ───────────────────────────────────────────
export {
  // Error codes
  ErrorCode,

  // Error messages map
  ERROR_MESSAGES,

  // Base error class
  PrivacyLayerError,

  // Error subclasses
  NetworkError,
  ValidationError,
  ProofGenerationError,
  ContractError,
  WalletError,

  // Contract error parsing
  parseContractError,

  // Type guards
  isPrivacyLayerError,
  isNetworkError,
  isValidationError,
  isProofGenerationError,
  isContractError,
  isWalletError,
  isRetryableError,
} from './errors';

// ── Retry Logic ───────────────────────────────────────────
export {
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  withRetry,
  retryable,
  calculateDelay,
  sleep,
} from './retry';

// ── Error Handler ─────────────────────────────────────────
export {
  type ErrorHandlerConfig,
  ErrorHandler,
  classifyError,
} from './error-handler';

// ── Logger ────────────────────────────────────────────────
export {
  LogLevel,
  type LogEntry,
  type LoggerConfig,
  Logger,
  sanitizeDetails,
} from './logger';

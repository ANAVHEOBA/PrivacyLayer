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
  DepositError,

  // Contract error parsing
  parseContractError,

  // Type guards
  isPrivacyLayerError,
  isNetworkError,
  isValidationError,
  isProofGenerationError,
  isContractError,
  isWalletError,
  isDepositError,
  isRetryableError,
} from './errors';

// ── Deposit Flow ─────────────────────────────────────────
export {
  // Primary deposit function
  deposit,

  // Individual flow steps (for advanced usage)
  buildDepositTransaction,
  submitTransaction,
  parseDepositReceipt,
  parseDepositReturnValue,
  estimateDepositCost,

  // Validation
  validateDepositOptions,
} from './deposit';

// ── Note Generation ──────────────────────────────────────
export {
  generateNote,
  validateNote,
  serializeNote,
  deserializeNote,
  computeCommitment,
  generateRandomFieldElement,
  isValidFieldElement,
  isZeroCommitment,
} from './note';

// ── Types ────────────────────────────────────────────────
export {
  // Denomination
  Denomination,
  DENOMINATION_AMOUNTS,
  DENOMINATION_LABELS,

  // Network
  type StellarNetwork,
  NETWORK_RPC_URLS,
  NETWORK_PASSPHRASES,

  // Note type
  type Note,

  // Deposit types
  type SignerFunction,
  type DepositOptions,
  type DepositReceipt,
  type DepositCostEstimate,

  // Transaction types
  TransactionStatus,
  type TransactionResult,

  // Config
  type SdkConfig,
} from './types';

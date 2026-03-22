// ============================================================
// PrivacyLayer SDK — Public API (Withdrawal Flow)
// ============================================================
// Re-exports all public types, classes, and utilities for the
// withdrawal flow implementation.
// ============================================================

// ── Withdrawal Flow ─────────────────────────────────────────
export {
  // Main entry point
  withdraw,

  // Transaction building
  buildWithdrawalTransaction,

  // Submission methods
  submitWithdrawal,
  submitViaRelayer,

  // Merkle tree operations
  findNoteInTree,
  checkRootKnown,
  checkNullifierSpent,

  // Validation
  validateNote,
  validateRecipientAddress,
  validateRelayerConfig,

  // Cryptographic helpers
  computeNullifierHash,
  encodeAddressAsField,

  // Utility functions
  bigIntToBytes,
  bufferToHex,
  denominationAmount,

  // Enums
  Denomination,
  WithdrawalStep,
  WithdrawalErrorCode,

  // Error class
  WithdrawalError,

  // Constants
  TREE_DEPTH,
  MAX_LEAVES,
  FIELD_BYTE_LENGTH,
} from './withdraw';

// ── Type Exports ────────────────────────────────────────────
export type {
  Note,
  WithdrawOptions,
  WithdrawalReceipt,
  WithdrawalProgressCallback,
  RelayerConfig,
  MerkleProof,
  ZkProof,
  WithdrawalPublicInputs,
  UnsignedWithdrawalTransaction,
  GasEstimate,
  SubmitWithdrawalResult,
} from './withdraw';

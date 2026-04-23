/**
 * PrivacyLayer SDK – Shared TypeScript Types
 *
 * All public types are exported from this module and re-exported
 * via the top-level index.ts barrel.
 *
 * Type philosophy:
 *  - `bigint` for field elements (BN254 scalars fit in 254-bit bigint)
 *  - `Uint8Array` (32 bytes) for on-chain byte representations
 *  - `string` for Stellar account addresses and transaction hashes
 */

// ─── Note ────────────────────────────────────────────────────────────────────

/**
 * A private note representing ownership of a shielded pool deposit.
 *
 * SECURITY: Keep nullifier and secret private. Loss of the note means
 * permanent loss of funds. Exposure of the nullifier allows front-running
 * the withdrawal.
 *
 * Commitment = Poseidon2(nullifier, secret)  [BN254 field]
 */
export interface Note {
  /** Random 254-bit field element. Revealed (as nullifier_hash) on spend. */
  nullifier: bigint;
  /** Random 254-bit field element. Never revealed. */
  secret: bigint;
  /** Poseidon2(nullifier, secret) – stored on-chain in the Merkle tree. */
  commitment: Uint8Array; // 32 bytes, big-endian BN254 field element
  /** When this note was generated (Unix ms). */
  createdAt: number;
}

// ─── Deposit Options ──────────────────────────────────────────────────────────

/**
 * Options accepted by `deposit()`.
 */
export interface DepositOptions {
  /**
   * Stellar account ID of the depositor (G… address).
   * Must be the account that signs the transaction.
   */
  depositorAddress: string;

  /**
   * Contract ID of the deployed PrivacyPool Soroban contract.
   */
  contractId: string;

  /**
   * Horizon/Soroban RPC endpoint URL.
   * @example "https://soroban-testnet.stellar.org"
   */
  rpcUrl: string;

  /**
   * Stellar network passphrase.
   * @example "Test SDF Network ; September 2015"
   */
  networkPassphrase: string;

  /**
   * Callback that signs and returns the XDR of a transaction envelope.
   * Keeps signing logic outside the SDK (Freighter, Albedo, hardware wallet…).
   *
   * @param txXdr - Base64-encoded unsigned transaction XDR
   * @returns Base64-encoded signed transaction XDR
   */
  signer: (txXdr: string) => Promise<string>;

  /**
   * Override the auto-generated note. Useful in tests or when restoring a
   * previously backed-up note.
   */
  note?: Note;

  /**
   * Maximum number of retry attempts for network operations. Default: 3.
   */
  maxRetries?: number;

  /**
   * Poll interval (ms) while waiting for transaction confirmation. Default: 2000.
   */
  pollIntervalMs?: number;

  /**
   * Transaction timeout in seconds passed to the Soroban server. Default: 30.
   */
  timeoutSeconds?: number;
}

// ─── Deposit Receipt ──────────────────────────────────────────────────────────

/**
 * Receipt returned by a successful `deposit()` call.
 *
 * Persist the full `note` and `leafIndex` – both are needed to generate a
 * withdrawal proof later.
 */
export interface DepositReceipt {
  /** The generated (or provided) note. Back this up securely! */
  note: Note;
  /** Position of the commitment in the on-chain Merkle tree (0-indexed). */
  leafIndex: number;
  /** Merkle root after this deposit was inserted. */
  merkleRoot: Uint8Array; // 32 bytes
  /** Stellar transaction hash (hex). */
  txHash: string;
  /** Ledger sequence number the transaction was included in. */
  ledgerSequence: number;
  /** Unix timestamp (ms) of the transaction. */
  timestamp: number;
}

// ─── Fee Estimate ─────────────────────────────────────────────────────────────

/**
 * Gas cost estimate returned by `estimateDepositCost()`.
 */
export interface DepositCostEstimate {
  /** Minimum resource fee in stroops. */
  minResourceFeeSroops: bigint;
  /** Estimated total fee (resource + base) in stroops. */
  totalFeeStroops: bigint;
  /** Human-readable total fee in XLM. */
  totalFeeXlm: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

/** All error codes the SDK can throw. */
export const enum DepositErrorCode {
  /** Contract is paused by admin. */
  POOL_PAUSED = 'POOL_PAUSED',
  /** Commitment is all-zeros (invalid). */
  ZERO_COMMITMENT = 'ZERO_COMMITMENT',
  /** Merkle tree is full (2^20 deposits reached). */
  TREE_FULL = 'TREE_FULL',
  /** Depositor account has insufficient XLM balance. */
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  /** Network request failed after all retries. */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Transaction simulation failed. */
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  /** Transaction was not confirmed within the timeout. */
  TIMEOUT = 'TIMEOUT',
  /** Transaction submission failed for an unknown reason. */
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  /** Returned receipt could not be parsed. */
  PARSE_ERROR = 'PARSE_ERROR',
  /** Signer callback threw or returned invalid XDR. */
  SIGNING_ERROR = 'SIGNING_ERROR',
}

/** SDK-specific error with structured code and optional cause. */
export class DepositError extends Error {
  constructor(
    public readonly code: DepositErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DepositError';
  }
}

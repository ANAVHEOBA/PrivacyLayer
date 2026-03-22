// ============================================================
// PrivacyLayer SDK — Type Definitions
// ============================================================
// All public types for the deposit flow and SDK configuration.
//
// These types mirror the Soroban contract's state types
// (`contracts/privacy_pool/src/types/state.rs`) and provide
// TypeScript-native interfaces for the deposit workflow.
// ============================================================

// ──────────────────────────────────────────────────────────────
// Denomination — matches contract's Denomination enum
// ──────────────────────────────────────────────────────────────

/**
 * Fixed denomination amounts supported by the privacy pool.
 * Using fixed denominations prevents amount-based correlation attacks.
 *
 * Matches the Rust enum in `contracts/privacy_pool/src/types/state.rs`.
 */
export enum Denomination {
  /** 10 XLM (in stroops: 100_000_000) */
  Xlm10 = 'Xlm10',
  /** 100 XLM (in stroops: 1_000_000_000) */
  Xlm100 = 'Xlm100',
  /** 1000 XLM (in stroops: 10_000_000_000) */
  Xlm1000 = 'Xlm1000',
  /** 100 USDC (in microunits: 100_000_000) */
  Usdc100 = 'Usdc100',
  /** 1000 USDC (in microunits: 1_000_000_000) */
  Usdc1000 = 'Usdc1000',
}

/**
 * Map from Denomination to the raw stroop/microunit amount.
 * These match the values in the Rust contract exactly.
 */
export const DENOMINATION_AMOUNTS: Record<Denomination, bigint> = {
  [Denomination.Xlm10]: 100_000_000n,       // 10 XLM
  [Denomination.Xlm100]: 1_000_000_000n,     // 100 XLM
  [Denomination.Xlm1000]: 10_000_000_000n,   // 1000 XLM
  [Denomination.Usdc100]: 100_000_000n,      // 100 USDC (6 decimals)
  [Denomination.Usdc1000]: 1_000_000_000n,   // 1000 USDC
};

/**
 * Human-readable denomination labels for display.
 */
export const DENOMINATION_LABELS: Record<Denomination, string> = {
  [Denomination.Xlm10]: '10 XLM',
  [Denomination.Xlm100]: '100 XLM',
  [Denomination.Xlm1000]: '1,000 XLM',
  [Denomination.Usdc100]: '100 USDC',
  [Denomination.Usdc1000]: '1,000 USDC',
};

// ──────────────────────────────────────────────────────────────
// Network Configuration
// ──────────────────────────────────────────────────────────────

/**
 * Supported Stellar networks.
 */
export type StellarNetwork = 'mainnet' | 'testnet' | 'futurenet' | 'standalone';

/**
 * Network-specific RPC endpoints.
 */
export const NETWORK_RPC_URLS: Record<StellarNetwork, string> = {
  mainnet: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
  standalone: 'http://localhost:8000/soroban/rpc',
};

/**
 * Network passphrases used by Stellar SDK for transaction signing.
 */
export const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  mainnet: 'Public Global Stellar Network ; September 2015',
  testnet: 'Test SDF Network ; September 2015',
  futurenet: 'Test SDF Future Network ; October 2022',
  standalone: 'Standalone Network ; February 2017',
};

// ──────────────────────────────────────────────────────────────
// Note — cryptographic deposit note
// ──────────────────────────────────────────────────────────────

/**
 * A deposit note containing the cryptographic material needed
 * to later withdraw from the privacy pool.
 *
 * **SECURITY: The `nullifier` and `secret` fields are sensitive.
 * Never log, transmit, or store them insecurely.**
 *
 * The commitment is Hash(nullifier, secret) using Poseidon2.
 */
export interface Note {
  /** Random nullifier (32 bytes, hex-encoded) */
  nullifier: string;

  /** Random secret (32 bytes, hex-encoded) */
  secret: string;

  /** Poseidon2 commitment = Hash(nullifier, secret) (32 bytes, hex-encoded) */
  commitment: string;

  /** Denomination of this deposit */
  denomination: Denomination;

  /** Network where this note is valid */
  network: StellarNetwork;

  /** ISO 8601 timestamp when the note was created */
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// Deposit Options
// ──────────────────────────────────────────────────────────────

/**
 * Signer function type — signs a Soroban transaction XDR.
 *
 * The SDK builds the transaction but delegates signing to the
 * caller (wallet integration, CLI keypair, etc).
 *
 * @param txXdr        - The transaction XDR to sign (base64)
 * @param networkPassphrase - The network passphrase for signing context
 * @returns The signed transaction XDR (base64)
 */
export type SignerFunction = (
  txXdr: string,
  networkPassphrase: string,
) => Promise<string>;

/**
 * Options for the deposit flow.
 */
export interface DepositOptions {
  /** The depositor's Stellar public key (G...) */
  sourceAddress: string;

  /** The privacy pool contract ID (C...) */
  contractId: string;

  /** The denomination to deposit */
  denomination: Denomination;

  /** The Stellar network to use */
  network: StellarNetwork;

  /** Transaction signer function (wallet or keypair) */
  signer: SignerFunction;

  /** Optional: custom RPC URL (overrides network default) */
  rpcUrl?: string;

  /** Optional: pre-generated note (if not provided, one is generated) */
  note?: Note;

  /** Optional: custom memo for the transaction */
  memo?: string;

  /**
   * Optional: timeout for waiting on transaction confirmation (ms).
   * @default 30000
   */
  confirmationTimeoutMs?: number;
}

// ──────────────────────────────────────────────────────────────
// Deposit Receipt
// ──────────────────────────────────────────────────────────────

/**
 * Receipt returned after a successful deposit.
 *
 * Contains everything needed to later withdraw:
 *   - The note (with nullifier and secret)
 *   - The leaf index in the Merkle tree
 *   - The new Merkle root after insertion
 *   - Transaction details
 */
export interface DepositReceipt {
  /** The deposit note (contains sensitive nullifier/secret) */
  note: Note;

  /** Leaf index in the Merkle tree where the commitment was inserted */
  leafIndex: number;

  /** New Merkle root after the deposit */
  merkleRoot: string;

  /** Stellar transaction hash */
  transactionHash: string;

  /** Ledger number where the transaction was included */
  ledgerNumber: number;

  /** ISO 8601 timestamp of the deposit confirmation */
  confirmedAt: string;

  /** The denomination amount in stroops/microunits */
  denominationAmount: bigint;

  /** The contract ID that was deposited to */
  contractId: string;

  /** The network where the deposit occurred */
  network: StellarNetwork;
}

// ──────────────────────────────────────────────────────────────
// Gas Estimation
// ──────────────────────────────────────────────────────────────

/**
 * Gas cost estimation for a deposit transaction.
 */
export interface DepositCostEstimate {
  /** Estimated transaction fee in stroops */
  estimatedFee: bigint;

  /** The denomination amount that will be deposited */
  depositAmount: bigint;

  /** Total cost = fee + deposit amount */
  totalCost: bigint;

  /** Minimum balance required in the source account */
  minimumBalance: bigint;

  /** Estimated CPU instructions for contract execution */
  cpuInstructions: number;

  /** Estimated memory bytes for contract execution */
  memoryBytes: number;
}

// ──────────────────────────────────────────────────────────────
// Transaction Result Types
// ──────────────────────────────────────────────────────────────

/**
 * Status of a submitted transaction.
 */
export enum TransactionStatus {
  /** Transaction is pending (not yet in a ledger) */
  PENDING = 'PENDING',
  /** Transaction succeeded and was included in a ledger */
  SUCCESS = 'SUCCESS',
  /** Transaction failed */
  FAILED = 'FAILED',
  /** Transaction was not found (may have expired) */
  NOT_FOUND = 'NOT_FOUND',
}

/**
 * Raw transaction result from the Soroban RPC.
 */
export interface TransactionResult {
  /** Transaction status */
  status: TransactionStatus;

  /** Transaction hash */
  hash: string;

  /** Ledger number (if included) */
  ledger?: number;

  /** Result XDR (if available) */
  resultXdr?: string;

  /** Error message (if failed) */
  errorMessage?: string;

  /** Return value from the contract call */
  returnValue?: {
    leafIndex: number;
    merkleRoot: string;
  };
}

// ──────────────────────────────────────────────────────────────
// SDK Configuration
// ──────────────────────────────────────────────────────────────

/**
 * SDK-level configuration for all operations.
 */
export interface SdkConfig {
  /** The Stellar network */
  network: StellarNetwork;

  /** The privacy pool contract ID */
  contractId: string;

  /** Optional: custom RPC URL */
  rpcUrl?: string;

  /** Optional: transaction confirmation timeout in ms (default 30000) */
  confirmationTimeoutMs?: number;

  /** Optional: enable verbose logging */
  verbose?: boolean;
}

/**
 * Core types for PrivacyLayer SDK
 */

/**
 * Supported denominations for privacy pool deposits
 */
export enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000,
}

/**
 * Represents a privacy note containing commitment data
 */
export interface Note {
  /** Nullifier (hex string) - used to prevent double-spending */
  nullifier: string;
  /** Secret (hex string) - private key for the note */
  secret: string;
  /** Commitment (hex string) - public commitment to the note */
  commitment: string;
  /** Denomination of the note */
  denomination: Denomination;
}

/**
 * Receipt returned after a successful deposit
 */
export interface DepositReceipt {
  /** Commitment hash */
  commitment: string;
  /** Index in the Merkle tree */
  leafIndex: number;
  /** Transaction hash on Stellar */
  transactionHash: string;
  /** Timestamp of the deposit */
  timestamp: number;
}

/**
 * Network configuration for Stellar/Soroban
 */
export interface NetworkConfig {
  /** RPC URL for the network */
  rpcUrl: string;
  /** Network passphrase */
  networkPassphrase: string;
  /** Privacy pool contract ID */
  contractId: string;
}

/**
 * Withdrawal proof data
 */
export interface WithdrawalProof {
  /** Zero-knowledge proof */
  proof: string;
  /** Public inputs for verification */
  publicInputs: string[];
  /** Nullifier hash */
  nullifierHash: string;
  /** Root of the Merkle tree */
  root: string;
  /** Recipient address */
  recipient: string;
}

/**
 * Result of a withdrawal operation
 */
export interface WithdrawalResult {
  /** Transaction hash */
  transactionHash: string;
  /** Whether the withdrawal was successful */
  success: boolean;
  /** Timestamp of withdrawal */
  timestamp: number;
}

/**
 * Merkle tree path for proof generation
 */
export interface MerklePath {
  /** Path elements (sibling hashes) */
  pathElements: string[];
  /** Path indices (0 = left, 1 = right) */
  pathIndices: number[];
}

/**
 * Options for deposit operation
 */
export interface DepositOptions {
  /** Amount to deposit */
  amount: Denomination;
  /** Optional note to use (if not provided, a new one will be generated) */
  note?: Note;
}

/**
 * Options for withdrawal operation
 */
export interface WithdrawalOptions {
  /** Note to withdraw */
  note: Note;
  /** Recipient address */
  recipient: string;
  /** Relayer address (optional) */
  relayer?: string;
  /** Relayer fee (optional) */
  relayerFee?: number;
}

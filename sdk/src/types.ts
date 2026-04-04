/**
 * Core type definitions for PrivacyLayer SDK
 */

/**
 * Represents a privacy pool note containing cryptographic data
 */
export interface Note {
  /** Nullifier - unique identifier for the note spend */
  nullifier: string;
  /** Secret value used to derive the commitment */
  secret: string;
  /** Merkle tree commitment hash */
  commitment: string;
  /** Denomination/value of the note */
  denomination: Denomination;
}

/**
 * Enumeration of supported note denominations
 */
export enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000,
}

/**
 * Represents a deposit receipt from the blockchain
 */
export interface DepositReceipt {
  /** Merkle tree commitment */
  commitment: string;
  /** Leaf index in the Merkle tree */
  leafIndex: number;
  /** Blockchain transaction hash */
  transactionHash: string;
  /** Unix timestamp of the deposit */
  timestamp: number;
}

/**
 * Network configuration for Stellar/Soroban
 */
export interface NetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Stellar network passphrase */
  networkPassphrase: string;
  /** PrivacyLayer contract ID */
  contractId: string;
}

/**
 * Result of a deposit operation
 */
export interface DepositResult {
  /** The commitment hash posted to the contract */
  commitment: string;
  /** Transaction hash of the deposit */
  transactionHash: string;
  /** Note containing secret data (should be stored securely by user) */
  note: Note;
}

/**
 * Result of a withdrawal operation
 */
export interface WithdrawResult {
  /** Transaction hash of the withdrawal */
  transactionHash: string;
  /** Nullifier used in the withdrawal (for proof of spend) */
  nullifier: string;
}

/**
 * Merkle proof for a note
 */
export interface MerkleProof {
  /** Array of sibling hashes from leaf to root */
  siblings: string[];
  /** Index of the leaf in the Merkle tree */
  leafIndex: number;
  /** Root hash of the Merkle tree */
  root: string;
}

/**
 * Validation result with error details
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

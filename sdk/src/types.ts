/**
 * Core type definitions for PrivacyLayer SDK.
 * @module @privacylayer/sdk
 */

/** Supported denomination values for privacy pool deposits */
export enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000,
}

/** A privacy note containing nullifier, secret, and commitment */
export interface Note {
  /** Hex-encoded nullifier used to withdraw */
  nullifier: string;
  /** Hex-encoded secret combined with nullifier */
  secret: string;
  /** Hex-encoded commitment = hash(nullifier, secret) */
  commitment: string;
  /** Denomination of the deposit */
  denomination: Denomination;
}

/** Receipt returned after a deposit transaction */
export interface DepositReceipt {
  /** Commitment hash of the deposited note */
  commitment: string;
  /** Leaf index in the Merkle tree */
  leafIndex: number;
  /** Transaction hash on-chain */
  transactionHash: string;
  /** Unix timestamp of the deposit */
  timestamp: number;
}

/** Configuration for a Stellar network */
export interface NetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Stellar network passphrase */
  networkPassphrase: string;
  /** Deployed contract ID */
  contractId: string;
}

/** Parameters for a withdraw transaction */
export interface WithdrawParams {
  /** The note being spent */
  note: Note;
  /** Merkle proof path elements */
  merkleProof: string[];
  /** Merkle proof indices (0 or 1 per level) */
  merkleIndices: number[];
  /** Recipient Stellar address */
  recipient: string;
  /** Relayer address (optional, for relayered withdrawals) */
  relayer?: string;
  /** Fee paid to relayer */
  relayerFee?: number;
}

/** Status of a transaction */
export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

/** Result of a transaction */
export interface TransactionResult {
  status: TransactionStatus;
  hash?: string;
  error?: string;
}

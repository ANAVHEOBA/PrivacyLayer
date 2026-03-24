/**
 * Core type definitions for PrivacyLayer SDK.
 * @module @privacylayer/sdk/types
 */

/**
 * Supported denomination values for privacy pool deposits.
 * Values represent the amount in the smallest unit of the asset.
 */
export enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000,
}

/**
 * A privacy note containing nullifier, secret, and commitment.
 * This represents a deposit in the privacy pool.
 */
export interface Note {
  /** Hex-encoded nullifier (32 bytes) used to withdraw */
  nullifier: string;
  /** Hex-encoded secret (32 bytes) combined with nullifier */
  secret: string;
  /** Hex-encoded commitment = pedersenHash(nullifier, secret) */
  commitment: string;
  /** Denomination of the deposit */
  denomination: Denomination;
}

/**
 * Receipt returned after a deposit transaction.
 * Contains information needed to reconstruct the note.
 */
export interface DepositReceipt {
  /** Commitment hash of the deposited note */
  commitment: string;
  /** Leaf index in the Merkle tree */
  leafIndex: number;
  /** Transaction hash on-chain */
  transactionHash: string;
  /** Unix timestamp of the deposit (seconds) */
  timestamp: number;
}

/**
 * Configuration for a Stellar network.
 */
export interface NetworkConfig {
  /** RPC endpoint URL for Soroban */
  rpcUrl: string;
  /** Stellar network passphrase */
  networkPassphrase: string;
  /** Deployed privacy pool contract ID */
  contractId: string;
  /** Network name for identification */
  name?: string;
}

/**
 * Merkle proof for verifying inclusion in the tree.
 */
export interface MerkleProof {
  /** Merkle root hash (32 bytes hex) */
  root: string;
  /** Leaf hash (the commitment) */
  leaf: string;
  /** Path elements (sibling hashes at each level) */
  pathElements: string[];
  /** Path indices (0 = left, 1 = right at each level) */
  pathIndices: number[];
}

/**
 * Parameters for a withdraw transaction.
 */
export interface WithdrawParams {
  /** The note being spent */
  note: Note;
  /** Merkle proof showing note commitment is in the tree */
  merkleProof: MerkleProof;
  /** Recipient Stellar address (G...) */
  recipient: string;
  /** Optional relayer address for gasless withdrawals */
  relayer?: string;
  /** Fee paid to relayer (in smallest unit) */
  relayerFee?: bigint;
}

/**
 * Status of a transaction.
 */
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/**
 * Result of a transaction submission.
 */
export interface TransactionResult {
  /** Transaction status */
  status: TransactionStatus;
  /** Transaction hash if submitted */
  hash?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Privacy pool state information.
 */
export interface PoolState {
  /** Current Merkle tree root */
  root: string;
  /** Number of deposits in the pool */
  depositCount: number;
  /** Total value locked (in smallest unit) */
  totalValue: bigint;
}

/**
 * Options for SDK initialization.
 */
export interface SDKOptions {
  /** Network configuration to use */
  network: NetworkConfig;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Generated proof for a withdrawal.
 */
export interface WithdrawalProof {
  /** The proof bytes (for ZK verification) */
  proof: string;
  /** Public inputs for the proof */
  publicInputs: string[];
  /** The nullifier hash (prevents double-spending) */
  nullifierHash: string;
}
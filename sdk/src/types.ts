/**
 * Core types for PrivacyLayer SDK
 */

export interface Note {
  nullifier: string;  // Hex string
  secret: string;     // Hex string
  commitment: string; // Hex string
  denomination: Denomination;
}

export enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000
}

export interface DepositReceipt {
  commitment: string;
  leafIndex: number;
  transactionHash: string;
  timestamp: number;
}

export interface NetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
}

export interface WithdrawParams {
  note: Note;
  recipient: string;
  relayer?: string;
  fee?: bigint;
  merkleProof: string[];
  merkleRoot: string;
}

export interface DepositParams {
  note: Note;
  sender: string;
}

export interface MerkleTreeState {
  root: string;
  nextIndex: number;
  leaves: string[];
}

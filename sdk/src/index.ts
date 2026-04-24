// Types
export { Denomination } from './types';
export type {
  DepositReceipt,
  MerklePath,
  NetworkConfig,
  Note as SerializedNote,
  WithdrawalProof,
  WithdrawalResult,
} from './types';

// Constants
export * from './constants';

// Utilities
export * from './utils';

// Extended shielded-pool helpers
export { GasEstimator } from './gas';
export { Note } from './note';
export { ProofGenerator } from './proof';
export type { Groth16Proof, MerkleProof } from './proof';
export { StealthGenerator } from './stealth';

// Version
export const VERSION = '0.1.0';

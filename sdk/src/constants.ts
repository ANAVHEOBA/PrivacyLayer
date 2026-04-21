import { NetworkConfig } from './types';

/**
 * Network configurations for different Stellar networks
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
  mainnet: {
    rpcUrl: 'https://soroban-mainnet.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
};

/**
 * Merkle tree depth (number of levels)
 */
export const MERKLE_TREE_DEPTH = 20;

/**
 * Field size for the zero-knowledge proof system (BN254 curve)
 */
export const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

/**
 * Zero value used in Merkle tree
 */
export const ZERO_VALUE = BigInt(0);

/**
 * Maximum number of leaves in the Merkle tree
 */
export const MAX_LEAVES = 2 ** MERKLE_TREE_DEPTH;

/**
 * Gas limits for different operations
 */
export const GAS_LIMITS = {
  deposit: 1000000,
  withdraw: 2000000,
};

/**
 * Timeout for RPC requests (milliseconds)
 */
export const RPC_TIMEOUT = 30000;

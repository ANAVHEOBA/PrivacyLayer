/**
 * Constants for PrivacyLayer SDK.
 * @module @privacylayer/sdk/constants
 */

import type { NetworkConfig } from './types';

/**
 * SDK version.
 */
export const SDK_VERSION = '0.1.0';

/**
 * Merkle tree depth for the privacy pool.
 * This determines the maximum number of deposits (2^20 ≈ 1 million).
 */
export const MERKLE_TREE_DEPTH = 20;

/**
 * BN254 scalar field size.
 * All field elements must be less than this value.
 */
export const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

/**
 * Zero value for empty leaves in the Merkle tree.
 * This is the hash of [0, 0] using Pedersen.
 */
export const ZERO_VALUE = BigInt(
  '21663839004416932945382355908790599225266501822907911457583678216806004986638'
);

/**
 * Number of bytes for field elements.
 */
export const FIELD_ELEMENT_SIZE = 32;

/**
 * Network configurations for Stellar.
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    name: 'Stellar Testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
  mainnet: {
    name: 'Stellar Mainnet',
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
  futurenet: {
    name: 'Stellar Futurenet',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    contractId: '', // To be filled after deployment
  },
};

/**
 * Default gas settings for Soroban transactions.
 */
export const DEFAULT_GAS = {
  /** Maximum gas units for a transaction */
  maxGas: 100000000,
  /** Gas price in stroops per gas unit */
  gasPrice: 100,
};

/**
 * Supported asset codes for the privacy pool.
 */
export const SUPPORTED_ASSETS = ['XLM', 'USDC'] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

/**
 * Pedersen hash generator point constants.
 * These are derived from the BN254 curve.
 */
export const PEDERSEN_CONSTANTS = {
  /** Generator points for Pedersen hash */
  GENERATORS_COUNT: 2,
  /** Bits per generator */
  BITS_PER_GENERATOR: 253,
};

/**
 * Time constants for transaction monitoring.
 */
export const TRANSACTION_TIMEOUTS = {
  /** Time to wait for transaction confirmation (ms) */
  confirmation: 60000,
  /** Polling interval for transaction status (ms) */
  pollInterval: 3000,
  /** Maximum number of retries */
  maxRetries: 10,
};
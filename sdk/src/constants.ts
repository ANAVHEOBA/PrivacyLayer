/**
 * Network configurations for PrivacyLayer
 */
export const NETWORKS = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
  mainnet: {
    rpcUrl: 'https://soroban.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    contractId: '', // To be filled after deployment
  },
} as const;

/**
 * Default network to use
 */
export const DEFAULT_NETWORK = 'testnet';

/**
 * Merkle tree configuration
 */
export const MERKLE_TREE_DEPTH = 20;

/**
 * BN254 field size for Pedersen commitments
 * This is the prime used in the BN254 elliptic curve
 */
export const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

/**
 * Supported Stellar asset types
 */
export const SUPPORTED_ASSET_TYPES = ['native', 'credit_alphanum4', 'credit_alphanum12'] as const;

/**
 * Maximum note value based on denomination
 */
export const MAX_NOTE_VALUE = Denomination.TEN_THOUSAND;

/**
 * Minimum note value based on denomination
 */
export const MIN_NOTE_VALUE = Denomination.TEN;

/**
 * Re-export Denomination for convenience
 */
export { Denomination } from './types';

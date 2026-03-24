/**
 * Network configurations and constants
 */

export const NETWORKS = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    contractId: '' // To be filled after deployment
  },
  futurenet: {
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    contractId: ''
  },
  standalone: {
    rpcUrl: 'http://localhost:8000',
    networkPassphrase: 'Standalone Network ; February 2017',
    contractId: ''
  }
} as const;

export const MERKLE_TREE_DEPTH = 20;
export const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

export const ZERO_BYTES_32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const DEFAULT_NETWORK = 'testnet' as const;

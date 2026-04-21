import { Networks } from '@stellar/stellar-sdk';

import { Denomination, NetworkConfig } from './types';

export const BYTES32_HEX_LENGTH = 64;
export const HEX_32_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;

export const DENOMINATION_AMOUNTS: Record<Denomination, bigint> = {
  [Denomination.XLM_10]: 100_000_000n,
  [Denomination.XLM_100]: 1_000_000_000n,
  [Denomination.XLM_1000]: 10_000_000_000n,
  [Denomination.USDC_100]: 100_000_000n,
  [Denomination.USDC_1000]: 1_000_000_000n,
};

export const DEFAULT_NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    network: 'testnet',
    networkPassphrase: Networks.TESTNET,
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    contracts: {},
  },
  mainnet: {
    network: 'mainnet',
    networkPassphrase: Networks.PUBLIC,
    rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm',
    horizonUrl: 'https://horizon.stellar.org',
    contracts: {},
  },
  futurenet: {
    network: 'futurenet',
    networkPassphrase: Networks.FUTURENET,
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    contracts: {},
  },
  local: {
    network: 'local',
    networkPassphrase: 'Standalone Network ; February 2017',
    rpcUrl: 'http://localhost:8000/soroban/rpc',
    horizonUrl: 'http://localhost:8000',
    contracts: {},
  },
};

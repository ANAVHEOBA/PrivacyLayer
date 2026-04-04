/**
 * PrivacyLayer SDK
 *
 * TypeScript SDK for integrating privacy pool functionality
 * into applications built on Stellar/Soroban.
 *
 * @example
 * ```typescript
 * import { PrivacyLayer } from '@privacylayer/sdk';
 *
 * const client = new PrivacyLayer({
 *   rpcUrl: 'https://soroban-testnet.stellar.org',
 *   networkPassphrase: 'Test SDF Network ; September 2015',
 *   contractId: 'YOUR_CONTRACT_ID',
 * });
 *
 * // Generate a new note for deposit
 * const { commitment, note } = await client.generateNote(Denomination.HUNDRED);
 * ```
 */

// Types
export * from './types';

// Constants
export { NETWORKS, DEFAULT_NETWORK, MERKLE_TREE_DEPTH, FIELD_SIZE } from './constants';
export { Denomination } from './types';

// Utils
export * from './utils';

/**
 * PrivacyLayer client for interacting with the privacy pool contract
 */
export class PrivacyLayer {
  private rpcUrl: string;
  private networkPassphrase: string;
  private contractId: string;

  constructor(config: {
    rpcUrl: string;
    networkPassphrase: string;
    contractId: string;
  }) {
    this.rpcUrl = config.rpcUrl;
    this.networkPassphrase = config.networkPassphrase;
    this.contractId = config.contractId;
  }

  /**
   * Get the configured RPC URL
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Get the configured network passphrase
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Get the configured contract ID
   */
  getContractId(): string {
    return this.contractId;
  }

  /**
   * Get network configuration
   */
  getNetwork(): { rpcUrl: string; networkPassphrase: string; contractId: string } {
    return {
      rpcUrl: this.rpcUrl,
      networkPassphrase: this.networkPassphrase,
      contractId: this.contractId,
    };
  }
}

/**
 * Create a new PrivacyLayer client instance
 */
export function createClient(config: {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
}): PrivacyLayer {
  return new PrivacyLayer(config);
}

/**
 * PrivacyLayer SDK
 * TypeScript SDK for ZK-proof shielded pool on Stellar Soroban
 */

export * from './crypto/keys';
export * from './crypto/hash';
export * from './utils/validators';

export interface ShieldedPoolConfig {
  contractId: string;
  network: 'mainnet' | 'testnet' | 'futurenet';
  rpcUrl?: string;
}

export interface DepositParams {
  amount: bigint;
  asset: string;
  recipientCommitment: Uint8Array;
}

export interface WithdrawParams {
  nullifier: Uint8Array;
  proof: Uint8Array;
  root: Uint8Array;
}

export class PrivacyLayerSDK {
  private config: ShieldedPoolConfig;

  constructor(config: ShieldedPoolConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.contractId || this.config.contractId.length === 0) {
      throw new Error('Contract ID is required');
    }
    if (!['mainnet', 'testnet', 'futurenet'].includes(this.config.network)) {
      throw new Error('Invalid network specified');
    }
  }

  getContractId(): string {
    return this.config.contractId;
  }

  getNetwork(): string {
    return this.config.network;
  }
}

export default PrivacyLayerSDK;

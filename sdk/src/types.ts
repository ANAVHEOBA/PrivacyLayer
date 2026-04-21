export enum Denomination {
  XLM_10 = 'XLM_10',
  XLM_100 = 'XLM_100',
  XLM_1000 = 'XLM_1000',
  USDC_100 = 'USDC_100',
  USDC_1000 = 'USDC_1000',
}

export type Network = 'testnet' | 'mainnet' | 'futurenet' | 'local';

export interface NetworkConfig {
  network: Network;
  networkPassphrase: string;
  rpcUrl: string;
  horizonUrl?: string;
  contracts: {
    privacyPool?: string;
    xlmToken?: string;
    usdcToken?: string;
  };
}

export interface Note {
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: Denomination;
}

export interface DepositReceipt {
  commitment: string;
  leafIndex: number;
  transactionHash: string;
  timestamp: number;
}

export interface WithdrawalPublicInputs {
  root: string;
  nullifierHash: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
}

export interface MerkleProof {
  leaf: string;
  leafIndex: number;
  root: string;
  pathElements: string[];
  pathIndices: number[];
}

export interface Proof {
  a: string;
  b: string;
  c: string;
}

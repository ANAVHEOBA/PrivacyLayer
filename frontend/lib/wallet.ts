/**
 * Freighter Wallet Integration
 * 
 * Provides functions for connecting to Freighter wallet,
 * signing transactions, and managing wallet state.
 */

import { 
  isConnected, 
  requestAccess, 
  getPublicKey,
  signTransaction,
  setAllowed,
  getAllowedStatus,
  getNetwork,
  type AccountBalances
} from '@stellar/freighter-api';
import { Transaction } from '@stellar/stellar-sdk';

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string | null;
  error: string | null;
}

/**
 * Check if Freighter wallet is installed
 */
export async function checkWalletInstalled(): Promise<boolean> {
  try {
    const connected = await isConnected();
    return connected.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect to Freighter wallet
 * Requests access from the user if not already connected
 */
export async function connectWallet(): Promise<WalletState> {
  try {
    // Check if wallet is installed
    const isInstalled = await checkWalletInstalled();
    if (!isInstalled) {
      return {
        connected: false,
        publicKey: null,
        network: null,
        error: 'Freighter wallet is not installed. Please install it from https://www.freighter.app/'
      };
    }

    // Request access
    const accessResult = await requestAccess();
    
    if (accessResult.error) {
      return {
        connected: false,
        publicKey: null,
        network: null,
        error: accessResult.error
      };
    }

    // Get network info
    const networkResult = await getNetwork();
    
    return {
      connected: true,
      publicKey: accessResult.publicKey,
      network: networkResult.network,
      error: null
    };
  } catch (error) {
    return {
      connected: false,
      publicKey: null,
      network: null,
      error: error instanceof Error ? error.message : 'Failed to connect wallet'
    };
  }
}

/**
 * Disconnect wallet (clear local state)
 * Note: Freighter doesn't have a disconnect API, so we just clear local state
 */
export function disconnectWallet(): WalletState {
  return {
    connected: false,
    publicKey: null,
    network: null,
    error: null
  };
}

/**
 * Get the currently connected public key
 */
export async function getPublicKeyFromWallet(): Promise<string | null> {
  try {
    const result = await getPublicKey();
    return result.publicKey || null;
  } catch {
    return null;
  }
}

/**
 * Sign a transaction using Freighter
 * @param transactionXdr - The XDR string of the transaction to sign
 * @param networkPassphrase - The network passphrase (optional, defaults to current network)
 */
export async function signTransactionWithWallet(
  transactionXdr: string,
  networkPassphrase?: string
): Promise<{ signedTxXdr: string | null; error: string | null }> {
  try {
    // Check if connected
    const isInstalled = await checkWalletInstalled();
    if (!isInstalled) {
      return {
        signedTxXdr: null,
        error: 'Freighter wallet is not installed'
      };
    }

    // Get network if not provided
    let passphrase = networkPassphrase;
    if (!passphrase) {
      const networkResult = await getNetwork();
      passphrase = networkResult.networkPassphrase;
    }

    // Sign the transaction
    const result = await signTransaction(transactionXdr, {
      networkPassphrase: passphrase
    });

    if (result.error) {
      return {
        signedTxXdr: null,
        error: result.error
      };
    }

    return {
      signedTxXdr: result.signedTxXdr || null,
      error: null
    };
  } catch (error) {
    return {
      signedTxXdr: null,
      error: error instanceof Error ? error.message : 'Failed to sign transaction'
    };
  }
}

/**
 * Set whether the app is allowed to access the wallet
 */
export async function setWalletAllowed(allowed: boolean): Promise<boolean> {
  try {
    const result = await setAllowed(allowed);
    return result.isAllowed;
  } catch {
    return false;
  }
}

/**
 * Check if the app is allowed to access the wallet
 */
export async function getWalletAllowedStatus(): Promise<boolean> {
  try {
    const result = await getAllowedStatus();
    return result.isAllowed;
  } catch {
    return false;
  }
}

/**
 * Get the current network from Freighter
 */
export async function getWalletNetwork(): Promise<{ network: string; networkPassphrase: string } | null> {
  try {
    const result = await getNetwork();
    return {
      network: result.network,
      networkPassphrase: result.networkPassphrase
    };
  } catch {
    return null;
  }
}

/**
 * Error messages for common wallet errors
 */
export const WALLET_ERRORS = {
  NOT_INSTALLED: 'Freighter wallet is not installed. Please install it from https://www.freighter.app/',
  CONNECTION_REJECTED: 'Connection request was rejected by user',
  NETWORK_MISMATCH: 'Network mismatch. Please switch to the correct network in Freighter.',
  SIGNING_FAILED: 'Transaction signing failed',
  NOT_CONNECTED: 'Wallet is not connected'
} as const;
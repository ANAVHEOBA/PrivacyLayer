/**
 * Freighter Wallet Integration for PrivacyLayer
 * @module lib/wallet
 */

import {
  isConnected,
  getPublicKey,
  signTransaction,
  getNetwork,
  switchNetwork,
  signAuthEntry,
  isAllowed,
  setAllowed,
} from "@stellar/freighter-api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Network = "TESTNET" | "MAINNET" | "FUTURENET";

export interface WalletError {
  code: WalletErrorCode;
  message: string;
}

export enum WalletErrorCode {
  NOT_INSTALLED = "NOT_INSTALLED",
  USER_REJECTED = "USER_REJECTED",
  NETWORK_MISMATCH = "NETWORK_MISMATCH",
  SIGNATURE_FAILED = "SIGNATURE_FAILED",
  NOT_CONNECTED = "NOT_CONNECTED",
  UNKNOWN = "UNKNOWN",
}

// ─── Wallet Status ────────────────────────────────────────────────────────────

/**
 * Check if Freighter wallet is installed and available
 */
export async function checkWalletInstalled(): Promise<boolean> {
  try {
    const connected = await isConnected();
    return connected;
  } catch {
    return false;
  }
}

/**
 * Check if Freighter has a wallet connected
 */
export async function isWalletConnected(): Promise<boolean> {
  try {
    return await isConnected();
  } catch {
    return false;
  }
}

/**
 * Get the user's public key from Freighter
 * @throws {WalletError} if wallet not connected or user rejected
 */
export async function getPublicKeyFromWallet(): Promise<string> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw {
        code: WalletErrorCode.NOT_CONNECTED,
        message: "Wallet is not connected. Please connect first.",
      } as WalletError;
    }

    const publicKey = await getPublicKey();
    if (!publicKey) {
      throw {
        code: WalletErrorCode.NOT_CONNECTED,
        message: "No public key returned from wallet.",
      } as WalletError;
    }

    return publicKey;
  } catch (err: unknown) {
    const error = err as WalletError;
    if (error.code) throw error;
    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to get public key: ${error.message || String(err)}`,
    } as WalletError;
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Connect to Freighter wallet
 * Requests permission if not already allowed
 * @throws {WalletError} if wallet not installed or user rejected
 */
export async function connectWallet(): Promise<string> {
  const installed = await checkWalletInstalled();
  if (!installed) {
    throw {
      code: WalletErrorCode.NOT_INSTALLED,
      message:
        "Freighter wallet is not installed. Please install it from freighter.app",
    } as WalletError;
  }

  try {
    // Check if already allowed
    const allowed = await isAllowed();
    if (!allowed) {
      // Request permission
      await setAllowed();
    }

    const publicKey = await getPublicKey();
    return publicKey;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Freighter throws specific errors for user rejection
    if (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("Access denied") ||
      errorMessage.includes("rejected")
    ) {
      throw {
        code: WalletErrorCode.USER_REJECTED,
        message: "Connection request was rejected. Please try again.",
      } as WalletError;
    }

    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to connect wallet: ${errorMessage}`,
    } as WalletError;
  }
}

/**
 * Disconnect wallet (Freighter doesn't have explicit disconnect,
 * but we clear local state)
 */
export function disconnectWallet(): void {
  // Freighter doesn't have a disconnect method
  // The user can disconnect via the Freighter extension
  // We just clear our local state
  console.info("Wallet disconnect called - clear local state as needed");
}

// ─── Network ──────────────────────────────────────────────────────────────────

/**
 * Get the current network from Freighter
 * @throws {WalletError}
 */
export async function getCurrentNetwork(): Promise<Network> {
  try {
    const network = await getNetwork();
    return network as Network;
  } catch (err: unknown) {
    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to get network: ${(err as Error).message || String(err)}`,
    } as WalletError;
  }
}

/**
 * Switch Freighter to the specified network
 * @param network - TESTNET | MAINNET | FUTURENET
 * @throws {WalletError} if network switch fails
 */
export async function switchWalletNetwork(network: Network): Promise<void> {
  try {
    await switchNetwork(network);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes("User rejected") || errorMessage.includes("rejected")) {
      throw {
        code: WalletErrorCode.USER_REJECTED,
        message: "Network switch was rejected.",
      } as WalletError;
    }

    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to switch network: ${errorMessage}`,
    } as WalletError;
  }
}

/**
 * Verify the wallet is connected to the expected network
 * @param expectedNetwork - The network we expect the wallet to be on
 * @throws {WalletError} if networks don't match
 */
export async function verifyNetwork(
  expectedNetwork: Network
): Promise<boolean> {
  const current = await getCurrentNetwork();
  if (current !== expectedNetwork) {
    throw {
      code: WalletErrorCode.NETWORK_MISMATCH,
      message: `Network mismatch: wallet is on ${current}, expected ${expectedNetwork}. Please switch your wallet network.`,
    } as WalletError;
  }
  return true;
}

// ─── Transaction Signing ──────────────────────────────────────────────────────

/**
 * Sign a Stellar transaction with Freighter
 * @param transaction - The SorobanTransaction to sign (as base64 or XDR string)
 * @throws {WalletError} if signing fails
 */
export async function signTransactionWithWallet(
  transaction: string,
  network: Network = "TESTNET"
): Promise<string> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw {
        code: WalletErrorCode.NOT_CONNECTED,
        message: "Wallet is not connected.",
      } as WalletError;
    }

    const signedTx = await signTransaction(transaction, {
      networkPassphrase: getNetworkPassphrase(network),
    });

    return signedTx;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("Sign rejected") ||
      errorMessage.includes("rejected")
    ) {
      throw {
        code: WalletErrorCode.USER_REJECTED,
        message: "Transaction signing was rejected.",
      } as WalletError;
    }

    if (errorMessage.includes("signature")) {
      throw {
        code: WalletErrorCode.SIGNATURE_FAILED,
        message: `Transaction signing failed: ${errorMessage}`,
      } as WalletError;
    }

    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to sign transaction: ${errorMessage}`,
    } as WalletError;
  }
}

// ─── Auth Entry Signing (for Soroban) ────────────────────────────────────────

/**
 * Sign a Soroban auth entry with Freighter
 * @param entry - The auth entry to sign
 * @throws {WalletError}
 */
export async function signAuthEntryWithWallet(
  entry: string
): Promise<string> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw {
        code: WalletErrorCode.NOT_CONNECTED,
        message: "Wallet is not connected.",
      } as WalletError;
    }

    const signedEntry = await signAuthEntry(entry);
    return signedEntry;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
      throw {
        code: WalletErrorCode.USER_REJECTED,
        message: "Auth entry signing was rejected.",
      } as WalletError;
    }

    throw {
      code: WalletErrorCode.UNKNOWN,
      message: `Failed to sign auth entry: ${errorMessage}`,
    } as WalletError;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get network passphrase for a given network
 */
export function getNetworkPassphrase(network: Network): string {
  switch (network) {
    case "MAINNET":
      return "Public Global Stellar Network ; September 2015";
    case "TESTNET":
      return "Test SDF Network ; September 2015";
    case "FUTURENET":
      return "Test SDF Future Network ; October 2022";
    default:
      return "Test SDF Network ; September 2015";
  }
}

/**
 * Format a Stellar public key for display
 * e.g., "G...XYZ"
 */
export function formatPublicKey(publicKey: string): string {
  if (publicKey.length <= 8) return publicKey;
  return `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
}

/**
 * Validate a Stellar public key format
 */
export function isValidPublicKey(key: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(key);
}

// ─── Re-export types ─────────────────────────────────────────────────────────
export { type Network as WalletNetwork };

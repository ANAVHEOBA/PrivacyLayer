/**
 * Stellar Freighter Wallet Integration
 *
 * Provides wallet connection, disconnection, and signing
 * capabilities via the Freighter browser extension.
 */

/** Check if Freighter wallet extension is available in the browser. */
export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const freighterApi = await import("@stellar/freighter-api");
    const { isConnected } = freighterApi;
    return await isConnected();
  } catch {
    return false;
  }
}

/** Request the user's public key from Freighter. */
export async function getPublicKey(): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { getAddress } = freighterApi;
  const result = await getAddress();
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.address;
}

/** Get the current network from Freighter. */
export async function getNetwork(): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { getNetwork: getFreighterNetwork } = freighterApi;
  const result = await getFreighterNetwork();
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.network;
}

/** Sign a transaction XDR with Freighter. */
export async function signTransaction(
  xdr: string,
  opts?: { network?: string; networkPassphrase?: string; accountToSign?: string }
): Promise<string> {
  const freighterApi = await import("@stellar/freighter-api");
  const { signTransaction: freighterSign } = freighterApi;
  const result = await freighterSign(xdr, {
    network: opts?.network,
    networkPassphrase: opts?.networkPassphrase,
    accountToSign: opts?.accountToSign,
  });
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.signedTxXdr;
}

/** Check if Freighter is connected and on the correct network. */
export async function checkWalletStatus(): Promise<{
  installed: boolean;
  connected: boolean;
  address: string | null;
  network: string | null;
}> {
  const installed = await isFreighterAvailable();
  if (!installed) {
    return { installed: false, connected: false, address: null, network: null };
  }

  try {
    const address = await getPublicKey();
    const network = await getNetwork();
    return { installed: true, connected: true, address, network };
  } catch {
    return { installed: true, connected: false, address: null, network: null };
  }
}

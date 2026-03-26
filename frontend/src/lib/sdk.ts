// SDK integration - placeholder for @privacylayer/sdk
// Will be replaced with actual SDK when available

export const SDK_CONFIG = {
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
}

export async function connectWallet() {
  // Freighter wallet integration
  if (typeof window !== 'undefined' && (window as any).freighterApi) {
    const api = (window as any).freighterApi
    const isConnected = await api.isConnected()
    if (!isConnected) {
      await api.connect()
    }
    const publicKey = await api.getPublicKey()
    return publicKey
  }
  throw new Error('Freighter wallet not installed')
}

export async function disconnectWallet() {
  // Freighter disconnect
  if (typeof window !== 'undefined' && (window as any).freighterApi) {
    await (window as any).freighterApi.disconnect()
  }
}
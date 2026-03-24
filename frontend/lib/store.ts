/**
 * Wallet State Management with Zustand
 * 
 * Provides centralized state management for wallet connection,
 * user public key, network selection, and loading states.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  connectWallet as connectWalletApi, 
  disconnectWallet as disconnectWalletApi,
  checkWalletInstalled,
  type WalletState 
} from './wallet';

interface WalletStore {
  // State
  connected: boolean;
  publicKey: string | null;
  network: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  publicKey: null,
  network: null,
  isLoading: false,
  error: null,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      connect: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Check if wallet is installed
          const isInstalled = await checkWalletInstalled();
          if (!isInstalled) {
            set({ 
              isLoading: false, 
              error: 'Freighter wallet is not installed. Please install it from https://www.freighter.app/' 
            });
            return;
          }
          
          // Connect to wallet
          const result = await connectWalletApi();
          
          if (result.error) {
            set({ 
              isLoading: false, 
              error: result.error,
              connected: false,
              publicKey: null,
              network: null,
            });
            return;
          }
          
          set({
            isLoading: false,
            connected: result.connected,
            publicKey: result.publicKey,
            network: result.network,
            error: null,
          });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
            connected: false,
            publicKey: null,
            network: null,
          });
        }
      },
      
      disconnect: () => {
        const result = disconnectWalletApi();
        set({
          connected: result.connected,
          publicKey: result.publicKey,
          network: result.network,
          error: null,
        });
      },
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      
      setError: (error: string | null) => set({ error }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'privacylayer-wallet',
      // Only persist these fields
      partialize: (state) => ({
        connected: state.connected,
        publicKey: state.publicKey,
        network: state.network,
      }),
    }
  )
);

// Selector hooks for better performance
export const useWalletConnected = () => useWalletStore((state) => state.connected);
export const useWalletPublicKey = () => useWalletStore((state) => state.publicKey);
export const useWalletNetwork = () => useWalletStore((state) => state.network);
export const useWalletLoading = () => useWalletStore((state) => state.isLoading);
export const useWalletError = () => useWalletStore((state) => state.error);
/**
 * Zustand store for wallet state management
 * @module lib/store
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

import type { Network, WalletError, WalletErrorCode } from "./wallet";

export interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  publicKey: string | null;
  network: Network;

  // Loading states
  isSigning: boolean;

  // Error state
  error: {
    code: WalletErrorCode | null;
    message: string | null;
  };

  // Actions
  setConnecting: (connecting: boolean) => void;
  setConnected: (publicKey: string, network: Network) => void;
  setDisconnected: () => void;
  setNetwork: (network: Network) => void;
  setSigning: (signing: boolean) => void;
  setError: (error: WalletError | null) => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      publicKey: null,
      network: "TESTNET",
      isSigning: false,
      error: {
        code: null,
        message: null,
      },

      // Actions
      setConnecting: (connecting: boolean) =>
        set({
          isConnecting: connecting,
          error: { code: null, message: null },
        }),

      setConnected: (publicKey: string, network: Network) =>
        set({
          isConnected: true,
          isConnecting: false,
          publicKey,
          network,
          error: { code: null, message: null },
        }),

      setDisconnected: () =>
        set({
          isConnected: false,
          isConnecting: false,
          publicKey: null,
          isSigning: false,
          error: { code: null, message: null },
        }),

      setNetwork: (network: Network) =>
        set({
          network,
        }),

      setSigning: (signing: boolean) =>
        set({
          isSigning: signing,
        }),

      setError: (error: WalletError | null) =>
        set({
          isConnecting: false,
          isSigning: false,
          error: error
            ? { code: error.code, message: error.message }
            : { code: null, message: null },
        }),

      clearError: () =>
        set({
          error: { code: null, message: null },
        }),
    }),
    {
      name: "privacylayer-wallet-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-sensitive state
        network: state.network,
        // Note: publicKey is intentionally NOT persisted for security
        // Users should re-connect after page reload
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectIsConnected = (state: WalletState) => state.isConnected;
export const selectPublicKey = (state: WalletState) => state.publicKey;
export const selectNetwork = (state: WalletState) => state.network;
export const selectError = (state: WalletState) => state.error;
export const selectIsConnecting = (state: WalletState) => state.isConnecting;
export const selectIsSigning = (state: WalletState) => state.isSigning;

/**
 * PrivacyLayer Global State Management (Zustand)
 *
 * Manages wallet connection state, pool data, transaction history,
 * and UI state across the application.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Note, PoolStats, DepositRecord, WithdrawalRecord } from "./sdk";

// ──────────────────────────────────────────────────────────────
// Wallet Store
// ──────────────────────────────────────────────────────────────

interface WalletState {
  /** Whether the wallet is connected */
  connected: boolean;
  /** The user's Stellar public key */
  address: string | null;
  /** The connected network (testnet/mainnet) */
  network: string | null;
  /** Whether a wallet operation is in progress */
  loading: boolean;
  /** Last wallet error */
  error: string | null;
  /** Connect wallet */
  connect: () => Promise<void>;
  /** Disconnect wallet */
  disconnect: () => void;
  /** Set error */
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  connected: false,
  address: null,
  network: null,
  loading: false,
  error: null,

  connect: async () => {
    set({ loading: true, error: null });
    try {
      const { checkWalletStatus } = await import("./wallet");
      const status = await checkWalletStatus();

      if (!status.installed) {
        throw new Error(
          "Freighter wallet extension not found. Please install it from freighter.app"
        );
      }

      if (!status.connected || !status.address) {
        // Try to request access
        const { getPublicKey, getNetwork } = await import("./wallet");
        const address = await getPublicKey();
        const network = await getNetwork();
        set({ connected: true, address, network, loading: false });
      } else {
        set({
          connected: true,
          address: status.address,
          network: status.network,
          loading: false,
        });
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      });
    }
  },

  disconnect: () => {
    set({ connected: false, address: null, network: null, error: null });
  },

  setError: (error) => set({ error }),
}));

// ──────────────────────────────────────────────────────────────
// Pool Store
// ──────────────────────────────────────────────────────────────

interface PoolState {
  /** Pool statistics */
  stats: PoolStats | null;
  /** Whether pool data is loading */
  loading: boolean;
  /** Last error */
  error: string | null;
  /** Refresh pool stats */
  refreshStats: () => Promise<void>;
}

export const usePoolStore = create<PoolState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  refreshStats: async () => {
    set({ loading: true, error: null });
    try {
      const { getPoolStats } = await import("./sdk");
      const stats = await getPoolStats();
      set({ stats, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch pool stats",
      });
    }
  },
}));

// ──────────────────────────────────────────────────────────────
// Notes Store (persisted to localStorage)
// ──────────────────────────────────────────────────────────────

interface NotesState {
  /** Saved deposit notes (encrypted in production) */
  notes: Array<{
    noteString: string;
    commitment: string;
    timestamp: number;
    denomination: string;
    spent: boolean;
  }>;
  /** Add a new note after deposit */
  addNote: (note: Note, denomination: string) => void;
  /** Mark a note as spent after withdrawal */
  markSpent: (commitment: string) => void;
  /** Remove a note */
  removeNote: (commitment: string) => void;
  /** Clear all notes */
  clearNotes: () => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (note, denomination) =>
        set((state) => ({
          notes: [
            ...state.notes,
            {
              noteString: note.noteString,
              commitment: note.commitment,
              timestamp: Date.now(),
              denomination,
              spent: false,
            },
          ],
        })),

      markSpent: (commitment) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.commitment === commitment ? { ...n, spent: true } : n
          ),
        })),

      removeNote: (commitment) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.commitment !== commitment),
        })),

      clearNotes: () => set({ notes: [] }),
    }),
    {
      name: "privacylayer-notes",
    }
  )
);

// ──────────────────────────────────────────────────────────────
// Transaction History Store
// ──────────────────────────────────────────────────────────────

interface HistoryState {
  deposits: DepositRecord[];
  withdrawals: WithdrawalRecord[];
  loading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  deposits: [],
  withdrawals: [],
  loading: false,
  error: null,

  refreshHistory: async () => {
    set({ loading: true, error: null });
    try {
      const { getTransactionHistory } = await import("./sdk");
      const history = await getTransactionHistory();
      set({
        deposits: history.deposits,
        withdrawals: history.withdrawals,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch history",
      });
    }
  },
}));

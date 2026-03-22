// ============================================================
// React Hook: usePrivacyLayer
// ============================================================
// Custom React hook for interacting with the PrivacyLayer contract.
// Provides state management for deposits, withdrawals, and pool monitoring.
//
// Usage:
//   const { deposit, withdraw, poolState, loading, error } = usePrivacyLayer({
//     contractId: "CABC123...",
//     network: "testnet",
//   });
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import {
  PrivacyLayerClient,
  ClientConfig,
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  Note,
  PoolState,
  PrivacyLayerEvent,
  Denomination,
  generateNote,
  serializeNote,
  deserializeNote,
  PrivacyLayerError,
  NetworkError,
} from "../../shared/privacy-layer-client";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface UsePrivacyLayerConfig {
  contractId: string;
  network: "testnet" | "mainnet";
  /** Custom RPC URL (overrides network preset) */
  rpcUrl?: string;
  /** Auto-poll pool state interval in ms (0 = disabled) */
  pollInterval?: number;
}

export interface UsePrivacyLayerReturn {
  /** Current pool state (null until first fetch) */
  poolState: PoolState | null;
  /** Recent contract events */
  events: PrivacyLayerEvent[];
  /** Whether an operation is in progress */
  loading: boolean;
  /** Last error message (null if no error) */
  error: string | null;
  /** Generate a new deposit note */
  createNote: (denomination: Denomination) => Promise<Note>;
  /** Execute a deposit (requires Freighter wallet) */
  deposit: (note: Note) => Promise<{ leafIndex: number; root: string }>;
  /** Execute a withdrawal with ZK proof */
  withdraw: (note: Note, recipient: string) => Promise<boolean>;
  /** Check if a specific nullifier has been spent */
  checkNullifier: (nullifierHash: string) => Promise<boolean>;
  /** Manually refresh pool state */
  refreshState: () => Promise<void>;
  /** Serialize a note for secure backup */
  backupNote: (note: Note) => string;
  /** Restore a note from its serialized form */
  restoreNote: (serialized: string) => Promise<Note>;
  /** Clear the current error */
  clearError: () => void;
}

// ──────────────────────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────────────────────

export function usePrivacyLayer(config: UsePrivacyLayerConfig): UsePrivacyLayerReturn {
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [events, setEvents] = useState<PrivacyLayerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<PrivacyLayerClient | null>(null);
  const stopEventsRef = useRef<(() => void) | null>(null);

  // Initialize client
  useEffect(() => {
    const networkConfig = config.network === "mainnet" ? MAINNET_CONFIG : TESTNET_CONFIG;
    const clientConfig: ClientConfig = {
      ...networkConfig,
      contractId: config.contractId,
      rpcUrl: config.rpcUrl || networkConfig.rpcUrl!,
      networkPassphrase: networkConfig.networkPassphrase!,
    };

    clientRef.current = new PrivacyLayerClient(clientConfig);

    // Subscribe to events
    stopEventsRef.current = clientRef.current.subscribeToEvents((event) => {
      setEvents((prev) => [...prev.slice(-99), event]);
    });

    return () => {
      stopEventsRef.current?.();
    };
  }, [config.contractId, config.network, config.rpcUrl]);

  // Auto-poll pool state
  useEffect(() => {
    if (!config.pollInterval || config.pollInterval <= 0) return;

    const interval = setInterval(async () => {
      try {
        if (clientRef.current) {
          const state = await clientRef.current.getPoolState();
          setPoolState(state);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, config.pollInterval);

    return () => clearInterval(interval);
  }, [config.pollInterval]);

  // ── Actions ──────────────────────────────────────────────

  const createNote = useCallback(async (denomination: Denomination): Promise<Note> => {
    setLoading(true);
    setError(null);
    try {
      const note = await generateNote(denomination);
      return note;
    } catch (err) {
      const msg = `Failed to generate note: ${(err as Error).message}`;
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deposit = useCallback(
    async (note: Note): Promise<{ leafIndex: number; root: string }> => {
      setLoading(true);
      setError(null);
      try {
        if (!clientRef.current) throw new Error("Client not initialized");

        // In a real app, you would get the Keypair from Freighter:
        //
        // import freighter from "@stellar/freighter-api";
        // const { publicKey } = await freighter.getAddress();
        // const signedTx = await freighter.signTransaction(tx.toXDR(), {
        //   networkPassphrase: config.networkPassphrase,
        // });
        //
        // For this example, we demonstrate the flow structure:
        throw new Error(
          "Deposit requires wallet integration (Freighter). " +
          "See the deposit() method in usePrivacyLayer for integration patterns."
        );
      } catch (err) {
        const msg = err instanceof PrivacyLayerError
          ? `Contract error [${err.code}]: ${err.message}`
          : (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const withdraw = useCallback(
    async (note: Note, recipient: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        if (!clientRef.current) throw new Error("Client not initialized");

        const result = await clientRef.current.withdraw({
          note,
          recipient,
        });

        // Refresh state after successful withdrawal
        const state = await clientRef.current.getPoolState();
        setPoolState(state);

        return result;
      } catch (err) {
        const msg = err instanceof PrivacyLayerError
          ? `Contract error [${err.code}]: ${err.message}`
          : (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const checkNullifier = useCallback(async (nullifierHash: string): Promise<boolean> => {
    if (!clientRef.current) throw new Error("Client not initialized");
    return clientRef.current.isSpent(nullifierHash);
  }, []);

  const refreshState = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (!clientRef.current) throw new Error("Client not initialized");
      const state = await clientRef.current.getPoolState();
      setPoolState(state);
    } catch (err) {
      setError(`Failed to refresh pool state: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const backupNote = useCallback((note: Note): string => {
    return serializeNote(note);
  }, []);

  const restoreNote = useCallback(async (serialized: string): Promise<Note> => {
    return deserializeNote(serialized);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    poolState,
    events,
    loading,
    error,
    createNote,
    deposit,
    withdraw,
    checkNullifier,
    refreshState,
    backupNote,
    restoreNote,
    clearError,
  };
}

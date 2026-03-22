// ============================================================
// Vue 3 Composable: usePrivacyLayer
// ============================================================
// Provides reactive state management for PrivacyLayer contract
// interactions using Vue 3 Composition API.
//
// Usage:
//   import { usePrivacyLayer } from './composables/usePrivacyLayer';
//
//   const {
//     poolState, loading, error,
//     deposit, withdraw, refreshState,
//   } = usePrivacyLayer({
//     contractId: "CABC123...",
//     network: "testnet",
//   });
// ============================================================

import { ref, reactive, onMounted, onUnmounted, computed, Ref } from "vue";
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
  DENOMINATION_AMOUNTS,
} from "../../shared/privacy-layer-client";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface PrivacyLayerConfig {
  contractId: string;
  network: "testnet" | "mainnet";
  rpcUrl?: string;
  pollInterval?: number;
}

// ──────────────────────────────────────────────────────────────
// Composable
// ──────────────────────────────────────────────────────────────

export function usePrivacyLayer(config: PrivacyLayerConfig) {
  // ── Reactive State ───────────────────────────────────────

  const poolState: Ref<PoolState | null> = ref(null);
  const events: Ref<PrivacyLayerEvent[]> = ref([]);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);
  const currentNote: Ref<Note | null> = ref(null);

  let client: PrivacyLayerClient | null = null;
  let stopEvents: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // ── Computed ─────────────────────────────────────────────

  const isPoolPaused = computed(() => poolState.value?.config.paused ?? false);
  const depositCount = computed(() => poolState.value?.depositCount ?? 0);
  const denominationLabel = computed(() => {
    if (!poolState.value) return "—";
    return DENOMINATION_AMOUNTS[poolState.value.config.denomination];
  });
  const hasNote = computed(() => currentNote.value !== null);

  // ── Lifecycle ────────────────────────────────────────────

  onMounted(() => {
    const networkConfig = config.network === "mainnet" ? MAINNET_CONFIG : TESTNET_CONFIG;
    const clientConfig: ClientConfig = {
      ...networkConfig,
      contractId: config.contractId,
      rpcUrl: config.rpcUrl || networkConfig.rpcUrl!,
      networkPassphrase: networkConfig.networkPassphrase!,
    };

    client = new PrivacyLayerClient(clientConfig);

    // Subscribe to events
    stopEvents = client.subscribeToEvents((event) => {
      events.value = [...events.value.slice(-99), event];
    });

    // Initial state fetch
    refreshState();

    // Start polling if configured
    if (config.pollInterval && config.pollInterval > 0) {
      pollTimer = setInterval(refreshState, config.pollInterval);
    }
  });

  onUnmounted(() => {
    stopEvents?.();
    if (pollTimer) clearInterval(pollTimer);
  });

  // ── Actions ──────────────────────────────────────────────

  async function createNote(denomination: Denomination): Promise<Note> {
    loading.value = true;
    error.value = null;
    try {
      const note = await generateNote(denomination);
      currentNote.value = note;
      return note;
    } catch (err) {
      error.value = `Failed to generate note: ${(err as Error).message}`;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deposit(note: Note): Promise<{ leafIndex: number; root: string }> {
    loading.value = true;
    error.value = null;
    try {
      if (!client) throw new Error("Client not initialized");

      // In a production Vue app, you would integrate with Freighter:
      //
      // import freighter from "@stellar/freighter-api";
      // const { publicKey } = await freighter.getAddress();
      //
      // The deposit flow:
      // 1. Generate note (createNote above)
      // 2. Build transaction with client
      // 3. Sign with Freighter
      // 4. Submit to network

      throw new Error(
        "Deposit requires Freighter wallet integration. " +
        "See the Vue example README for setup instructions."
      );
    } catch (err) {
      error.value = err instanceof PrivacyLayerError
        ? `Contract error [${err.code}]: ${err.message}`
        : (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function withdraw(noteStr: string, recipient: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      if (!client) throw new Error("Client not initialized");

      const note = await deserializeNote(noteStr);
      const result = await client.withdraw({ note, recipient });

      // Clear note after successful withdrawal
      currentNote.value = null;

      // Refresh pool state
      await refreshState();

      return result;
    } catch (err) {
      error.value = err instanceof PrivacyLayerError
        ? `Contract error [${err.code}]: ${err.message}`
        : (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function checkNullifier(nullifierHash: string): Promise<boolean> {
    if (!client) throw new Error("Client not initialized");
    return client.isSpent(nullifierHash);
  }

  async function refreshState(): Promise<void> {
    try {
      if (!client) return;
      poolState.value = await client.getPoolState();
    } catch (err) {
      console.error("[PrivacyLayer] State refresh error:", err);
    }
  }

  function backupNote(note: Note): string {
    return serializeNote(note);
  }

  function clearError(): void {
    error.value = null;
  }

  // ── Return ───────────────────────────────────────────────

  return {
    // State
    poolState,
    events,
    loading,
    error,
    currentNote,
    // Computed
    isPoolPaused,
    depositCount,
    denominationLabel,
    hasNote,
    // Actions
    createNote,
    deposit,
    withdraw,
    checkNullifier,
    refreshState,
    backupNote,
    clearError,
  };
}

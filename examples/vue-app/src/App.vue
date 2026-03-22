<!--
  ============================================================
  PrivacyLayer Vue 3 Example — Main Application
  ============================================================
  Demonstrates a complete Vue 3 integration with PrivacyLayer:
  - Pool state monitoring with reactive updates
  - Deposit flow with note generation and backup
  - Withdrawal flow with note restoration
  - Event log with real-time updates
  ============================================================
-->

<template>
  <div id="app">
    <header>
      <h1>PrivacyLayer</h1>
      <p>Shielded transactions on Stellar/Soroban</p>
      <span class="network-badge">{{ network.toUpperCase() }}</span>
    </header>

    <!-- Error Banner -->
    <div v-if="error" class="error-banner" role="alert">
      <p>{{ error }}</p>
      <button @click="clearError">Dismiss</button>
    </div>

    <main>
      <!-- Pool Status -->
      <section class="pool-status">
        <h2>Pool Status</h2>
        <div v-if="poolState">
          <table>
            <tr>
              <td>Deposits:</td>
              <td>{{ depositCount }}</td>
            </tr>
            <tr>
              <td>Denomination:</td>
              <td>{{ denominationLabel }}</td>
            </tr>
            <tr>
              <td>Paused:</td>
              <td>{{ isPoolPaused ? 'Yes' : 'No' }}</td>
            </tr>
            <tr>
              <td>Current Root:</td>
              <td :title="poolState.currentRoot">
                {{ poolState.currentRoot.slice(0, 16) }}...
              </td>
            </tr>
          </table>
        </div>
        <p v-else>Loading pool state...</p>
        <button @click="refreshState" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </section>

      <!-- Deposit Panel -->
      <section class="deposit-panel">
        <h2>Deposit</h2>
        <p>
          Select a denomination and deposit into the shielded pool.
          A note will be generated that you must save securely.
        </p>

        <label for="denomination">Denomination:</label>
        <select id="denomination" v-model="selectedDenomination">
          <option
            v-for="(label, key) in denominations"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>

        <button
          @click="handleDeposit"
          :disabled="loading"
        >
          {{ loading ? 'Processing...' : 'Generate Note & Deposit' }}
        </button>
      </section>

      <!-- Note Backup (shown after note generation) -->
      <section v-if="hasNote && noteBackupStr" class="note-backup" role="alert">
        <h3>Save Your Note!</h3>
        <p>
          <strong>WARNING:</strong> This note is the ONLY way to withdraw your
          funds. If you lose it, your deposit is permanently locked.
        </p>

        <div class="note-details">
          <p>Denomination: {{ denominationLabel }}</p>
          <p>Commitment: {{ currentNote?.commitment.slice(0, 16) }}...</p>
          <p v-if="currentNote?.leafIndex !== undefined">
            Leaf Index: {{ currentNote.leafIndex }}
          </p>
        </div>

        <div class="backup-string">
          <code>{{ noteBackupStr }}</code>
          <button @click="copyBackup">
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </section>

      <!-- Withdraw Panel -->
      <section class="withdraw-panel">
        <h2>Withdraw</h2>
        <p>
          Paste your note backup string and specify a recipient address.
          A ZK proof will be generated to authorize the withdrawal.
        </p>

        <label for="note-input">Note Backup:</label>
        <textarea
          id="note-input"
          v-model="withdrawNoteStr"
          placeholder="privacylayer-note-v1:..."
          rows="3"
        />

        <label for="recipient-input">Recipient Address:</label>
        <input
          id="recipient-input"
          type="text"
          v-model="withdrawRecipient"
          placeholder="G..."
        />

        <button
          @click="handleWithdraw"
          :disabled="loading || !withdrawNoteStr || !withdrawRecipient"
        >
          {{ loading ? 'Generating Proof...' : 'Withdraw with ZK Proof' }}
        </button>
      </section>

      <!-- Event Log -->
      <section class="event-log">
        <h2>Event Log</h2>
        <p v-if="events.length === 0">
          No events yet. Events will appear here as they occur.
        </p>
        <ul v-else>
          <li
            v-for="(event, i) in recentEvents"
            :key="`${event.ledger}-${i}`"
          >
            <span :class="['event-type', `event-${event.type}`]">
              {{ event.type.toUpperCase() }}
            </span>
            <span class="event-ledger">Ledger #{{ event.ledger }}</span>
          </li>
        </ul>
      </section>
    </main>

    <footer>
      <p>
        PrivacyLayer Vue Example — MIT License |
        <a href="https://github.com/ANAVHEOBA/PrivacyLayer">GitHub</a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { usePrivacyLayer } from "./composables/usePrivacyLayer";
import {
  Denomination,
  DENOMINATION_AMOUNTS,
} from "../shared/privacy-layer-client";

// ── Configuration ──────────────────────────────────────────

const contractId = import.meta.env.VITE_CONTRACT_ID || "YOUR_CONTRACT_ID_HERE";
const network = (import.meta.env.VITE_NETWORK as "testnet" | "mainnet") || "testnet";

// ── Composable ─────────────────────────────────────────────

const {
  poolState,
  events,
  loading,
  error,
  currentNote,
  isPoolPaused,
  depositCount,
  denominationLabel,
  hasNote,
  createNote,
  deposit,
  withdraw,
  refreshState,
  backupNote,
  clearError,
} = usePrivacyLayer({
  contractId,
  network,
  pollInterval: 10000,
});

// ── Local State ────────────────────────────────────────────

const denominations = DENOMINATION_AMOUNTS;
const selectedDenomination = ref<Denomination>(Denomination.Xlm10);
const noteBackupStr = ref("");
const copied = ref(false);
const withdrawNoteStr = ref("");
const withdrawRecipient = ref("");

// ── Computed ───────────────────────────────────────────────

const recentEvents = computed(() => {
  return [...events.value].slice(-10).reverse();
});

// ── Handlers ───────────────────────────────────────────────

async function handleDeposit() {
  try {
    const note = await createNote(selectedDenomination.value);
    noteBackupStr.value = backupNote(note);
    await deposit(note);
  } catch (err) {
    console.error("Deposit failed:", err);
  }
}

async function handleWithdraw() {
  try {
    const success = await withdraw(withdrawNoteStr.value.trim(), withdrawRecipient.value);
    if (success) {
      withdrawNoteStr.value = "";
      withdrawRecipient.value = "";
      noteBackupStr.value = "";
    }
  } catch (err) {
    console.error("Withdrawal failed:", err);
  }
}

async function copyBackup() {
  await navigator.clipboard.writeText(noteBackupStr.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<style scoped>
.pool-status, .deposit-panel, .withdraw-panel, .note-backup, .event-log {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #333;
  border-radius: 8px;
}

.error-banner {
  background: #ff4444;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-backup {
  background: #2a1a00;
  border-color: #ff8800;
}

.backup-string {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.backup-string code {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.5rem;
  background: #111;
  border-radius: 4px;
}

.network-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #4444ff;
  border-radius: 4px;
  font-size: 0.8rem;
}

.event-type {
  font-weight: bold;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}

.event-deposit { background: #004400; }
.event-withdraw { background: #440044; }
.event-pause { background: #444400; }
</style>

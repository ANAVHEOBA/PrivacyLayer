<!--
  PrivateTransfer.vue — Vue 3 component for PrivacyLayer private transfers.
  Uses Composition API with reactive state and async operations.
-->
<template>
  <div class="privacy-transfer">
    <h2>🔐 Private Transfer</h2>

    <!-- Error -->
    <div v-if="error" class="alert alert-error">
      {{ error }}
      <button @click="error = null">✕</button>
    </div>

    <!-- Success -->
    <div v-if="lastTx" class="alert alert-success">
      Last tx: <code>{{ lastTx }}</code>
    </div>

    <!-- Deposit -->
    <fieldset>
      <legend><strong>Deposit</strong></legend>
      <p class="hint">Send funds into the privacy pool. You'll receive a secret note.</p>
      <div class="row">
        <input
          v-model.number="depositAmount"
          type="number"
          placeholder="Amount (SOL)"
          :disabled="loading"
        />
        <button @click="handleDeposit" :disabled="loading || !depositAmount">
          {{ loading ? 'Processing…' : 'Deposit' }}
        </button>
      </div>
    </fieldset>

    <!-- Notes -->
    <fieldset v-if="notes.length > 0">
      <legend><strong>Your Notes ({{ notes.length }})</strong></legend>
      <p class="hint">Select a note to withdraw privately.</p>
      <div
        v-for="note in notes"
        :key="note.commitment"
        class="note-card"
        :class="{ selected: selectedNote?.commitment === note.commitment }"
        @click="selectedNote = note"
      >
        <strong>{{ (note.amount / 1_000_000_000).toFixed(2) }} SOL</strong>
        <br />
        <code>{{ note.commitment }}</code>
      </div>
    </fieldset>

    <!-- Withdraw -->
    <fieldset v-if="selectedNote">
      <legend><strong>Withdraw</strong></legend>
      <p class="hint">
        Withdraw {{ (selectedNote.amount / 1_000_000_000).toFixed(2) }} SOL to a new address.
      </p>
      <div class="row">
        <input
          v-model="recipient"
          type="text"
          placeholder="Recipient wallet address"
          :disabled="loading"
        />
        <button @click="handleWithdraw" :disabled="loading || !recipient" class="btn-withdraw">
          {{ loading ? 'Proving…' : 'Withdraw' }}
        </button>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface PrivateNote {
  amount: number;
  commitment: string;
  nullifier: string;
  secret: Uint8Array;
  depositTx?: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const loading = ref(false);
const error = ref<string | null>(null);
const lastTx = ref<string | null>(null);
const notes = reactive<PrivateNote[]>([]);
const depositAmount = ref<number | null>(null);
const recipient = ref('');
const selectedNote = ref<PrivateNote | null>(null);

async function handleDeposit() {
  if (!depositAmount.value || depositAmount.value <= 0) return;
  loading.value = true;
  error.value = null;

  try {
    const amount = depositAmount.value * 1_000_000_000;
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const nullifierBytes = crypto.getRandomValues(new Uint8Array(32));

    const commitment = `0x${toHex(secret).slice(0, 16)}`;
    const nullifier = `0x${toHex(nullifierBytes).slice(0, 16)}`;

    // In production: submit deposit tx to Solana program
    const tx = `sim_deposit_${Date.now()}`;

    notes.push({ amount, commitment, nullifier, secret, depositTx: tx });
    lastTx.value = tx;
    depositAmount.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Deposit failed';
  } finally {
    loading.value = false;
  }
}

async function handleWithdraw() {
  if (!selectedNote.value || !recipient.value) return;
  loading.value = true;
  error.value = null;

  try {
    // In production: generate ZK proof and submit withdrawal tx
    const tx = `sim_withdraw_${Date.now()}`;

    const idx = notes.findIndex((n) => n.commitment === selectedNote.value!.commitment);
    if (idx >= 0) notes.splice(idx, 1);

    lastTx.value = tx;
    selectedNote.value = null;
    recipient.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Withdrawal failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.privacy-transfer {
  max-width: 480px;
  margin: 0 auto;
  font-family: system-ui, sans-serif;
}
fieldset {
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.hint { font-size: 14px; color: #666; }
.row { display: flex; gap: 8px; }
input { flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
button { padding: 8px 16px; border-radius: 4px; background: #7c3aed; color: #fff; border: none; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-withdraw { background: #059669; }
.note-card { padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 8px; cursor: pointer; }
.note-card.selected { border: 2px solid #7c3aed; }
.note-card code { font-size: 12px; color: #888; }
.alert { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
.alert-error { color: #dc2626; background: #fef2f2; }
.alert-success { color: #16a34a; background: #f0fdf4; }
</style>

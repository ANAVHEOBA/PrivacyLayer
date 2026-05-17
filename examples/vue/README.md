# PrivacyLayer Vue Integration Example

Complete Vue 3 integration example for PrivacyLayer shielded pool.

## Features

- Composition API with composables
- Deposit and withdraw flows
- Wallet connection (Freighter)
- Reactive balance tracking

## Installation

```bash
npm install @privacylayer/sdk
```

## Usage

```vue
<script setup>
import { ref } from 'vue';
import { usePrivacyLayer, useDeposit, useWithdraw } from '@privacylayer/sdk/vue';

const { connect, isConnected } = usePrivacyLayer();
const { deposit, status: depositStatus } = useDeposit();
const { withdraw, status: withdrawStatus } = useWithdraw();

const amount = ref('');
const asset = ref('XLM');

const handleDeposit = async () => {
  await deposit(amount.value, asset.value);
};

const handleWithdraw = async (note, recipient) => {
  await withdraw(note, recipient);
};
</script>

<template>
  <div class="privacy-layer-demo">
    <button v-if="!isConnected" @click="connect">Connect Freighter</button>
    
    <section class="deposit">
      <h2>Deposit</h2>
      <input v-model="amount" type="number" placeholder="Amount" />
      <select v-model="asset">
        <option value="XLM">XLM</option>
        <option value="USDC">USDC</option>
      </select>
      <button @click="handleDeposit" :disabled="depositStatus === 'pending'">
        {{ depositStatus === 'pending' ? 'Depositing...' : 'Deposit' }}
      </button>
    </section>
  </div>
</template>
```

## Full Example

See `App.vue` for complete implementation.

## License

MIT

# PrivacyLayer Vue Integration Example

This example demonstrates how to integrate PrivacyLayer SDK into a Vue 3 application.

## Installation

```bash
npm install @privacylayer/sdk
```

## Usage

```vue
<template>
  <div>
    <h1>PrivacyLayer Vue Example</h1>
    <p>Balance: {{ balance }} USDC</p>
    <button @click="handleDeposit">Deposit 100 USDC</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { PrivacyLayer, Network } from '@privacylayer/sdk';

const client = ref(null);
const balance = ref(0);

onMounted(async () => {
  const pl = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: import.meta.env.VITE_PRIVACY_API_KEY
  });
  client.value = pl;
  
  const bal = await pl.getBalance();
  balance.value = bal.total;
});

const handleDeposit = async () => {
  if (!client.value) return;
  const result = await client.value.deposit({
    amount: 100,
    asset: 'USDC'
  });
  console.log('Deposit complete:', result.noteId);
};
</script>
```

## Running the Example

```bash
cd examples/vue-example
npm install
npm run dev
```

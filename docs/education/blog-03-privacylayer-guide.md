# Getting Started with PrivacyLayer: A Developer's Guide

## Introduction

PrivacyLayer brings zero-knowledge privacy to the Stellar blockchain, enabling developers to build applications with transactional privacy without sacrificing the benefits of public blockchain infrastructure. This guide walks you through integrating PrivacyLayer into your applications, from basic setup to advanced patterns.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 16+ or **Python** 3.8+
- **Stellar SDK** familiarity
- Basic understanding of **zero-knowledge proofs**
- A **Stellar testnet account** with lumens

---

## Installation

### JavaScript/TypeScript

```bash
npm install @privacylayer/sdk
# or
yarn add @privacylayer/sdk
```

### Python

```bash
pip install privacylayer-sdk
```

---

## Quick Start

### 1. Initialize the SDK

```javascript
import { PrivacyLayerSDK } from '@privacylayer/sdk';

const sdk = new PrivacyLayerSDK({
  network: 'testnet', // or 'mainnet'
  horizonUrl: 'https://horizon-testnet.stellar.org',
  privacyLayerContract: 'GDQX...', // Contract address
});

// Initialize with your Stellar keypair
await sdk.initialize({
  secretKey: 'S...', // Your secret key
});
```

```python
from privacylayer_sdk import PrivacyLayerSDK

sdk = PrivacyLayerSDK(
    network='testnet',
    horizon_url='https://horizon-testnet.stellar.org',
    contract_address='GDQX...'
)

sdk.initialize(secret_key='S...')
```

### 2. Create a Shielded Account

```javascript
// Generate a new shielded account
const shieldedAccount = await sdk.createShieldedAccount();

console.log('Shielded Address:', shieldedAccount.address);
console.log('Viewing Key:', shieldedAccount.viewingKey);
console.log('Spending Key:', shieldedAccount.spendingKey); // Keep secret!
```

```python
shielded_account = sdk.create_shielded_account()

print(f"Shielded Address: {shielded_account.address}")
print(f"Viewing Key: {shielded_account.viewing_key}")
print(f"Spending Key: {shielded_account.spending_key}")  # Keep secret!
```

### 3. Deposit Funds

```javascript
// Deposit XLM into the shielded pool
const depositTx = await sdk.deposit({
  asset: 'XLM',
  amount: '100.00',
  memo: 'Initial deposit',
});

console.log('Deposit Transaction:', depositTx.hash);
console.log('Note:', depositTx.note); // Save this to spend later
```

```python
deposit_tx = sdk.deposit(
    asset='XLM',
    amount='100.00',
    memo='Initial deposit'
)

print(f"Deposit Transaction: {deposit_tx.hash}")
print(f"Note: {deposit_tx.note}")  # Save this to spend later
```

### 4. Shielded Transfer

```javascript
// Send funds privately to another shielded address
const transferTx = await sdk.shieldedTransfer({
  to: 'shielded_address_recipient...',
  amount: '50.00',
  asset: 'XLM',
  memo: 'Payment for services',
});

console.log('Transfer Transaction:', transferTx.hash);
```

```python
transfer_tx = sdk.shielded_transfer(
    to='shielded_address_recipient...',
    amount='50.00',
    asset='XLM',
    memo='Payment for services'
)

print(f"Transfer Transaction: {transfer_tx.hash}")
```

### 5. Withdraw to Transparent Address

```javascript
// Withdraw from shielded pool to regular Stellar address
const withdrawTx = await sdk.withdraw({
  to: 'GDQX...', // Regular Stellar address
  amount: '25.00',
  asset: 'XLM',
});

console.log('Withdrawal Transaction:', withdrawTx.hash);
```

```python
withdraw_tx = sdk.withdraw(
    to='GDQX...',  # Regular Stellar address
    amount='25.00',
    asset='XLM'
)

print(f"Withdrawal Transaction: {withdraw_tx.hash}")
```

---

## Core Concepts

### Shielded Pools

PrivacyLayer operates through **shielded pools** — smart contract-managed pools of assets where transaction details are encrypted:

```
┌─────────────────────────────────────────┐
│           Shielded Pool                 │
│                                         │
│   Commitment 1: 0xabc... (encrypted)   │
│   Commitment 2: 0xdef... (encrypted)   │
│   Commitment 3: 0xghi... (encrypted)   │
│   ...                                   │
│                                         │
│   Merkle Root: 0xroot... (public)      │
│   Nullifier List: [0xn1, 0xn2, ...]    │
└─────────────────────────────────────────┘
```

**How It Works:**
1. Users deposit assets and receive encrypted "notes"
2. Notes can be spent by proving ownership (via ZK proof)
3. Spent notes are marked via nullifiers (public)
4. New notes are created for recipients (encrypted)

### Notes

Notes are the fundamental unit of value in PrivacyLayer:

```javascript
interface Note {
  // Commitment (public)
  commitment: string;        // Hash of (amount, recipient, randomness)
  
  // Secret values (private)
  amount: string;           // Decrypted amount
  asset: string;            // Asset code
  recipient: string;        // Shielded address
  randomness: string;       // Blinding factor
  
  // Spending key
  spendingKey: string;      // Required to spend
}
```

**Note Security:**
- Notes must be stored securely by the owner
- Losing a note means losing access to funds
- Notes can be backed up using the viewing key

### Viewing Keys vs Spending Keys

PrivacyLayer uses a dual-key system:

| Key Type | Purpose | Can View Balance | Can Spend |
|----------|---------|------------------|-----------|
| **Viewing Key** | Decrypt transaction history | Yes | No |
| **Spending Key** | Sign transactions | Yes | Yes |

```javascript
// Generate from seed
const { viewingKey, spendingKey } = sdk.deriveKeys(seed);

// Viewing key can be shared for auditing
// Spending key must NEVER be shared
```

---

## Advanced Patterns

### Pattern 1: Multi-Asset Support

PrivacyLayer supports multiple assets in the same pool:

```javascript
// Deposit USDC
const usdcDeposit = await sdk.deposit({
  asset: 'USDC-GBD...',
  amount: '1000.00',
});

// Deposit BTC anchor representation
const btcDeposit = await sdk.deposit({
  asset: 'BTC-GBD...',
  amount: '0.5',
});

// Query all balances
const balances = await sdk.getShieldedBalances();
// Returns: { 'XLM': '50.00', 'USDC': '1000.00', 'BTC': '0.5' }
```

### Pattern 2: Batch Operations

Combine multiple operations into a single transaction:

```javascript
const batchTx = await sdk.batch({
  operations: [
    { type: 'deposit', asset: 'XLM', amount: '100' },
    { type: 'transfer', to: 'addr1', amount: '30', asset: 'XLM' },
    { type: 'transfer', to: 'addr2', amount: '20', asset: 'XLM' },
    { type: 'withdraw', to: 'GDQX...', amount: '50', asset: 'XLM' },
  ],
});

// All operations happen atomically in one transaction
```

### Pattern 3: Payment Channels

For high-frequency micropayments:

```javascript
// Open a payment channel
const channel = await sdk.openPaymentChannel({
  counterparty: 'shielded_address...',
  capacity: '1000.00',
  asset: 'XLM',
});

// Off-chain payments (instant, no fees)
await channel.sendPayment({
  amount: '0.01',
  memo: 'Micropayment 1',
});

await channel.sendPayment({
  amount: '0.01',
  memo: 'Micropayment 2',
});

// ... thousands of payments later ...

// Close channel and settle on-chain
await channel.close();
```

### Pattern 4: Integration with dApps

```javascript
// React hook for PrivacyLayer
import { usePrivacyLayer } from '@privacylayer/react';

function PrivatePaymentComponent() {
  const { sdk, balance, deposit, transfer } = usePrivacyLayer();
  
  const handlePayment = async () => {
    await transfer({
      to: recipientAddress,
      amount: amount,
      asset: 'XLM',
    });
  };
  
  return (
    <div>
      <p>Shielded Balance: {balance} XLM</p>
      <button onClick={handlePayment}>Send Private Payment</button>
    </div>
  );
}
```

---

##
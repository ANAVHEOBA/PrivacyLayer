# Example: Private Payments

> Send and receive USDC privately on Stellar.

## Overview

This example demonstrates a simple private payment app using PrivacyLayer.

## Features

- Shield USDC into the privacy pool
- Send private payments to any address
- Unshield back to public USDC
- View transaction history

## Quick Start

```bash
cd examples/private-payments
npm install
npm run dev
```

## Code Example

```javascript
import { PrivacyLayer } from '@privacylayer/sdk';

// Initialize
const pl = new PrivacyLayer({
  network: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org'
});

// Connect wallet
await pl.connect(secretKey);

// Shield 100 USDC
const shieldTx = await pl.shield({
  asset: 'USDC',
  amount: '100',
  from: publicKey
});

// Send private payment
const privateTx = await pl.sendPrivate({
  to: 'G...
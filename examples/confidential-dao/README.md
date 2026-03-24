# Example: Confidential DAO

> Manage DAO treasury with private transactions.

## Overview

This example demonstrates a DAO with privacy-preserving treasury management.

## Features

- Private payroll distribution
- Shielded grant payments
- Anonymous contributor rewards
- Public reporting with private details

## Quick Start

```bash
cd examples/confidential-dao
npm install
npm run dev
```

## How It Works

1. **Treasury:** DAO funds are held in shielded pool
2. **Proposals:** Members vote on spending proposals
3. **Execution:** Approved payments are sent privately
4. **Reporting:** Public reports show totals, not individual amounts

## Code Example

```javascript
import { PrivacyLayer } from '@privacylayer/sdk';

// Initialize DAO treasury
const treasury = await pl.createTreasury({
  name: 'PrivacyDAO Treasury',
  threshold: 3, // 3-of-5 multisig
  signers: [key1, key2, key3, key4, key5]
});

// Create payroll proposal
const proposal = await treasury.createProposal({
  type: 'payroll',
  recipients: [
    { address: 'G...alice...', amount: '5000' },
    { address: 'G...bob...', amount: '6000' }
  ],
  asset: 'USDC'
});

// Sign proposal (as one of the multisig)
await treasury.sign(proposal.id);

// Execute after threshold reached
await treasury.execute(proposal.id);

// Generate public report
const report = await treasury.generateReport({
  period: '2026-01',
  includePrivate: false // Public version
});
```

## Learn More

See full documentation at [docs.privacylayer.io](https://docs.privacylayer.io)

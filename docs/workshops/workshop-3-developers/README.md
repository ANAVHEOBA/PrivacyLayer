# Workshop 3: Developer Integration

**Duration:** 180 minutes (3 hours)  
**Level:** Advanced (Developers)  
**Prerequisites:** Workshop 1 + JavaScript/TypeScript experience  
**Max Participants:** 20

---

## Workshop Overview

Hands-on workshop for developers who want to integrate PrivacyLayer into their applications. Covers SDK usage, best practices, and real-world integration patterns.

### Learning Objectives

By the end of this workshop, participants will be able to:
- ✅ Install and configure PrivacyLayer SDK
- ✅ Implement deposit and withdraw flows
- ✅ Handle errors and edge cases
- ✅ Integrate with existing applications
- ✅ Deploy to production safely

---

## Agenda

| Time | Activity | Format |
|------|----------|--------|
| 0:00-0:30 | SDK Overview & Setup | Presentation + Demo |
| 0:30-1:00 | Hands-on: Basic Integration | Coding Exercise |
| 1:00-1:15 | Break | - |
| 1:15-1:45 | Advanced SDK Features | Presentation + Examples |
| 1:45-2:30 | Hands-on: Full Integration | Coding Exercise |
| 2:30-2:50 | Deployment & Security | Discussion |
| 2:50-3:00 | Q&A + Next Steps | Discussion |

---

## Prerequisites Setup

**Before the workshop, participants should:**

```bash
# 1. Install Node.js 18+
node --version  # Should be v18 or higher

# 2. Install dependencies
npm install @privacylayer/sdk ethers@6

# 3. Clone example repo
git clone https://github.com/ANAVHEOBA/PrivacyLayer-examples
cd PrivacyLayer-examples/react-demo
npm install

# 4. Get testnet XLM
# Visit: https://laboratory.stellar.org
```

**Provide checklist in pre-workshop email.**

---

## Module 1: SDK Overview

### Installation

```bash
npm install @privacylayer/sdk
```

### Basic Setup

```typescript
import { PrivacyLayerSDK } from '@privacylayer/sdk';
import { FreighterWallet } from '@privacylayer/sdk/wallets/freighter';

// Initialize SDK
const sdk = new PrivacyLayerSDK({
  network: 'testnet', // or 'mainnet'
  rpcUrl: 'https://soroban-test.stellar.org',
});

// Connect wallet
const wallet = new FreighterWallet();
await wallet.connect();
```

### Core Methods

```typescript
// Deposit
const result = await sdk.deposit(wallet, '10', 'XLM');
console.log(result.note); // Save this!

// Withdraw
const withdrawal = await sdk.withdraw(wallet, note, recipientAddress);

// Check balance
const balance = await sdk.getBalance(wallet);
console.log(balance.xlm, balance.usdc);

// Sync Merkle tree
const sync = await sdk.syncMerkleTree();
console.log(`Synced ${sync.leaves} leaves`);
```

---

## Module 2: Hands-on Exercise 1

### Exercise: Build a Deposit Form

**Task:** Create a React component that allows users to deposit to PrivacyLayer.

**Starter Code:**
```tsx
import React, { useState } from 'react';
import { PrivacyLayerSDK } from '@privacylayer/sdk';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('XLM');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement deposit logic
  };

  return (
    <form onSubmit={handleDeposit}>
      {/* TODO: Build form UI */}
    </form>
  );
}
```

**Requirements:**
- Amount input (number)
- Asset selector (XLM/USDC)
- Deposit button (disabled when pending)
- Status display (pending/success/error)
- Note display with copy button
- Error handling

**Solution:** (Provide after 20 minutes)
```tsx
const handleDeposit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus('pending');
  setError('');

  try {
    const result = await sdk.deposit(wallet, amount, asset);
    setNote(result.note);
    setStatus('success');
  } catch (err) {
    setError(err.message);
    setStatus('error');
  }
};
```

---

## Module 3: Advanced SDK Features

### Event Listeners

```typescript
sdk.on('deposit', (event) => {
  console.log('Deposit detected:', event);
});

sdk.on('withdraw', (event) => {
  console.log('Withdrawal detected:', event);
});

sdk.on('sync', (progress) => {
  console.log(`Sync progress: ${progress.current}/${progress.total}`);
});
```

### Batch Operations

```typescript
// Multiple deposits
const deposits = await sdk.batchDeposit(wallet, [
  { amount: '10', asset: 'XLM' },
  { amount: '20', asset: 'XLM' },
  { amount: '15', asset: 'USDC' },
]);

// Notes array - save all!
console.log(deposits.map(d => d.note));
```

### Custom Wallet Integration

```typescript
import { WalletProvider } from '@privacylayer/sdk/types';

class CustomWallet implements WalletProvider {
  async signTransaction(tx: Transaction): Promise<string> {
    // Your custom signing logic
  }

  async getAddress(): Promise<string> {
    // Return user's address
  }
}

const wallet = new CustomWallet();
const sdk = new PrivacyLayerSDK({ wallet });
```

### Error Handling

```typescript
import { PrivacyLayerError } from '@privacylayer/sdk';

try {
  await sdk.deposit(wallet, amount, asset);
} catch (error) {
  if (error instanceof PrivacyLayerError) {
    switch (error.code) {
      case 'INSUFFICIENT_BALANCE':
        // Show "get more XLM" message
        break;
      case 'NOTE_NOT_FOUND':
        // Invalid note, ask user to check
        break;
      case 'PROOF_GENERATION_FAILED':
        // Retry or suggest desktop
        break;
      default:
        // Generic error
    }
  }
}
```

---

## Module 4: Hands-on Exercise 2

### Exercise: Full dApp Integration

**Task:** Build a complete PrivacyLayer dApp with:
- Wallet connection
- Deposit form
- Withdraw form
- Balance display
- Transaction history

**Starter Repo:** https://github.com/ANAVHEOBA/PrivacyLayer-examples

**Requirements:**
1. Connect Freighter wallet
2. Display shielded balance
3. Deposit with amount/asset selection
4. Save note securely (show copy button)
5. Withdraw using saved note
6. Show transaction status
7. Handle all error cases

**Time:** 60 minutes

**Instructor Support:**
- Monitor breakout rooms
- Help with common issues
- Share tips and best practices

---

## Module 5: Deployment & Security

### Production Checklist

**Before Mainnet:**
- [ ] Complete security audit
- [ ] Test on testnet thoroughly
- [ ] Implement rate limiting
- [ ] Set up monitoring
- [ ] Create incident response plan
- [ ] Prepare user support docs

### Security Considerations

**Frontend:**
```typescript
// ❌ Bad: Store notes in localStorage
localStorage.setItem('note', note);

// ✅ Good: Encrypt before storing
import { encrypt } from '@privacylayer/sdk/crypto';
const encrypted = await encrypt(note, userPassword);
localStorage.setItem('note_encrypted', encrypted);
```

**Backend:**
```typescript
// ❌ Bad: Log sensitive data
console.log('User note:', note);

// ✅ Good: Never log secrets
console.log('User deposited:', { amount, asset, timestamp });
```

**Environment Variables:**
```bash
# .env (never commit!)
PRIVACYLAYER_NETWORK=mainnet
PRIVACYLAYER_RPC_URL=https://...
ENCRYPTION_KEY=...
```

### Monitoring

```typescript
// Track key metrics
sdk.on('deposit', (event) => {
  analytics.track('deposit', {
    amount: event.amount,
    asset: event.asset,
    timestamp: Date.now(),
  });
});

// Alert on errors
sdk.on('error', (error) => {
  if (error.severity === 'critical') {
    sentry.captureException(error);
  }
});
```

---

## Module 6: Real-World Examples

### Example 1: Private Donations

```typescript
// Non-profit accepts private donations
async function acceptDonation(donorEmail, amount) {
  // Generate unique memo
  const memo = uuid();
  
  // Store donor info with memo
  await db.donors.create({
    email: donorEmail,
    memo,
    amount,
    status: 'pending'
  });
  
  // Send payment instructions
  await email.send(donorEmail, {
    subject: 'Private Donation Instructions',
    body: `
      To donate privately:
      1. Go to privacylayer.org
      2. Deposit ${amount} XLM with memo: ${memo}
      3. Save your note
      4. Reply with note to confirm
    `
  });
}
```

### Example 2: Payroll System

```typescript
// Company pays employees privately
async function paySalary(employeeId, amount) {
  // Deduct from company balance
  await companyAccount.deduct(employeeId, amount);
  
  // Deposit to PrivacyLayer
  const { note } = await sdk.deposit(companyWallet, amount, 'USDC');
  
  // Send note to employee (encrypted!)
  const encryptedNote = await encrypt(note, employeeKey);
  await secureChannel.send(employeeId, encryptedNote);
  
  // Employee withdraws privately
  // (instructions sent separately)
}
```

---

## Assessment

### Code Review Exercise

**Task:** Review this code and identify security issues:

```typescript
// ❌ Find the bugs!
async function handleWithdraw(note, address) {
  console.log('Withdrawing with note:', note); // Bug 1: Logging secret
  
  const result = await sdk.withdraw(wallet, note, address);
  
  localStorage.setItem('lastWithdrawal', JSON.stringify(result)); // Bug 2: Storing sensitive data
  
  return result;
}
```

**Solutions:**
1. Never log secrets
2. Don't store sensitive data in localStorage
3. Add error handling
4. Validate inputs

### Final Project

**Build a PrivacyLayer integration:**
- Choose a use case (donations, payroll, e-commerce, etc.)
- Implement full flow
- Present to group
- Get feedback

---

## Resources

### Documentation
- [SDK API Reference](../../sdk/api-reference.md)
- [Integration Guide](../../developers/integration-guide.md)
- [Security Best Practices](../../security/best-practices.md)

### Example Code
- [React Demo](https://github.com/ANAVHEOBA/PrivacyLayer-examples/tree/main/react)
- [Vue Demo](https://github.com/ANAVHEOBA/PrivacyLayer-examples/tree/main/vue)
- [Node.js CLI](https://github.com/ANAVHEOBA/PrivacyLayer-examples/tree/main/nodejs)

### Support
- Discord: https://discord.gg/privacylayer
- GitHub Issues: https://github.com/ANAVHEOBA/PrivacyLayer/issues
- Email: developers@privacylayer.org

---

## Certificate

Participants who complete all exercises receive a **PrivacyLayer Developer Certificate**.

**Requirements:**
- ✅ Complete Exercise 1 (Deposit Form)
- ✅ Complete Exercise 2 (Full dApp)
- ✅ Submit final project
- ✅ Pass security quiz

---

**Workshop Series Complete!** 🎉

See you in the PrivacyLayer community!

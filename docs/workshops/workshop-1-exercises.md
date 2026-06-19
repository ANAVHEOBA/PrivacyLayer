# Workshop 1: Exercises

Hands-on exercises for Introduction to Privacy-Preserving Development workshop.

---

## Exercise 1: Environment Setup

### Objective
Set up your development environment for PrivacyLayer development.

### Steps

1. **Install Node.js** (if not already installed)
   ```bash
   # Check version
   node --version  # Should be 18.x or higher
   ```

2. **Clone the workshop repository**
   ```bash
   git clone https://github.com/PrivacyLayer/workshop-starter
   cd workshop-starter
   npm install
   ```

3. **Install Freighter Wallet**
   - Visit https://freighter.app
   - Install the browser extension
   - Create a new wallet
   - **Important:** Save your seed phrase securely!

4. **Get Testnet Funds**
   - Switch Freighter to Testnet
   - Visit https://laboratory.stellar.org/#account-creator
   - Create and fund your account

### Verification
Run the setup verification script:
```bash
npm run verify-setup
```

Expected output:
```
✅ Node.js version: 18.x
✅ Freighter wallet detected
✅ Testnet account funded
✅ SDK installed
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Node version too old | Update to Node.js 18+ |
| Freighter not detected | Refresh page, check extension enabled |
| Account not funded | Wait a few seconds and retry |

---

## Exercise 2: Your First Deposit

### Objective
Make your first deposit into the PrivacyLayer pool.

### Code

Create a new file `deposit.ts`:
```typescript
import { PrivacyLayer } from '@privacylayer/sdk';
import { connectFreighter } from './utils/wallet';

async function main() {
  // 1. Initialize client
  const client = new PrivacyLayer({
    network: 'testnet'
  });

  // 2. Connect wallet
  const wallet = await connectFreighter();
  await client.connect(wallet);

  // 3. Check balance
  const balance = await client.getBalance('XLM');
  console.log('Your XLM balance:', balance);

  // 4. Make deposit
  const result = await client.deposit({
    amount: '10',
    asset: 'XLM'
  });

  console.log('✅ Deposit successful!');
  console.log('Transaction:', result.txHash);
  console.log('\n⚠️ IMPORTANT: Save this note securely!');
  console.log('Note:', result.note);
}

main().catch(console.error);
```

### Run
```bash
npm run deposit
```

### Expected Output
```
Your XLM balance: 10000
✅ Deposit successful!
Transaction: abc123...

⚠️ IMPORTANT: Save this note securely!
Note: privacy-xxx-yyy-zzz
```

### Save Your Note!
Copy your note and save it securely. You'll need it for Exercise 3.

---

## Exercise 3: Your First Withdrawal

### Objective
Withdraw your deposited funds to a fresh address.

### Prerequisites
- Complete Exercise 2
- Have your deposit note ready

### Steps

1. **Generate a fresh address**
   ```typescript
   import { Keypair } from 'stellar-sdk';
   
   const freshKeypair = Keypair.random();
   console.log('Fresh address:', freshKeypair.publicKey());
   console.log('Secret:', freshKeypair.secret());
   // Save the secret securely!
   ```

2. **Create withdrawal script**
   
   Create `withdraw.ts`:
   ```typescript
   import { PrivacyLayer } from '@privacylayer/sdk';
   import { connectFreighter } from './utils/wallet';
   
   // Replace with your saved note
   const YOUR_NOTE = 'privacy-xxx-yyy-zzz';
   
   // Replace with your fresh address
   const FRESH_ADDRESS = 'GXXXXXXXX...';
   
   async function main() {
     const client = new PrivacyLayer({ network: 'testnet' });
     const wallet = await connectFreighter();
     await client.connect(wallet);
   
     // Check privacy pool balance
     const poolBalance = await client.getPoolBalance({
       note: YOUR_NOTE
     });
     console.log('Available to withdraw:', poolBalance);
   
     // Wait for anonymity set (optional but recommended)
     const stats = await client.getPoolStats();
     console.log('Anonymity set size:', stats.depositCount);
   
     // Withdraw
     const result = await client.withdraw({
       note: YOUR_NOTE,
       recipientAddress: FRESH_ADDRESS
     });
   
     console.log('✅ Withdrawal successful!');
     console.log('Transaction:', result.txHash);
     console.log('Funds sent to:', FRESH_ADDRESS);
   }
   
   main().catch(console.error);
   ```

3. **Run withdrawal**
   ```bash
   npm run withdraw
   ```

### Expected Output
```
Available to withdraw: 10
Anonymity set size: 42
✅ Withdrawal successful!
Transaction: def456...
Funds sent to: GXXXXXX...
```

### Verification
Check your fresh address on Stellar Expert:
```
https://stellar.expert/explorer/testnet/account/GXXXXXX...
```

You should see your 10 XLM (minus small fees).

---

## Exercise 4: Privacy Analysis

### Objective
Understand how privacy is achieved and verify your transaction is untraceable.

### Tasks

1. **Find your deposit transaction**
   - Go to Stellar Expert
   - Look for your deposit transaction
   - Note the transaction hash

2. **Find your withdrawal transaction**
   - Note the transaction hash

3. **Try to link them**
   - Can you prove which deposit corresponds to which withdrawal?
   - What information is hidden?

### Discussion Questions
1. Why can't you link deposit to withdrawal?
2. What information IS visible on-chain?
3. What would make the link stronger? (Answer: small anonymity set, immediate withdrawal, same amount)

---

## Exercise 5: Privacy Best Practices

### Objective
Learn and apply privacy best practices.

### Scenarios

#### Scenario 1: Timing
**Question:** You deposit 10 XLM. When should you withdraw?
- A) Immediately after depositing
- B) After 5 more deposits
- C) After 50 more deposits

**Answer:** C is best. Larger anonymity set = better privacy.

#### Scenario 2: Amounts
**Question:** You want to withdraw 10 XLM. Should you:
- A) Withdraw exactly 10 XLM
- B) Withdraw 9.95 XLM (slightly less)

**Answer:** B is better. Different amount prevents simple matching.

#### Scenario 3: Addresses
**Question:** Where should you withdraw to?
- A) Your main wallet
- B) A fresh address you've never used

**Answer:** B is essential. Never reuse addresses for privacy.

### Checklist
Review your transactions against this checklist:

- [ ] Deposited amount doesn't match withdrawal amount exactly
- [ ] Waited for multiple deposits after yours
- [ ] Withdrew to a fresh, never-used address
- [ ] Saved deposit note securely
- [ ] Used VPN or Tor (optional but recommended)

---

## Solutions

### Exercise 1 Solution
See `solutions/exercise-1/` for complete setup code.

### Exercise 2 Solution
See `solutions/exercise-2/deposit.ts` for complete deposit script.

### Exercise 3 Solution
See `solutions/exercise-3/withdraw.ts` for complete withdrawal script.

---

## Need Help?

- **Discord:** https://discord.gg/privacylayer
- **Documentation:** https://docs.privacylayer.io
- **GitHub Issues:** https://github.com/PrivacyLayer/sdk/issues
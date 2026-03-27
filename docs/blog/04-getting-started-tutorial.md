# Getting Started with PrivacyLayer: A Step-by-Step Tutorial

**Author:** PrivacyLayer Community  
**Date:** March 2026  
**Tags:** #tutorial #beginner #how-to #stellar

---

## Prerequisites

Before you begin, make sure you have:

1. **A Stellar wallet** (Freighter, Lobstr, or any Stellar-compatible wallet)
2. **XLM for transaction fees** (minimum 5 XLM recommended)
3. **The asset you want to transact privately** (USDC, XLM, or other supported tokens)
4. **Node.js 18+** installed (for CLI usage)

---

## Step 1: Install the PrivacyLayer CLI

```bash
# Using npm
npm install -g @privacylayer/cli

# Using yarn
yarn global add @privacylayer/cli

# Verify installation
privacylayer --version
```

---

## Step 2: Connect Your Wallet

### Option A: Using Secret Key (Development Only)

```bash
# Set your secret key as environment variable
export PRIVACYLAYER_SECRET_KEY="your-stellar-secret-key"

# Initialize the CLI
privacylayer init
```

⚠️ **Warning**: Never share your secret key. Use environment variables or secure key management.

### Option B: Using Freighter Wallet

```bash
# Initialize with wallet connection
privacylayer init --wallet freighter

# Follow the prompts to connect your wallet
```

---

## Step 3: Check Your Balance

```bash
# View your current balances
privacylayer balance

# Example output:
# XLM: 100.0000000
# USDC: 500.0000000 (GD...issuer)
```

---

## Step 4: Deposit Funds into the Privacy Pool

### Understanding Deposits

When you deposit:
1. Your funds are locked in the privacy pool contract
2. A secret commitment is created (only you know it)
3. Your deposit is mixed with other deposits
4. No one can trace the deposit to your identity

### Making a Deposit

```bash
# Deposit 100 USDC
privacylayer deposit --amount 100 --asset USDC:GD...issuer

# The CLI will generate a "note" - SAVE THIS SECURELY!
# Example note: privacylayer:USDC:100:nullifier:secret
```

### Important: Save Your Note!

The "note" contains everything needed to withdraw:
```
privacylayer:[asset]:[amount]:[nullifier]:[secret]
```

Store this note:
- ✅ In a password manager
- ✅ On paper in a safe place
- ✅ Encrypted backup

Do NOT:
- ❌ Share with anyone
- ❌ Store in plain text
- ❌ Lose (funds will be unrecoverable)

---

## Step 5: Wait for Confirmations

After depositing:

```bash
# Check deposit status
privacylayer status --deposit [tx-hash]

# Wait for at least 3 confirmations
# This ensures your deposit is in the Merkle tree
```

**Why wait?** The deposit needs to be included in a block and the Merkle tree needs to be updated. This typically takes 1-2 minutes on Stellar.

---

## Step 6: Withdraw Privately

### Understanding Withdrawals

When you withdraw:
1. You generate a ZK proof of ownership
2. The proof proves you have a valid deposit
3. You provide a NEW address (different from your deposit address)
4. No one can link withdrawal to your original deposit!

### Making a Withdrawal

```bash
# Generate a new receiving address (important!)
# You can use a new wallet or a different address

# Withdraw using your saved note
privacylayer withdraw \
  --note "privacylayer:USDC:100:nullifier:secret" \
  --to "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# The CLI will:
# 1. Generate the ZK proof (may take 10-30 seconds)
# 2. Submit the withdrawal transaction
# 3. Return the transaction hash
```

### Verify Your Withdrawal

```bash
# Check withdrawal status
privacylayer status --withdrawal [tx-hash]

# After confirmation, check the receiving address balance
privacylayer balance --address GXXXXX...
```

---

## Step 7: Verify Privacy

### How to Test Privacy

1. Use a block explorer (like StellarExpert)
2. Look up your withdrawal transaction
3. Notice that it shows:
   - A withdrawal from the pool
   - No link to any deposit
   - A nullifier (prevents double-spending)

### What the World Sees

```
Transaction: [hash]
Type: Withdrawal
From: Privacy Pool Contract
To: [your new address]
Amount: 100 USDC
Nullifier: [random hash]
Note: No deposit reference visible!
```

---

## Common Issues and Solutions

### Issue: "Insufficient balance for deposit"

**Solution**: Make sure you have:
- Enough of the asset you want to deposit
- Extra XLM for transaction fees (~1 XLM per transaction)

### Issue: "Invalid note format"

**Solution**: Check your saved note matches the format:
```
privacylayer:[asset]:[amount]:[nullifier]:[secret]
```

### Issue: "Nullifier already used"

**Solution**: This note has already been withdrawn. Check your transaction history.

### Issue: "ZK proof generation failed"

**Solution**: 
- Ensure you're using the latest CLI version
- Check your node version (Node.js 18+ required)
- Try with `--verbose` flag for more details

---

## Advanced Usage

### Relayer Integration

To withdraw without having XLM for fees:

```bash
privacylayer withdraw \
  --note "..." \
  --to "GXXXX..." \
  --relayer "https://relayer.privacylayer.io"
```

The relayer pays fees and takes a small percentage of your withdrawal.

### Multiple Assets

```bash
# Deposit multiple assets
privacylayer deposit --amount 100 --asset USDC:GXXX
privacylayer deposit --amount 50 --asset XLM

# Withdraw specific asset
privacylayer withdraw --note "..." --asset USDC
```

### Batch Operations

```bash
# Deposit to multiple pools
privacylayer deposit-batch --file deposits.json
```

---

## Security Best Practices

### 1. Use Fresh Addresses
Always withdraw to a new address that has no public connection to your identity.

### 2. Don't Deposit Exact Amounts
Avoid depositing round numbers that could identify you:
- Bad: 100.00 USDC
- Good: 97.34 USDC

### 3. Wait Between Transactions
Add random delays between deposits and withdrawals to avoid timing analysis.

### 4. Use Tor/VPN
Access PrivacyLayer through Tor or VPN to hide your IP address.

### 5. Secure Your Notes
Treat privacy notes like private keys. One mistake can reveal your entire transaction history.

---

## Next Steps

- Read about [Zero-Knowledge Proofs](./02-understanding-zk-proofs.md)
- Understand [Merkle Trees](./03-merkle-trees-privacy-pools.md)
- Join our community for support
- Contribute to the open-source project!

---

## Getting Help

- **Documentation**: [docs.privacylayer.io](https://docs.privacylayer.io)
- **Discord**: [discord.gg/privacylayer](https://discord.gg/privacylayer)
- **GitHub**: [github.com/ANAVHEOBA/PrivacyLayer](https://github.com/ANAVHEOBA/PrivacyLayer)
- **Email**: support@privacylayer.io

---

*Congratulations! You've made your first private transaction on Stellar!*
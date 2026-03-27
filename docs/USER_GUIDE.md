# PrivacyLayer User Guide

> **Shield your transactions on Stellar — deposit and withdraw with complete privacy.**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Making a Deposit](#3-making-a-deposit)
4. [Making a Withdrawal](#4-making-a-withdrawal)
5. [Note Management](#5-note-management)
6. [Security Best Practices](#6-security-best-practices)
7. [Privacy Considerations](#7-privacy-considerations)
8. [Troubleshooting](#8-troubleshooting)
9. [FAQ](#9-faq)

---

## 1. Introduction

### What is PrivacyLayer?

PrivacyLayer is a **shielded transaction pool** built on the Stellar blockchain. It lets you move XLM or USDC privately — so no one can see where your money comes from or where it goes on the public blockchain.

Think of it like a privacy curtain at a bank. When you withdraw money from PrivacyLayer, the bank teller can't tell whether that money came from your savings account, your salary, or a gift from a relative.

### How Does It Work? (Simple Explanation)

When you deposit funds into PrivacyLayer:

1. The system creates a unique "note" — like a secret receipt
2. Your deposit gets mixed into a pool with other people's deposits
3. You receive no linking information connecting your deposit to any future withdrawal

When you withdraw:

1. You present your secret note
2. The system verifies the note is valid (without revealing which deposit it came from)
3. Funds are sent to your chosen address — completely unlinked from your deposit

### Privacy Guarantees

PrivacyLayer uses **zero-knowledge proofs** (ZKPs) — a form of cryptography that lets you prove something is true without revealing the underlying information. Specifically:

- **No on-chain link** between your deposit and withdrawal addresses
- **Fixed denominations** ($1, $10, $100, $1000) prevent amount-correlation attacks
- **Merkle tree membership proofs** verify your deposit exists without revealing which one
- **Nullifiers** prevent double-spending without exposing your identity

### Limitations

- ⚠️ **No note = no funds.** If you lose your note, your funds are gone forever
- ⚠️ **Small anonymity sets** are less private. More users = better privacy
- ⚠️ **Timing attacks** are possible. Avoid depositing and immediately withdrawing large amounts
- ⚠️ **Amount correlation.** If you deposit exactly $1000 and someone else withdraws exactly $1000, observers may infer it was you

---

## 2. Getting Started

### Wallet Setup (Freighter)

PrivacyLayer uses **Freighter wallet** — a browser extension made specifically for Stellar. It supports Chrome, Firefox, Brave, and Edge.

**Step 1: Install Freighter**

1. Go to [freighter.org](https://freighter.org) and click **Install Extension**
2. Install the extension for your browser
3. Click the Freighter icon in your browser toolbar
4. Click **Create New Wallet**
5. Write down your **12-word recovery phrase** — store it offline in a secure location
6. Confirm your recovery phrase by entering a few random words
7. Set a password (minimum 8 characters)

> ⚠️ **Never share your recovery phrase or password with anyone.** The PrivacyLayer team will NEVER ask for these.

**Step 2: Enable Stellar in Freighter**

1. Open Freighter
2. Go to **Settings** → **Preferences**
3. Enable **Stellar** if not already enabled
4. Enable **Allow listing of assets** if prompted

**Step 3: Fund Your Wallet**

1. Copy your Freighter Stellar address (click your account → **Copy address**)
2. Send XLM or USDC to this address from any exchange (Coinbase, Kraken, Binance, etc.)
3. Wait for 1-2 confirmations (usually ~5 seconds)
4. Your balance should appear in Freighter automatically

### Minimum Requirements

| Asset | Minimum Amount | Reason |
|-------|----------------|--------|
| XLM | 2.5 XLM + deposit amount | Stellar requires 1 XLM minimum balance + transaction fees |
| USDC | Deposit amount + small XLM for fees | USDC only for deposit; XLM needed for fees |

---

## 3. Making a Deposit

Depositing into PrivacyLayer is the first step toward privacy. Your deposit is mixed with others in the shielded pool.

### Step-by-Step Deposit Flow

**Step 1: Connect Your Wallet**

1. Open the PrivacyLayer dApp
2. Click **Connect Wallet**
3. Select **Freighter**
4. Approve the connection in Freighter
5. Confirm your address appears in the top-right corner

**Step 2: Choose Deposit Amount**

1. Click **Deposit** tab
2. Select denomination: **$1**, **$10**, **$100**, or **$1000**
3. Enter how many notes you want to create (more notes = more privacy, higher fees)
4. Freighter will show the total amount and fee breakdown

> **Tip:** If depositing $500, create five $100 notes rather than one. This makes it harder for observers to track you.

**Step 3: Authorize Transaction**

1. Click **Deposit**
2. Freighter popup appears — click **Approve**
3. Wait for the transaction to confirm (~5 seconds)
4. You'll see a success screen with your note(s)

### ⚠️ CRITICAL: Backup Your Note(s)

**Your note is the ONLY way to withdraw your funds.**

After each deposit:

1. Click **Download Note** or **Copy Note**
2. Save the note in at least 2 separate locations:
   - A password manager (1Password, Bitwarden, etc.)
   - An encrypted USB drive
   - A piece of paper stored securely
3. Verify the note was saved correctly — paste it somewhere to check it looks complete

**Note format:**
```
priv_xxxx_xxxx_xxxx_xxxx_xxxx_xxxx
```

A complete note looks like the string above. If part is missing or truncated, your funds are unrecoverable.

> 🚨 **WARNING: If you deposit WITHOUT backing up your note, your funds WILL BE LOST. There is no recovery mechanism. PrivacyLayer has no way to help you if you lose your note.**

### Common Deposit Errors

| Error | Cause | Solution |
|-------|-------|---------|
| "Insufficient balance" | Not enough XLM for minimum balance | Ensure you have 1 XLM minimum balance after deposit |
| "Transaction failed" | Network congestion | Wait 30 seconds and try again |
| "Invalid denomination" | Attempted non-standard amount | Use only $1, $10, $100, or $1000 |

---

## 4. Making a Withdrawal

Withdrawing is how you use your private funds. You'll need your note to prove ownership.

### Step-by-Step Withdrawal Flow

**Step 1: Access the Withdraw Page**

1. Open the PrivacyLayer dApp
2. Connect your Freighter wallet (if not already connected)
3. Click **Withdraw** tab

**Step 2: Enter Your Note**

1. Paste your complete note into the **Note** field
2. The system will validate the note format
3. If valid, you'll see the deposit amount and denomination

> ⚠️ Only enter notes you control. Entering someone else's note will NOT work and may expose it.

**Step 3: Choose Recipient Address**

1. Enter the Stellar address where you want to receive funds
2. Make sure it's a valid Stellar address (starts with `G`, 56 characters)
3. Double-check — withdrawals cannot be reversed

> **Tip:** Use a fresh Stellar address for each withdrawal for maximum privacy. You can create new addresses in Freighter.

**Step 4: Generate the Zero-Knowledge Proof**

This is the most important — and slowest — step.

1. Click **Generate Proof**
2. The system generates a cryptographic proof showing your note is valid
3. **Wait time: 30 seconds to 2 minutes** depending on your device
4. Do NOT close the browser or refresh during this step

This proof demonstrates:
- Your note exists in the PrivacyLayer pool
- You are the legitimate owner
- The amount is valid (matches a supported denomination)
- No double-spending has occurred

**Step 5: Confirm and Sign**

1. Once the proof is generated, review the transaction details
2. Click **Withdraw**
3. Sign the transaction in Freighter
4. Wait for on-chain confirmation (~5 seconds)
5. Success! Funds arrive at your recipient address

### What to Do If Withdrawal Fails

| Problem | Cause | Solution |
|---------|-------|----------|
| "Invalid note" | Note mistyped or incomplete | Copy the exact note from your backup |
| "Note already spent" | This note was already withdrawn | You may have already withdrawn these funds |
| "Proof generation failed" | Browser issue | Try a different browser or restart the page |
| "Proof timeout" | Took too long | Try again with a faster device |

---

## 5. Note Management

Your note(s) are the keys to your private funds. Treat them with the same care as your recovery phrase.

### How Notes Work

Each note represents a fixed-denomination deposit:

| Denomination | Note Prefix |
|--------------|-------------|
| $1 | `priv_1_...` |
| $10 | `priv_10_...` |
| $100 | `priv_100_...` |
| $1000 | `priv_1000_...` |

If you deposit $500 as five $100 notes, you'll have five separate notes. Each note can be withdrawn independently at any time.

### Backing Up Notes Securely

**DO:**
- ✅ Store notes in a password manager (encrypted)
- ✅ Write notes on paper and store in a fireproof safe
- ✅ Use multiple storage locations (redundancy)
- ✅ Verify notes are saved correctly after each deposit

**DON'T:**
- ❌ Screenshot notes (screenshots can be compromised)
- ❌ Email notes to yourself (email is not encrypted)
- ❌ Store notes in cloud services without encryption
- ❌ Share notes with anyone — ever

### Recovering Lost Notes

> 🚨 **There is NO way to recover a lost note.**

If you lose your note:
- The funds are permanently inaccessible
- No password, recovery phrase, or identity can retrieve them
- The PrivacyLayer team cannot help — there is no backdoor

This is by design. Zero-knowledge proofs require the note as the only proof. If there were another way to withdraw, that would break the privacy guarantees.

### Multiple Note Management

If you use PrivacyLayer regularly, you may accumulate many notes. Tips:

1. **Organize by date** — note when each deposit was made
2. **Track denomination** — keep a simple spreadsheet (NOT containing the actual notes, just a log)
3. **Use a dedicated note vault** — create a separate encrypted file just for PrivacyLayer notes
4. **Audit quarterly** — check your notes against any expected balances

---

## 6. Security Best Practices

### 1. Never Share Your Note

Your note is like cash. If someone else gets it, they can steal your funds.

- PrivacyLayer staff will NEVER ask for your note
- No legitimate service will ever need your note
- If someone asks for it, it's a scam

### 2. Verify Before Each Transaction

Before withdrawing:
- ✅ Confirm the recipient address is correct
- ✅ Confirm the note is complete and untampered
- ✅ Confirm you're on the real PrivacyLayer dApp (check URL)

### 3. Use Different Recipient Addresses

For maximum privacy, withdraw to a fresh address each time. In Freighter:
1. Click **Manage Accounts** → **Add New Account**
2. Label it (e.g., "Privacy Withdrawal #3")
3. Use this new address as your withdrawal recipient

This prevents observers from linking your identities across multiple withdrawals.

### 4. Avoid Timing Patterns

Observers can make inferences based on timing:

- ❌ Bad: Deposit 100 XLM, withdraw 100 XLM 1 minute later
- ❌ Bad: Withdraw immediately after depositing a large amount
- ✅ Good: Wait several hours or days between deposit and withdrawal
- ✅ Good: Vary your withdrawal timing

### 5. Keep Minimum XLM Balance

Always maintain at least **1-2 XLM** in your wallet for:
- Transaction fees (~0.0001 XLM per transaction)
- Minimum balance requirements
- Emergency access if you need to move funds

### 6. Use a Hardware Wallet for Large Amounts

For amounts over $10,000:
- Use a Ledger or Trezor hardware wallet with Freighter integration
- This protects against malware and keyloggers
- Set up the hardware wallet before connecting to PrivacyLayer

---

## 7. Privacy Considerations

### How Private Is PrivacyLayer?

PrivacyLayer provides **probabilistic privacy** — not absolute anonymity. Here's why:

### Anonymity Set Size

Your privacy depends on how many other deposits look like yours:

| Situation | Privacy Level |
|-----------|---------------|
| 1 deposit of $100 in pool | Very low — it's obvious which withdrawal it maps to |
| 100 deposits of $100 | Medium — 1% chance of correct correlation |
| 10,000 deposits of $100 | High — statistically negligible correlation |

**More users = better privacy for everyone.**

### Timing Attacks

If you deposit and immediately withdraw, observers can correlate the transactions by timing alone. Solution: **add random delays** between deposits and withdrawals.

### Amount Correlation

If you deposit exactly $1,337 and someone withdraws exactly $1,337 at roughly the same time, correlation becomes trivial. **Use different denominations** to break this link.

### Network Privacy

PrivacyLayer protects your on-chain transaction graph — but not your IP address. For maximum privacy:
- Use a VPN (Mullvad, ProtonVPN, etc.)
- Use Tor Browser for advanced threat models
- Avoid accessing PrivacyLayer from work or home IP addresses

### What PrivacyLayer Does NOT Protect

- ❌ IP address anonymity (use VPN/Tor)
- ❌ Browser fingerprinting (use a clean browser profile)
- ❌ Timing correlation (add random delays)
- ❌ Amount correlation (use mixed denominations)
- ❌ If someone physically watches you deposit and withdraw

---

## 8. Troubleshooting

### Common Errors and Solutions

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| "Invalid note format" | Note is malformed | Check the note was copied completely |
| "Note not found in tree" | Note doesn't exist or was already spent | Verify you have the correct note |
| "Proof generation failed" | Cryptographic computation error | Refresh and try again; try different browser |
| "Insufficient balance" | Not enough XLM for fees | Ensure you have 1+ XLM for fees |
| "Transaction rejected" | Network or wallet issue | Check Freighter is connected properly |
| "Wrong network" | Not on Stellar testnet/mainnet | Check wallet network settings |

### Transaction Stuck / Pending

If your transaction is taking too long:

1. Check [Stellarbeat.io](https://stellarbeat.io) to see network status
2. Check your Freighter transaction history
3. If confirmed there but not showing in dApp, refresh the page
4. If truly stuck, the transaction may have failed — check your wallet balance

### Still Need Help?

- Check the [FAQ](#9-faq) below
- Search existing [GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- For critical issues, open a new issue with:
  - Your wallet address (not the note!)
  - Transaction hash (if applicable)
  - Browser and version
  - Steps to reproduce

---

## 9. FAQ

### Q: Is PrivacyLayer audited?

**A:** Not yet. PrivacyLayer is currently in beta on Stellar testnet. A formal security audit is planned before mainnet launch. Do NOT use with significant funds until audited.

---

### Q: Can I withdraw partial amounts from a note?

**A:** No. Each note is a fixed denomination ($1, $10, $100, or $1000). To withdraw $50, you'd need to use five $10 notes, or withdraw a $100 note and receive $50 back as change (not yet implemented — plan for future).

---

### Q: What happens if I send the wrong amount?

**A:** Transactions are exact. If you deposit $100, you receive one $100 note. No refunds — all deposits are final.

---

### Q: Can someone track me if I use the same wallet address for deposits and withdrawals?

**A:** No — that's the entire point. PrivacyLayer breaks the on-chain link between your deposit address and withdrawal address. Even if you use the same wallet, the transactions are unlinkable on-chain.

---

### Q: How long does proof generation take?

**A:** Typically 30 seconds to 2 minutes on a modern device. Older devices may take longer. This is the zero-knowledge proof computation — it cannot be rushed without compromising security.

---

### Q: Are my funds safe if PrivacyLayer gets hacked?

**A:** PrivacyLayer is a non-custodial protocol. Your funds are locked in a smart contract. If the contract is exploited, funds could be lost. An audit and bug bounty program will be established before mainnet.

---

### Q: What's the minimum I can deposit?

**A:** The minimum is 1 unit of the denomination ($1, $10, etc.). But you also need extra XLM for Stellar's minimum balance requirement (~2.5 XLM total in your wallet).

---

### Q: Can I use PrivacyLayer on mobile?

**A:** Currently desktop browsers only. Mobile support (Freighter mobile) is in development.

---

### Q: What assets are supported?

**A:** Initially XLM and USDC. Other assets depend on liquidity and smart contract support.

---

### Q: How are fees calculated?

**A:** Fee = Network fee (Stellar, ~0.0001 XLM) + PrivacyLayer protocol fee (varies, shown before deposit). Fees are paid in XLM regardless of deposit asset.

---

### Q: What if I accidentally close the browser during a transaction?

**A:** If the transaction was signed in Freighter and confirmed on-chain, your funds are safe. If the browser closed before signing, nothing happened — refresh and start over. Notes are only generated after a successful deposit.

---

*PrivacyLayer User Guide v1.0 | For the latest version, visit [github.com/ANAVHEOBA/PrivacyLayer](https://github.com/ANAVHEOBA/PrivacyLayer)*

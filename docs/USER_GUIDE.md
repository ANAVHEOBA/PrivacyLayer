# PrivacyLayer User Guide

> **The Complete Guide to Private Transactions on Stellar**

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

PrivacyLayer is a privacy-focused application built on the Stellar blockchain. It allows you to deposit cryptocurrency (XLM or USDC) into a shared pool and later withdraw it to any address—with no visible connection between your deposit and withdrawal.

Think of it like a digital safe where many people deposit money. When you withdraw, you're receiving funds from the pool, not your specific deposit. This breaks the on-chain link between your deposit and withdrawal addresses.

```
Traditional Transaction:
  Your Address ─────────────────────► Recipient Address
                    (visible on blockchain)

PrivacyLayer Transaction:
  Your Address ──► Pool ──► Recipient Address
                  (link broken)
```

### How Does It Work?

PrivacyLayer uses **zero-knowledge proofs** (ZKPs), a cryptographic method that lets you prove you have the right to withdraw funds without revealing which deposit is yours.

Here's the simplified process:

1. **Deposit**: You deposit funds and receive a secret "note" containing cryptographic keys
2. **Pool**: Your funds join a shared pool with other users' deposits
3. **Withdraw**: You use your note to generate a proof and withdraw to any address
4. **Privacy**: The blockchain only sees a withdrawal from the pool—not which deposit it came from

### Privacy Guarantees

✅ **What PrivacyLayer Protects:**
- No on-chain link between your deposit and withdrawal addresses
- Your withdrawal address is not connected to your deposit address
- Other users can't tell which funds you're withdrawing

⚠️ **What PrivacyLayer Does NOT Protect Against:**
- If someone sees your note, they can steal your funds
- If you use the same address for deposit and withdrawal, privacy is reduced
- Large deposits/withdrawals may be identifiable due to pool size

### Limitations

| Limitation | Explanation |
|------------|-------------|
| **Fixed Denominations** | You can only deposit specific amounts (10, 100, 1000, or 10000 XLM/USDC) |
| **Anonymity Set** | Your privacy depends on how many others have deposited the same amount |
| **No Recovery** | If you lose your note, your funds are permanently lost |
| **Settlement Time** | ZK proof generation takes 10-30 seconds |

---

## 2. Getting Started

### Prerequisites

Before using PrivacyLayer, you need:

1. **A Stellar Wallet** - We recommend [Freighter](https://www.freighter.app/)
2. **XLM or USDC** - To deposit into the privacy pool
3. **A Modern Web Browser** - Chrome, Firefox, or Brave recommended

### Setting Up Freighter Wallet

Freighter is the most popular Stellar wallet and is officially supported by the Stellar Development Foundation.

**Step 1: Install Freighter**

Visit [freighter.app](https://www.freighter.app/) and click "Add to Chrome" (or your browser's equivalent).

**Step 2: Create a New Wallet**

```
1. Click the Freighter extension icon
2. Select "Create New Wallet"
3. Write down your 12-word recovery phrase
   ⚠️ CRITICAL: Store this phrase securely - never share it!
4. Create a strong password
5. Confirm your recovery phrase
```

**Step 3: Secure Your Recovery Phrase**

Your recovery phrase is the **only way** to recover your wallet if you lose access.

```
DO:
✅ Write it on paper and store in a secure location
✅ Consider a metal backup for fire/water resistance
✅ Store multiple copies in different secure locations

DON'T:
❌ Store it in a password manager (unless encrypted)
❌ Take a photo of it
❌ Share it with anyone, ever
❌ Enter it on any website
```

### Funding Your Wallet

**For Testnet (Recommended for First-Time Users):**

1. Visit the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=testnet)
2. Fund your account using the Friendbot
3. You'll receive 10,000 XLM for testing

**For Mainnet:**

1. Purchase XLM from an exchange (Coinbase, Binance, Kraken, etc.)
2. Withdraw XLM to your Freighter wallet address
3. Wait for the transaction to confirm (usually < 5 seconds)

### Accessing the dApp

1. Open your browser and navigate to [privacylayer.app](https://privacylayer.app) (or the testnet URL)
2. Click "Connect Wallet" in the top-right corner
3. Approve the connection request in your Freighter wallet
4. You should now see your wallet balance on the page

---

## 3. Making a Deposit

### Overview

Depositing into PrivacyLayer creates a "note" - a cryptographic receipt that proves your right to withdraw later. **This note is critical - losing it means losing your funds permanently.**

### Step-by-Step Deposit Process

**Step 1: Choose Your Denomination**

PrivacyLayer supports fixed deposit amounts to maximize privacy through "anonymity sets."

```
Available Denominations:
┌─────────────────────────────────────────────────┐
│  Amount     │  Anonymity Pool    │  Use Case    │
├─────────────────────────────────────────────────┤
│  10 XLM     │  Smallest pool     │  Testing     │
│  100 XLM    │  Medium pool       │  Standard    │
│  1,000 XLM  │  Largest pool      │  Best privacy│
│  10,000 XLM │  Large pool        │  Large sums  │
└─────────────────────────────────────────────────┘
```

💡 **Tip**: Choose the most common denomination (100 or 1000 XLM) for best privacy.

**Step 2: Select Your Asset**

Choose between XLM (Stellar Lumens) or USDC (USD Coin).

**Step 3: Generate Your Note**

Click "Generate Note" to create your cryptographic deposit credentials.

```
Your Note Contains:
┌────────────────────────────────────────────────────────────┐
│ NULLIFIER: 0x7a3b2c1d...                                   │
│ SECRET:    0x9f8e7d6c...                                   │
│ COMMITMENT:0x4a5b6c7d...                                   │
│ AMOUNT:    100 XLM                                         │
└────────────────────────────────────────────────────────────┘
```

⚠️ **CRITICAL SECURITY WARNING:**
```
╔══════════════════════════════════════════════════════════════╗
║  YOUR NOTE IS YOUR MONEY                                     ║
║                                                              ║
║  • Anyone with your note can withdraw YOUR funds            ║
║  • There is NO recovery if you lose your note               ║
║  • PrivacyLayer cannot help you recover lost notes          ║
║                                                              ║
║  BACKUP YOUR NOTE NOW before proceeding!                    ║
╚══════════════════════════════════════════════════════════════╝
```

**Step 4: Backup Your Note**

Before depositing, you **must** backup your note. Here are recommended methods:

**Option A: Encrypted File (Recommended)**
```bash
# Using a password manager or encrypted note app
# Examples: 1Password, Bitwarden, Standard Notes
```

**Option B: Paper Backup**
```
1. Write down all three values: NULLIFIER, SECRET, COMMITMENT
2. Store in a fireproof safe or safety deposit box
3. Consider creating multiple copies in different locations
```

**Option C: Hardware Device**
```
Store on an encrypted USB drive or hardware wallet
Keep the device in a secure location
```

**Step 5: Confirm Deposit**

1. Review the transaction details
2. Click "Confirm Deposit"
3. Approve the transaction in your Freighter wallet
4. Wait for confirmation (usually 5-10 seconds)

**Step 6: Verify Your Deposit**

After confirmation:
1. You'll see a success message with your leaf index
2. Your commitment is now in the Merkle tree
3. Save your note backup in a **second** location (redundancy is key!)

### What If My Deposit Fails?

| Error | Solution |
|-------|----------|
| "Insufficient balance" | Add more XLM to your wallet |
| "Invalid denomination" | Choose a supported amount (10, 100, 1000, 10000) |
| "Transaction rejected" | You may have clicked "Reject" in your wallet - try again |
| "Network error" | Check your internet connection and retry |
| "Contract paused" | The protocol is under maintenance - wait and try later |

---

## 4. Making a Withdrawal

### Overview

Withdrawing from PrivacyLayer requires your original note. The system generates a zero-knowledge proof that you own a deposit in the pool, without revealing which one.

### Prerequisites for Withdrawal

- ✅ Your deposit has been confirmed (check transaction status)
- ✅ You have your note backed up and accessible
- ✅ You have a destination address (can be any Stellar address)
- ✅ Small amount of XLM for gas fees (~0.01 XLM)

### Step-by-Step Withdrawal Process

**Step 1: Navigate to Withdraw**

Click "Withdraw" in the navigation menu.

**Step 2: Enter Your Note**

```
┌────────────────────────────────────────────────────────────┐
│  ENTER YOUR NOTE                                           │
│                                                            │
│  Paste your complete note here:                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ {"nullifier":"0x7a3b...","secret":"0x9f8e...",...} │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ⚠️ Never enter your note on a suspicious website         │
└────────────────────────────────────────────────────────────┘
```

⚠️ **Security Check:**
- Verify you're on the official PrivacyLayer website
- Check for the padlock icon in your browser's address bar
- Never share your note with anyone

**Step 3: Choose Recipient Address**

Enter the Stellar address where you want to receive your funds.

```
┌────────────────────────────────────────────────────────────┐
│  RECIPIENT ADDRESS                                         │
│                                                            │
│  Enter destination address:                                │
│  ┌────────────────────────────────────────────────────┐   │
│  │ GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNO...      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  💡 For maximum privacy, use an address NOT associated    │
│     with your identity or previous transactions           │
└────────────────────────────────────────────────────────────┘
```

💡 **Privacy Tips:**
- Use a fresh address for each withdrawal
- Never withdraw to your deposit address
- Consider creating a new wallet for withdrawals

**Step 4: Generate Zero-Knowledge Proof**

Click "Generate Proof" to create your withdrawal proof.

```
Proof Generation Progress:
┌────────────────────────────────────────────────────────────┐
│  █████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  35%  │
│                                                            │
│  Status: Computing Merkle proof...                        │
│  Estimated time: 15-20 seconds                            │
└────────────────────────────────────────────────────────────┘
```

**Step 5: Confirm Withdrawal**

1. Review the withdrawal details
2. Click "Confirm Withdrawal"
3. Approve the transaction in your Freighter wallet
4. Wait for on-chain confirmation

**Step 6: Transaction Complete**

```
┌────────────────────────────────────────────────────────────┐
│  ✓ WITHDRAWAL SUCCESSFUL                                  │
│                                                            │
│  Amount:     100 XLM                                      │
│  Recipient:  GABC...XYZ                                   │
│  TX Hash:    abc123...                                    │
│  Fee:        0.01 XLM                                     │
│                                                            │
│  ⚠️ Your note has been spent and is now invalid           │
│     Delete it from your records to avoid confusion        │
└────────────────────────────────────────────────────────────┘
```

### What If My Withdrawal Fails?

| Error | Solution |
|-------|----------|
| "Invalid note" | Check that your note is correct and not already spent |
| "Note already spent" | This note was used in a previous withdrawal |
| "Proof generation failed" | Refresh the page and try again |
| "Insufficient pool balance" | The pool doesn't have enough liquidity - wait for deposits |
| "Merkle proof invalid" | Your deposit may not be confirmed yet - wait and retry |

---

## 5. Note Management

### Understanding Your Note

Your note contains three critical cryptographic values:

| Component | Purpose | Keep Secret? |
|-----------|---------|--------------|
| **Nullifier** | Prevents double-spending; marks note as used after withdrawal | Yes |
| **Secret** | Combined with nullifier to prove ownership | Yes |
| **Commitment** | Public value stored on-chain; derived from nullifier + secret | No (public) |

### Note Format

Your note will typically look like this:

```json
{
  "nullifier": "0x7a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "secret": "0x9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0",
  "commitment": "0x4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6",
  "denomination": 100
}
```

### Backup Strategies

**Strategy 1: Redundant Backups (Recommended)**

```
Primary Backup    ──► Encrypted cloud storage (1Password, Bitwarden)
Secondary Backup  ──► Paper copy in fireproof safe
Tertiary Backup   ──► Encrypted USB drive in separate location
```

**Strategy 2: Air-Gapped Storage**

For maximum security:
1. Write notes on paper
2. Store in a tamper-evident bag
3. Place in a secure physical location
4. Never digitize the note

### Multiple Note Management

If you have multiple deposits, organization is crucial:

```
Your Notes Dashboard:
┌────────────────────────────────────────────────────────────┐
│  Note #1 │ 100 XLM   │ Created: 2024-01-15 │ Status: Ready │
│  Note #2 │ 1000 XLM  │ Created: 2024-01-20 │ Status: Ready │
│  Note #3 │ 100 XLM   │ Created: 2024-02-01 │ Status: Spent │
└────────────────────────────────────────────────────────────┘
```

### ⚠️ Lost Notes Cannot Be Recovered

```
╔══════════════════════════════════════════════════════════════╗
║                     CRITICAL WARNING                         ║
║                                                              ║
║  There is NO recovery mechanism for lost notes.             ║
║                                                              ║
║  • PrivacyLayer does NOT store your notes                   ║
║  • The blockchain does NOT store your secret                ║
║  • No one can help you recover a lost note                  ║
║                                                              ║
║  If you lose your note, your funds are GONE FOREVER.        ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 6. Security Best Practices

### The Golden Rules

```
1. NEVER share your note with anyone
2. ALWAYS backup your note before depositing
3. USE a different address for withdrawal
4. WAIT between deposit and withdrawal
5. VERIFY the website URL before entering your note
```

### Detailed Security Guidelines

**1. Note Security**

| Do | Don't |
|----|-------|
| ✅ Encrypt your note backups | ❌ Share your note with "support" |
| ✅ Store backups in multiple locations | ❌ Store notes in plain text |
| ✅ Delete spent notes to avoid confusion | ❌ Send notes via email or messaging |
| ✅ Use a password manager | ❌ Take screenshots of notes |

**2. Withdrawal Address Safety**

```
MAXIMUM PRIVACY:
Deposit Address: GAAA...111  (Your known address)
                 ↓
           PrivacyLayer Pool
                 ↓
Withdrawal:      GBBB...222  (Fresh, anonymous address)

REDUCED PRIVACY:
Deposit Address: GAAA...111
                 ↓
           PrivacyLayer Pool
                 ↓
Withdrawal:      GAAA...111  ⚠️ Same as deposit - linkable!
```

**3. Timing Considerations**

| Practice | Reason |
|----------|--------|
| Wait 24+ hours between deposit and withdrawal | Prevents timing correlation |
| Withdraw during high-activity periods | Increases anonymity set |
| Avoid patterns (e.g., always withdrawing on Sundays) | Prevents behavioral analysis |

**4. Website Verification**

Always verify you're on the official website:

```
✅ Correct: https://privacylayer.app
✅ Correct: https://app.privacylayer.app
❌ Phishing: https://privacylayer-app.com
❌ Phishing: https://privacylayer.xyz
❌ Phishing: https://privacyleyer.app (typo)
```

Check for:
- Valid SSL certificate (padlock icon)
- Correct spelling
- Official links from Stellar or GitHub

**5. Network Security**

| Risk Level | Connection Type |
|------------|-----------------|
| 🔴 High Risk | Public WiFi without VPN |
| 🟡 Medium Risk | Home WiFi with standard ISP |
| 🟢 Low Risk | VPN or Tor connection |

---

## 7. Privacy Considerations

### Understanding Anonymity Sets

Your privacy depends on the "anonymity set" - the number of other deposits matching your denomination.

```
Anonymity Set Example:

Pool Status for 100 XLM deposits:
┌────────────────────────────────────────────────────────────┐
│  Total Deposits: 1,247                                     │
│  Anonymity Set: 1,247 users                                │
│                                                            │
│  Your deposit is hidden among 1,247 other deposits         │
└────────────────────────────────────────────────────────────┘

Pool Status for 10,000 XLM deposits:
┌────────────────────────────────────────────────────────────┐
│  Total Deposits: 23                                        │
│  Anonymity Set: 23 users                                   │
│                                                            │
│  Your deposit is hidden among only 23 other deposits       │
│  ⚠️ Lower privacy due to smaller set                       │
└────────────────────────────────────────────────────────────┘
```

### Privacy Threats to Avoid

**1. Timing Attacks**

```
BAD: Deposit at 2:00 PM, Withdraw at 2:05 PM
     → Time correlation suggests same user

GOOD: Deposit at 2:00 PM, Withdraw 2 days later at 7:00 PM
      → No time correlation
```

**2. Amount Correlation**

```
BAD: Deposit 1,537 XLM (unusual amount)
     → Easy to identify in pool

GOOD: Deposit 1,000 XLM (standard denomination)
      → Hidden among many identical deposits
```

**3. Address Correlation**

```
BAD: Withdraw to address that interacted with your deposit address
     → Blockchain analysis can link them

GOOD: Withdraw to a fresh address with no connection to you
      → No linkable history
```

**4. Network Privacy**

Your IP address can potentially link your deposit and withdrawal actions.

| Solution | Setup |
|----------|-------|
| VPN | Install a reputable VPN, connect before using PrivacyLayer |
| Tor Browser | Download from torproject.org, use to access PrivacyLayer |
| Both (Maximum) | Use VPN + Tor for layered privacy |

---

## 8. Troubleshooting

### Common Issues and Solutions

**Transaction Stuck/Pending**

```
Problem: Transaction shows "Pending" for more than 5 minutes

Solutions:
1. Refresh the page
2. Check Stellar Explorer for transaction status
3. If transaction failed, your funds are still in your wallet
4. Contact support with your transaction hash
```

**Note Not Found**

```
Problem: System says "Note not found" or "Invalid commitment"

Possible Causes:
├── Typo in note - copy/paste again
├── Note was already spent - check your records
├── Deposit not yet confirmed - wait a few minutes
└── Wrong network (testnet vs mainnet) - check your wallet

Solutions:
1. Verify you're on the correct network (testnet/mainnet)
2. Wait 5 minutes for deposit confirmation
3. Double-check note values for typos
```

**Proof Generation Failed**

```
Problem: "Proof generation failed" error

Solutions:
1. Refresh the page and try again
2. Clear browser cache
3. Try a different browser (Chrome recommended)
4. Check your internet connection
5. If persistent, your note may be corrupted - verify values
```

**Insufficient Funds for Gas**

```
Problem: "Insufficient funds for transaction fee"

Solution:
1. You need ~0.01 XLM for transaction fees
2. Add XLM to your wallet
3. Try the transaction again
```

### Error Messages Reference

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Contract paused" | Protocol maintenance | Wait and try later |
| "Nullifier already spent" | Note was used before | This note is no longer valid |
| "Invalid Merkle proof" | Commitment not in tree | Deposit may not be confirmed |
| "Insufficient pool balance" | Not enough liquidity | Wait for more deposits |
| "Invalid signature" | Wallet signature failed | Reconnect wallet |

### Getting Help

**Before Contacting Support:**
1. Have your transaction hash ready (if applicable)
2. Note the error message exactly
3. Know which network you're using (testnet/mainnet)
4. Do NOT share your note with support

**Support Channels:**
- GitHub Issues: [github.com/ANAVHEOBA/PrivacyLayer/issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- Documentation: [docs.privacylayer.app](https://docs.privacylayer.app)

---

## 9. FAQ

### General Questions

**Q: Is PrivacyLayer legal?**

A: PrivacyLayer is a privacy tool. Using privacy tools is legal in most jurisdictions. However, always check your local regulations. PrivacyLayer is not intended for illegal activities.

**Q: What cryptocurrencies are supported?**

A: Currently XLM (Stellar Lumens) and USDC (USD Coin). More assets may be added through governance.

**Q: What's the minimum/maximum deposit?**

A: The minimum is 10 XLM/USDC and the maximum is 10,000 XLM/USDC per deposit. You can make multiple deposits.

**Q: How long does a transaction take?**

A: Deposits: ~5-10 seconds. Withdrawals: ~30-60 seconds (including proof generation).

### Technical Questions

**Q: What is a zero-knowledge proof?**

A: A cryptographic method to prove you know something without revealing what you know. In PrivacyLayer, you prove you own a deposit without revealing which one.

**Q: What is a nullifier?**

A: A unique value that prevents double-spending. After withdrawal, the nullifier is marked as "spent" on-chain, preventing the same note from being used again.

**Q: Why fixed denominations?**

A: Fixed amounts create "anonymity sets" - groups of identical deposits that can't be distinguished from each other, enhancing privacy for everyone.

**Q: What happens if PrivacyLayer shuts down?**

A: The smart contracts are permissionless. As long as the Stellar network exists, you can withdraw your funds. However, always withdraw promptly - don't leave funds in the pool indefinitely.

### Security Questions

**Q: Can PrivacyLayer access my funds?**

A: No. Your funds are controlled by your note (which only you have). PrivacyLayer cannot access, freeze, or seize your funds.

**Q: What if I lose my note?**

A: Your funds are permanently lost. There is no recovery mechanism. This is why backing up your note is absolutely critical.

**Q: Can someone steal my note?**

A: If someone obtains your note, they can withdraw your funds. Never share your note with anyone, and store it securely.

**Q: Is my deposit insured?**

A: No. PrivacyLayer is a decentralized protocol without insurance. Use at your own risk.

### Privacy Questions

**Q: How private is PrivacyLayer?**

A: PrivacyLayer breaks the on-chain link between deposit and withdrawal. With proper usage (fresh withdrawal address, timing delays, VPN), very high privacy is achievable.

**Q: Can blockchain analysts trace my transactions?**

A: With proper usage, tracing is extremely difficult. However, poor practices (same address deposit/withdrawal, timing correlation) can reduce privacy.

**Q: Does PrivacyLayer know who I am?**

A: PrivacyLayer doesn't collect personal information. Your IP address could potentially be logged by any website you visit - consider using a VPN or Tor.

### Cost Questions

**Q: What are the fees?**

A: 
- Deposit: ~0.01 XLM (Stellar network fee)
- Withdrawal: ~0.01-0.02 XLM (network fee + proof verification gas)
- No protocol fees currently

**Q: Are there deposit/withdrawal limits?**

A: No protocol-imposed limits. However, large amounts may have smaller anonymity sets, reducing privacy.

**Q: Can I cancel a deposit?**

A: No. Once deposited, funds can only be withdrawn using your note. There's no way to "reverse" a deposit.

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║                  PRIVACYLAYER QUICK REFERENCE                ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  BEFORE DEPOSITING:                                          ║
║  □ Have Freighter wallet installed                           ║
║  □ Have XLM or USDC in your wallet                           ║
║  □ Prepared secure backup location for your note             ║
║                                                              ║
║  DURING DEPOSIT:                                             ║
║  □ Choose denomination (100 or 1000 XLM recommended)         ║
║  □ BACKUP YOUR NOTE IMMEDIATELY                              ║
║  □ Save note in MULTIPLE locations                           ║
║                                                              ║
║  BEFORE WITHDRAWING:                                         ║
║  □ Have your note ready                                      ║
║  □ Prepare a fresh recipient address                         ║
║  □ Have ~0.01 XLM for gas                                    ║
║  □ Wait 24+ hours since deposit (for privacy)                ║
║                                                              ║
║  AFTER WITHDRAWING:                                          ║
║  □ Delete spent note from your records                       ║
║  □ Verify funds received at destination                      ║
║                                                              ║
║  ⚠️ LOST NOTES = LOST FUNDS (NO RECOVERY)                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Document Information

| Property | Value |
|----------|-------|
| Version | 1.0.0 |
| Last Updated | 2024 |
| Network | Stellar (Testnet/Mainnet) |
| Protocol Version | Protocol 25 |

---

*This guide is provided for educational purposes. Always verify information with official sources and conduct your own research before using any financial protocol.*
# PrivacyLayer User Guide

> **Complete guide to using the first ZK-proof shielded pool on Stellar Soroban**

---

## 1. Introduction

### What is PrivacyLayer?

PrivacyLayer is a **decentralized privacy protocol** built on the Stellar blockchain that enables you to make private transactions using zero-knowledge proofs. It creates a "shielded pool" where your deposits and withdrawals cannot be linked on the blockchain.

Think of it like a digital vault where you can deposit funds, receive a secret receipt (called a "note"), and later withdraw those funds to any address — with no visible connection between the deposit and withdrawal.

### How Does It Work?

```
Deposit → Receive Secret Note → Wait → Withdraw Anywhere
   ↑                                          ↓
   └──────── No On-Chain Link ────────────────┘
```

1. **You deposit** XLM or USDC into the PrivacyLayer pool
2. **You receive** a secret note (like a digital receipt)
3. **You wait** some time (recommended: at least a few hours)
4. **You withdraw** to any Stellar address using your note
5. **The blockchain sees** a withdrawal, but cannot link it to your deposit

### Privacy Guarantees

- ✅ **No on-chain link** between your deposit and withdrawal addresses
- ✅ **Zero-knowledge proofs** ensure mathematical privacy
- ✅ **Decentralized** — no central authority controls your funds
- ✅ **Open source** — anyone can verify the code

### Limitations

- ⚠️ **Fixed denominations only** (e.g., 100 XLM, 500 XLM, 1000 XLM)
- ⚠️ **Note backup is your responsibility** — lose the note, lose the funds
- ⚠️ **Timing patterns can reduce privacy** — see Privacy Considerations section
- ⚠️ **Network fees apply** for all transactions

---

## 2. Getting Started

### Wallet Setup (Freighter)

PrivacyLayer works with **Freighter**, the most popular Stellar wallet:

1. **Install Freighter Extension**
   - Chrome: [Chrome Web Store](https://chrome.google.com/webstore)
   - Firefox: [Firefox Add-ons](https://addons.mozilla.org)
   - Search for "Freighter"

2. **Create or Import Wallet**
   - Follow the setup wizard
   - **Write down your 12-word recovery phrase**
   - Store it somewhere safe (not on your computer)

3. **Enable Experimental Mode** (if required)
   - Open Freighter settings
   - Enable "Experimental Mode" for Soroban support

### Funding Your Wallet

You'll need XLM for:
- Depositing into PrivacyLayer
- Paying transaction fees (usually < 0.01 XLM per transaction)

**How to get XLM:**
1. Buy from an exchange (Coinbase, Binance, etc.)
2. Withdraw to your Freighter wallet address
3. Wait for confirmation (usually instant)

### Accessing the dApp

1. Visit: `https://privacylayer.app` (mainnet) or `https://testnet.privacylayer.app` (testnet)
2. Click "Connect Wallet"
3. Select "Freighter"
4. Approve the connection in your wallet popup

---

## 3. Making a Deposit

### Step-by-Step Deposit Guide

#### Step 1: Choose Your Denomination

PrivacyLayer uses **fixed denominations** for privacy:

| Available Denominations |
|------------------------|
| 100 XLM                |
| 500 XLM                |
| 1,000 XLM              |
| 5,000 XLM              |
| 10,000 XLM             |

> 💡 **Why fixed amounts?** Everyone deposits the same amounts, making it impossible to trace specific deposits.

#### Step 2: Click "Deposit"

1. Select your preferred denomination
2. Click the **"Deposit"** button
3. Review the transaction in the popup

#### Step 3: Confirm in Freighter

1. A Freighter popup will appear
2. Review the transaction details
3. Click **"Sign"** to confirm
4. Wait for confirmation (usually 5-10 seconds)

#### Step 4: Backup Your Note (CRITICAL!)

⚠️ **THIS IS THE MOST IMPORTANT STEP**

After your deposit confirms, you'll see your **secret note**. This looks like:

```
privacynote-abc123def456-789ghi012jkl-345mno678pqr
```

**You MUST save this note immediately:**
- ✅ Copy and paste to a password manager
- ✅ Write it down on paper and store securely
- ✅ Save in an encrypted file
- ❌ Never store in plain text on your computer
- ❌ Never share with anyone
- ❌ Never take a screenshot (could be backed up to cloud)

> ⚠️ **WARNING**: If you lose this note, your funds are permanently lost. There is no recovery.

#### Step 5: Wait for Confirmation

Your deposit is now in the pool! You'll see:
- Transaction hash (for verification)
- Confirmation that your note is valid
- Current anonymity set size

### What to Do If Deposit Fails

| Issue | Solution |
|-------|----------|
| "Insufficient balance" | Add more XLM to cover the deposit + fees |
| "Transaction rejected" | Check your Freighter settings, try again |
| "Network error" | Wait a few minutes and retry |
| Note doesn't appear | Check your transaction history on Stellar Explorer |

---

## 4. Making a Withdrawal

### Step-by-Step Withdrawal Guide

#### Step 1: Navigate to Withdraw

1. Go to the **"Withdraw"** tab
2. Have your secret note ready

#### Step 2: Enter Your Note

1. Paste your secret note in the input field
2. The system will validate the note
3. You'll see the available amount to withdraw

#### Step 3: Choose Recipient Address

1. Enter the **destination Stellar address** (starts with `G...`)
   - This can be your own other wallet
   - Or someone else's address
   - Or an exchange deposit address

2. **Double-check the address** — transactions cannot be reversed

#### Step 4: Generate Proof

1. Click **"Generate Proof"**
2. Wait for the zero-knowledge proof to be generated (30-60 seconds)
   - This happens in your browser
   - No data is sent to any server
   - The proof mathematically verifies you own the deposit without revealing which one

3. **Do not close the browser tab** during proof generation

#### Step 5: Submit Withdrawal

1. Review the withdrawal details
2. Click **"Withdraw"**
3. Confirm in Freighter
4. Wait for blockchain confirmation

#### Step 6: Verify Receipt

Your funds will arrive at the destination address within seconds!

### What to Do If Withdrawal Fails

| Issue | Solution |
|-------|----------|
| "Invalid note" | Double-check you copied the entire note correctly |
| "Note already spent" | This note has been used — funds already withdrawn |
| "Proof generation failed" | Refresh and try again; ensure stable internet |
| "Insufficient pool liquidity" | Wait and try again later |
| "Transaction failed" | Check recipient address is valid |

---

## 5. Note Management

### Understanding Your Note

A PrivacyLayer note contains:
- **Secret**: Random data only you know
- **Nullifier**: Prevents double-spending
- **Commitment**: Public proof of deposit (on blockchain)
- **Denomination**: Amount deposited

### How to Backup Notes Securely

**Recommended Methods (in order of security):**

1. **Password Manager** (Bitwarden, 1Password, etc.)
   - Encrypted and backed up
   - Accessible across devices
   - Protected by master password

2. **Hardware Security Key** (YubiKey, etc.)
   - Physical device required
   - Most secure option
   - Store backup in multiple locations

3. **Paper Backup**
   - Write note by hand
   - Store in safe or safety deposit box
   - Make multiple copies

4. **Encrypted USB Drive**
   - Encrypt with VeraCrypt or similar
   - Store offline
   - Keep in secure location

### Note Format

Notes follow this format:
```
privacynote-{secret}-{nullifier}-{checksum}
```

Example:
```
privacynote-a1b2c3d4e5f6-g7h8i9j0k1l2-m3n4o5p6
```

### Recovering Lost Notes

> ⚠️ **IMPORTANT**: Lost notes **CANNOT** be recovered.

PrivacyLayer uses zero-knowledge technology — this means:
- Even the developers cannot help you
- There is no "forgot password" option
- The blockchain doesn't store any link to your identity
- **Your note is the only proof of ownership**

### Managing Multiple Notes

If you have multiple deposits, keep track of them:

```
Note 1: privacynote-xxx... (100 XLM) - Deposited 2024-01-15
Note 2: privacynote-yyy... (500 XLM) - Deposited 2024-01-20
Note 3: privacynote-zzz... (1000 XLM) - Deposited 2024-02-01
```

> 💡 **Tip**: Label your backups with deposit dates for easier management.

---

## 6. Security Best Practices

### 🔒 Protect Your Notes

- **Never share** your secret notes with anyone
- **Never enter** your note on unofficial websites
- **Never store** notes in cloud-synced folders (Dropbox, iCloud, etc.)
- **Never screenshot** notes (could be backed up to cloud)
- **Always verify** you're on the official privacylayer.app domain

### 🔐 Wallet Security

- Keep your Freighter recovery phrase **offline**
- Use a **hardware wallet** for large amounts
- Enable **2FA** on your password manager
- Keep your browser and extensions **updated**

### 🌐 Network Security

- Use a **VPN** for additional privacy
- Avoid public WiFi for large transactions
- Consider using **Tor** for maximum anonymity
- Verify SSL certificates (look for 🔒 in address bar)

### ⏱️ Timing Recommendations

- **Wait at least 2-4 hours** between deposit and withdrawal
- **Longer waits = better privacy**
- Avoid withdrawing immediately after deposit
- Consider waiting for other deposits to enter the pool

### 📱 Device Security

- Use **antivirus software**
- Keep your **operating system updated**
- Don't use PrivacyLayer on **shared or public computers**
- Log out of Freighter when done

---

## 7. Privacy Considerations

### Anonymity Set Size

The **anonymity set** is the number of deposits in the pool. Larger = better privacy.

| Anonymity Set | Privacy Level |
|--------------|---------------|
| 1-10         | ⚠️ Low — easy to trace |
| 10-100       | 🟡 Medium — some privacy |
| 100-1000     | 🟢 Good — difficult to trace |
| 1000+        | 🔒 Excellent — very strong privacy |

> 💡 **Tip**: Check the current anonymity set size before withdrawing.

### Timing Attacks

**The Risk**: If you deposit and immediately withdraw, observers might link the transactions.

**Mitigation**:
- Wait several hours (minimum)
- Wait for other deposits to mix with yours
- Consider withdrawing at random times

### Amount Correlation

**The Risk**: If you deposit 1000 XLM and withdraw 1000 XLM shortly after, it's easier to link.

**Mitigation**:
- Use standard denominations ( PrivacyLayer enforces this)
- Wait for other same-amount deposits
- Consider splitting large amounts across multiple deposits

### Network Privacy

**The Risk**: Your IP address could be logged when using the dApp.

**Mitigation**:
- Use a VPN (NordVPN, Mullvad, ProtonVPN)
- Use Tor browser for maximum anonymity
- Consider using a privacy-focused DNS

### Stellar Account Privacy

**The Risk**: Your Stellar account might be linked to your identity (KYC on exchanges).

**Mitigation**:
- Withdraw to a "fresh" address not linked to your identity
- Don't withdraw directly to exchange deposit addresses (they often require KYC)
- Consider using an intermediate wallet

---

## 8. Troubleshooting

### Common Errors and Solutions

#### "Invalid Note Format"
- **Cause**: Note was copied incorrectly
- **Solution**: Double-check the entire note was copied; no extra spaces

#### "Note Already Spent"
- **Cause**: This note was already used for withdrawal
- **Solution**: Check your withdrawal history; you may have already withdrawn

#### "Proof Generation Failed"
- **Cause**: Browser issue or interrupted process
- **Solution**: 
  1. Refresh the page
  2. Ensure stable internet connection
  3. Try a different browser
  4. Clear browser cache

#### "Transaction Stuck"
- **Cause**: Network congestion
- **Solution**: 
  1. Wait 5-10 minutes
  2. Check transaction status on Stellar Explorer
  3. If pending, wait longer
  4. If failed, retry

#### "Insufficient Funds for Fees"
- **Cause**: Not enough XLM for transaction fee
- **Solution**: Add at least 1 XLM to your wallet for fees

#### "Contract Error"
- **Cause**: Smart contract issue
- **Solution**: 
  1. Check PrivacyLayer status page
  2. Try again later
  3. Contact support if persists

### Where to Get Help

- **Discord**: [PrivacyLayer Community](https://discord.gg/privacylayer)
- **GitHub Issues**: [Report bugs](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- **Twitter/X**: [@PrivacyLayer](https://twitter.com/privacylayer)
- **Email**: support@privacylayer.app

### Useful Tools

- **Stellar Explorer**: https://stellar.expert
- **Transaction Status**: Check your transaction hash
- **Account Viewer**: View any Stellar address

---

## 9. FAQ

### General Questions

**Q: Is PrivacyLayer truly anonymous?**
> A: PrivacyLayer provides **strong privacy guarantees** through zero-knowledge proofs. However, no system is 100% anonymous. Follow the privacy best practices in this guide for maximum protection.

**Q: Can the developers steal my funds?**
> A: **No**. The smart contracts are non-custodial. Only the person with the secret note can withdraw funds. Developers have no special access.

**Q: Is PrivacyLayer audited?**
> A: The code is open source and available for review. Check the repository for audit reports.

**Q: What happens if the website goes down?**
> A: Your funds are safe in the smart contract. You can use any PrivacyLayer frontend, or interact directly with the contract using the Stellar SDK.

### Technical Questions

**Q: How does zero-knowledge proof work?**
> A: Zero-knowledge proofs allow you to prove you know a secret (your note) without revealing the secret itself. It's like proving you know a password without telling anyone what it is.

**Q: Why fixed denominations?**
> A: Fixed amounts ensure everyone looks the same on the blockchain. If amounts varied, it would be easier to trace transactions.

**Q: What is the Merkle Tree?**
> A: The Merkle Tree is a data structure that stores all deposit commitments. It allows efficient verification that your deposit exists in the pool.

**Q: How long should I wait between deposit and withdrawal?**
> A: **Minimum 2-4 hours**, but longer is better. Each additional deposit into the pool increases your privacy.

### Cost Questions

**Q: How much does it cost to use PrivacyLayer?**
> A: You'll pay:
> - Stellar network fees (~0.00001 XLM per transaction)
> - PrivacyLayer protocol fee (small %, shown before deposit)

**Q: Are there minimum or maximum amounts?**
> A: Yes, you must use the fixed denominations (100, 500, 1000, 5000, 10000 XLM).

**Q: Can I withdraw partial amounts?**
> A: No, you must withdraw the full denomination of your note.

### Security Questions

**Q: What if I lose my note?**
> A: Your funds are **permanently lost**. There is no recovery mechanism. Back up your notes carefully!

**Q: Can someone guess my note?**
> A: Practically impossible. Notes contain cryptographically random data that would take longer than the age of the universe to guess.

**Q: Is my transaction history private?**
> A: The blockchain shows that **a** withdrawal happened, but not **who** withdrew or which deposit it came from.

### Getting Help

**Q: I have a problem not covered here. What should I do?**
> A: 
> 1. Check this guide again
> 2. Ask in our Discord community
> 3. Open a GitHub issue
> 4. Contact support@privacylayer.app

---

## Summary Checklist

Before using PrivacyLayer, make sure you:

- [ ] Understand how PrivacyLayer works
- [ ] Have Freighter wallet installed and funded
- [ ] Know the denomination you want to deposit
- [ ] Have a secure backup method ready
- [ ] Understand that losing your note = losing funds
- [ ] Willing to wait 2-4+ hours between deposit and withdrawal
- [ ] Have read the security best practices

**Ready to start?** Visit [privacylayer.app](https://privacylayer.app) and connect your wallet!

---

*Last updated: March 2026*

*For technical documentation, see the [GitHub repository](https://github.com/ANAVHEOBA/PrivacyLayer).*

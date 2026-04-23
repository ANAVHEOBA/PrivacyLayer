# PrivacyLayer User Guide

> Your complete guide to PrivacyLayer — a zero-knowledge privacy pool on Stellar.

---

## 1. Introduction

### What is PrivacyLayer?

PrivacyLayer is a decentralized **privacy pool** built on the Stellar network. It allows you to make confidential transactions by breaking the on-chain link between deposits and withdrawals using Zero-Knowledge Proofs (ZKP).

Think of it like a financial mixer — but trustless, non-custodial, and mathematically proven. No third party ever has access to your funds.

### How Does It Work?

PrivacyLayer uses a **note-based system** inspired by Tornado Cash:

1. **Deposit**: You send funds to the PrivacyLayer contract. The contract generates a cryptographic **note** (a secret string). You must save this note — it's the only way to withdraw.
2. **Wait**: We strongly recommend waiting before withdrawing to increase your anonymity set.
3. **Withdraw**: You present your note to the contract. The contract verifies the ZK proof without ever revealing which deposit corresponds to this withdrawal.

The result: observers can see a deposit and a withdrawal, but they **cannot link them**, preserving your financial privacy.

### Privacy Guarantees

- **Cryptographic guarantee**: ZK-SNARK proofs ensure the contract never needs to learn your secret.
- **Non-custodial**: The contract holds funds. No operator, no admin, no third party can access your money.
- **No pattern matching**: The contract supports multiple denomination sizes so deposits and withdrawals of the same amount cannot be trivially linked by timing alone.

### Limitations

- **Note loss = fund loss**: If you lose your note, your deposited funds are irrecoverable.
- **Anonymity set matters**: Privacy improves with more users depositing/withdrawing similar amounts. Large singleton withdrawals can be suspected.
- **No cross-chain privacy**: PrivacyLayer operates on Stellar only.

---

## 2. Getting Started

### Wallet Setup — Freighter

PrivacyLayer uses the **Freighter** wallet, the recommended wallet for Stellar.

#### Install Freighter

1. Visit [freighter.org](https://freighter.org) and install the browser extension for Chrome, Firefox, or Brave.
2. Click the Freighter icon in your browser toolbar.
3. Choose **"Create a new wallet"**.
4. Save your **24-word recovery phrase** in a secure location (offline, encrypted).
5. Set a password you won't forget.

> ⚠️ **Never share your recovery phrase or password with anyone.** Support will never ask for it.

#### Fund Your Wallet

1. Open Freighter and unlock it with your password.
2. Click **"Receive"** to see your Stellar public address (starts with `G...`).
3. Send XLM to this address from any cryptocurrency exchange (Coinbase, Kraken, Binance, etc.) that supports Stellar withdrawals.

Minimum recommendation: **at least 2–3 XLM** to cover transaction fees plus your intended deposit amount.

#### Accessing PrivacyLayer

1. Visit the PrivacyLayer web application.
2. Connect your Freighter wallet by clicking **"Connect Wallet"**.
3. Grant the application permission to view your Stellar address (this is read-only — it cannot move your funds without your signature).

---

## 3. Making a Deposit

Depositing funds into PrivacyLayer creates a private "bucket" that only you can unlock with your note.

### Step-by-Step

1. **Connect your wallet** to the PrivacyLayer dApp and navigate to the **Deposit** page.

2. **Choose your denomination**. PrivacyLayer supports specific deposit amounts (e.g., 10 XLM, 100 XLM, 1000 XLM). Choose the denomination that matches your intended transaction size. Using a common denomination makes your withdrawal harder to distinguish.

3. **Enter the deposit amount**. The UI will show you the exact amount to send. Include a small buffer for network fees.

4. **Initiate the deposit**. Click **"Deposit"**. Freighter will popup asking you to sign the transaction.

5. **Sign and confirm** the transaction in Freighter. Verify the destination address and amount before signing.

6. **Save your note — CRITICAL**. After the transaction confirms, the dApp will display your **note** — a long string of characters (e.g., `privateservice...note...0a1b2c`).

   > 🚨 **You must save this note immediately. If you lose it, your funds are PERMANENTLY LOST. PrivacyLayer cannot recover it.**

7. **Download/backup the note** by clicking the download button or copying it to a password manager, encrypted file, or hardware backup. Treat it like cash.

8. **Confirmation**. Once the transaction is confirmed on-chain, your deposit is live in the privacy pool.

### What Happens If a Deposit Fails?

- **Insufficient balance**: Make sure you have enough XLM to cover deposit + network fee.
- **Network congestion**: Wait a few minutes and try again.
- **Wallet not connected**: Refresh the page and reconnect Freighter.

---

## 4. Making a Withdrawal

Withdrawing proves you own a note without revealing which deposit it corresponds to.

### Step-by-Step

1. Navigate to the **Withdraw** page on the PrivacyLayer dApp.

2. **Paste your note** into the note field. The dApp will validate the format.

3. **Enter your recipient address**. This is the Stellar address that will receive the funds. It can be the same as your deposit address or a completely different wallet.

   > 💡 **Tip**: Use a fresh address (new Freighter account or exchange deposit address) for maximum privacy.

4. **Review the transaction details** — amount, recipient, network fee.

5. **Generate the ZK proof**. This step requires some computational work. It may take 30 seconds to 2 minutes depending on your device. **Do not close the browser tab.**

6. **Sign the withdrawal transaction** in Freighter when prompted.

7. Wait for on-chain confirmation. Once confirmed, funds arrive at your recipient address.

### Important Timing Recommendation

After depositing, **wait at least 2–4 hours before withdrawing**. This makes it harder for observers to correlate the transaction timing with your identity.

### What Happens If Withdrawal Fails?

- **Invalid note**: The note format is incorrect or the note has already been spent. Double-check your note.
- **Proof generation timeout**: Refresh the page and try again. Make sure your device doesn't sleep during proof generation.
- **Transaction stuck**: If the transaction appears stuck, check the Stellar blockchain explorer (StellarExplorer) using your transaction hash.

---

## 5. Note Management

The note is the most critical piece of data in PrivacyLayer. Treat it with extreme care.

### How Notes Work

A note is a cryptographic secret that proves you deposited into a specific pool. It's composed of:
- A **secret** (your proof of ownership)
- A **nullifier** (a unique identifier that prevents double-spending)
- A **commitment** (the on-chain deposit record)

The smart contract verifies your proof using these components without ever learning your secret.

### How to Backup Notes Securely

**Recommended methods (in order of security):**

1. **Hardware security key + encrypted storage**: Write the note into a password manager (Bitwarden, 1Password) that is protected by a strong master password and 2FA.
2. **Air-gapped paper backup**: Write the note on paper and store it in a secure location (safe, bank deposit box). Paper can survive digital failures but can be lost in fires or floods.
3. **Encrypted USB drive**: Store the note in an encrypted file (AES-256 with a strong password). Keep the USB in a secure location.

**Never:**
- Screenshot or paste into unencrypted notes apps
- Send via email, Slack, Discord, or any messaging service
- Store in cloud-synced plain text files (Google Docs, iCloud Notes, etc.)

### Recovering Lost Notes

> ⚠️ **There is NO recovery mechanism. If you lose your note, your funds are permanently unrecoverable. This is by design — a ZK privacy system cannot have a backdoor.**

This is why backups are essential. Before depositing, set up a backup system you trust.

### Multiple Note Management

If you make multiple deposits, you'll have multiple notes. Track them with:
- A **password manager** entry for each note, clearly labeled with deposit date and amount
- A **spreadsheet** (encrypted) mapping codenames to note details
- Never use simple sequential names like "Note 1", "Note 2" — this creates a metadata trail

---

## 6. Security Best Practices

### Protect Your Wallet

- **Never share your seed phrase** — not with support, not with anyone.
- **Use a unique, strong password** for Freighter that you don't use anywhere else.
- **Enable two-factor authentication** on any account associated with acquiring XLM.
- **Verify the dApp URL** before connecting — only use the official PrivacyLayer website.

### Protect Your Notes

- **Backup before depositing.** Verify your backup is readable and complete before sending funds.
- **Use offline backups** for long-term storage.
- **Don't store notes on the same device** you use for daily browsing (malware risk).

### Protect Your Withdrawal Privacy

- **Use a fresh recipient address** each time you withdraw. Create a new Freighter account or use an exchange deposit address you control.
- **Wait between deposit and withdrawal.** As noted above — at least a few hours, ideally longer.
- **Avoid round-trip patterns.** Depositing 100 XLM and immediately withdrawing exactly 100 XLM to the same wallet looks suspicious even if it's technically private.
- **Use different denominations** when possible. If the pool supports it, mixing deposit sizes makes correlation harder.

### Network Privacy

- **Use a VPN or Tor** when accessing PrivacyLayer to prevent IP-based correlation.
- **Avoid using PrivacyLayer on workplace or institutional networks** which have logged, identifiable IPs.

---

## 7. Privacy Considerations

### Understanding the Anonymity Set

The anonymity set is the **number of deposits in a pool that a given withdrawal could come from**. A larger anonymity set means stronger privacy.

PrivacyLayer pools are denominated — every deposit of 10 XLM goes into the 10 XLM pool, every 100 XLM into the 100 XLM pool. When you withdraw from the 100 XLM pool, an observer can only see that you withdrew from one of the 100 XLM deposits.

**To maximize privacy:**
- Wait for the pool to accumulate more deposits before withdrawing
- Use common denominations (10 XLM is likely more used than 10,000 XLM)

### Timing Attacks

If you deposit 100 XLM and withdraw 100 XLM 30 seconds later, an observer can reasonably guess the transaction is linked even without proof. **Longer time gaps = better privacy.**

### Amount Correlation

If you deposit exactly 500 XLM and your withdrawal is exactly 500 XLM minus fees, it's possible to guess the linkage in some circumstances. Consider **withdrawing to a slightly different amount** (e.g., splitting the withdrawal into two transactions with different recipients) if maximum privacy is needed.

### On-Chain Observers

Blockchain analytics firms track known addresses. If you deposit from a KYC'd exchange account and withdraw to another KYC'd account, the privacy is broken at the endpoints — even if the PrivacyLayer transaction itself is private.

**Best practice:** Deposit from a wallet that isn't publicly associated with your identity.

---

## 8. Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|---------|
| "Insufficient balance" | Not enough XLM for deposit + fee | Add more XLM to your Freighter wallet |
| "Invalid note format" | Note was copied incorrectly | Re-copy from backup, check for missing characters |
| "Note already spent" | Note was used in a previous withdrawal | This note is empty; check your records |
| "Proof generation failed" | Browser interrupted | Refresh and restart; ensure stable internet |
| "Transaction not found" | Network explorer index delay | Wait 1–2 minutes and retry |

### Transaction Stalled or Stuck

1. Check the transaction hash on [StellarExplorer](https://stellar.expert).
2. If confirmed on-chain, your balance will update automatically.
3. If showing failed, retry the transaction.

### Cannot Connect Wallet

1. Ensure Freighter is installed and unlocked.
2. Refresh the page.
3. Check that Freighter is set to the correct network (Stellar Public / Testnet — use Public for mainnet pools).

### Proof Generation is Very Slow

Proof generation runs locally in your browser and is computationally intensive. Expected time:

- Desktop (modern): 30s – 2 min
- Mobile: 2 – 5 min

**Do not close the tab.** If it exceeds 10 minutes, try refreshing with a faster device or a desktop browser.

---

## 9. FAQ

**Q: Can PrivacyLayer administrators see my transactions?**
No. The smart contract is trustless. The administrators cannot access your funds or link your deposits to withdrawals.

**Q: What happens if the PrivacyLayer website goes offline?**
Your funds are secured by the Stellar smart contract, not the website. As long as Stellar is running, you can withdraw using any frontend that interacts with the contract (or by calling the contract directly).

**Q: Is PrivacyLayer audited?**
Refer to the project's [GitHub repository](https://github.com/ANAVHEOBA/PrivacyLayer) for audit reports and security assessments. Always do your own research before depositing significant funds.

**Q: What is the minimum deposit?**
Denomination sizes are defined by the contract. Refer to the current deployment for supported amounts.

**Q: Are there fees?**
Yes. There is a small network fee (in XLM) for each deposit and withdrawal transaction on Stellar. The PrivacyLayer protocol may also have a small privacy fee — check the current terms in the dApp.

**Q: Can I deposit and withdraw the same note?**
No. Each note can only be spent once. The contract's nullifier system prevents double-spending.

**Q: How do I verify my deposit and withdrawal are working correctly?**
Use [StellarExplorer](https://stellar.expert) to look up your deposit transaction hash (from Freighter) and your withdrawal transaction hash (from the dApp). Both will show on-chain. The on-chain records will not link them.

**Q: Can I lose money using PrivacyLayer?**
You can lose your *privacy* if you use the system incorrectly (e.g., withdrawing to the same wallet immediately). You can lose your *funds* only if you lose your note. The protocol itself is non-custodial — it cannot be hacked or rug-pulled in the traditional sense.

---

## Need Help?

- **GitHub Issues**: [github.com/ANAVHEOBA/PrivacyLayer/issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- **Documentation**: [github.com/ANAVHEOBA/PrivacyLayer](https://github.com/ANAVHEOBA/PrivacyLayer)
- **Stellar Discord**: Join the #PrivacyLayer channel for community support

> ⚠️ **PrivacyLayer will never ask you for your seed phrase, note, or password. Anyone who does is attempting to steal your funds.**

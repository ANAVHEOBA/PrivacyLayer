# PrivacyLayer User Guide

A comprehensive guide for using PrivacyLayer to make private transactions on the Stellar network. This guide is written for end users with no prior experience in zero-knowledge cryptography.

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

PrivacyLayer is a privacy-preserving transaction system built on the Stellar blockchain. It allows you to deposit funds into a "shielded pool" and later withdraw them to any Stellar address, with no on-chain connection between the deposit and the withdrawal.

Think of it as a privacy envelope: you put funds in at one end and take them out at the other end, and nobody watching the blockchain can tell that the two transactions are related.

### How Does It Work?

PrivacyLayer uses zero-knowledge proofs (ZK proofs) to achieve privacy. Here is a simplified explanation:

1. **Deposit:** You deposit a fixed amount (e.g., 100 XLM) into the shielded pool. The system gives you a secret "note" -- a piece of data that proves you made the deposit. The pool records a cryptographic commitment (a one-way hash of your note) but does not record who made the deposit.

2. **Withdraw:** Later, you present your secret note to generate a mathematical proof that you know the secret behind one of the commitments in the pool, without revealing which one. The pool verifies the proof and sends the funds to your chosen recipient address.

The key insight is that the proof reveals nothing about which deposit is yours. An observer sees that someone deposited 100 XLM and someone else withdrew 100 XLM, but they cannot link the two transactions.

### Privacy Guarantees

- **Deposit-withdrawal unlinkability:** No on-chain connection between your deposit and withdrawal.
- **Fixed denominations:** All deposits and withdrawals are the same amount, preventing amount-based correlation.
- **No depositor identity in events:** The contract intentionally does not emit the depositor address in deposit events.

### Limitations

- **Fixed amounts only:** You must deposit and withdraw the exact denomination amount (e.g., 10 XLM, 100 XLM, or 1,000 XLM). You cannot deposit or withdraw arbitrary amounts.
- **Note loss is permanent:** If you lose your secret note, your funds are unrecoverable. There is no "forgot password" mechanism.
- **Anonymity set size:** Your privacy depends on the total number of deposits in the pool. A pool with few deposits provides weaker privacy.
- **Unaudited software:** PrivacyLayer has not yet undergone a formal security audit. Use at your own risk and only with amounts you are willing to lose.

---

## 2. Getting Started

### 2.1 Wallet Setup (Freighter)

PrivacyLayer works with the Freighter browser wallet for Stellar. To set it up:

1. **Install Freighter** -- Visit [freighter.app](https://www.freighter.app/) and install the browser extension for Chrome, Firefox, or Brave.
2. **Create or import a wallet** -- Follow the on-screen instructions to create a new wallet or import an existing one using your recovery phrase.
3. **Switch to testnet (for testing)** -- Open Freighter, click the network selector in the top right, and choose "Testnet."
4. **Enable Soroban** -- Freighter supports Soroban smart contract transactions by default on recent versions. Ensure your extension is up to date.

### 2.2 Funding Your Wallet

**Testnet:**

Use the Stellar friendbot to get free test XLM:

1. Copy your wallet address from Freighter.
2. Visit [https://friendbot.stellar.org/?addr=YOUR_ADDRESS](https://friendbot.stellar.org/) and paste your address.
3. You will receive 10,000 test XLM.

**Mainnet:**

Purchase XLM from an exchange (e.g., Coinbase, Binance, Kraken) and transfer it to your Freighter wallet address. Ensure you have enough XLM to cover the denomination amount plus network fees (approximately 0.01 XLM per transaction).

### 2.3 Accessing the dApp

1. Navigate to the PrivacyLayer web application in your browser.
2. Click "Connect Wallet" and approve the connection in Freighter.
3. Your wallet address and XLM balance should appear on the page.

---

## 3. Making a Deposit

### 3.1 Step-by-Step

1. **Open the Deposit page** -- Navigate to the "Deposit" section of the dApp.

2. **Choose a denomination** -- Select the fixed deposit amount from the available options:
   - 10 XLM
   - 100 XLM
   - 1,000 XLM
   - 100 USDC
   - 1,000 USDC

   Each denomination operates as a separate pool. You will withdraw from the same pool later.

3. **Generate your note** -- Click "Generate Note." The dApp creates a unique secret note containing:
   - A **nullifier** -- a random value used to prevent double-spending.
   - A **secret** -- a random value that only you know.
   - A **commitment** -- the Poseidon2 hash of the nullifier and secret, which is stored on-chain.

4. **Back up your note (CRITICAL)** -- The dApp will display your note as a text string. **You must save this note immediately.** Copy it and store it securely (see [Note Management](#5-note-management) below).

   > **WARNING:** If you lose your note, your deposited funds are permanently unrecoverable. There is no way to retrieve your note from the blockchain. Back it up before proceeding.

5. **Confirm the deposit** -- Click "Deposit." Freighter will ask you to approve the transaction. Review the details:
   - You are sending the denomination amount (e.g., 100 XLM) to the PrivacyLayer contract.
   - The commitment hash is included in the transaction data.

6. **Wait for confirmation** -- The transaction takes a few seconds to process. Once confirmed:
   - Your commitment is added to the on-chain Merkle tree.
   - A `DepositEvent` is emitted with the commitment and leaf index.
   - Your leaf index is displayed -- note it alongside your secret note.

### 3.2 What to Do if the Deposit Fails

- **Insufficient balance:** Ensure you have enough XLM/USDC to cover the denomination amount plus network fees.
- **Pool is paused:** The admin may have paused the pool temporarily. Wait and try again later.
- **Tree is full:** The pool has reached its maximum capacity (1,048,576 deposits). A new pool instance must be deployed.
- **Transaction rejected in wallet:** Check that you are connected to the correct network (testnet vs. mainnet) and that the dApp is using the correct contract address.

---

## 4. Making a Withdrawal

### 4.1 Step-by-Step

1. **Open the Withdraw page** -- Navigate to the "Withdraw" section of the dApp.

2. **Enter your note** -- Paste the secret note you saved during the deposit step. The dApp will parse the nullifier, secret, and other data from the note.

3. **Enter the recipient address** -- Provide the Stellar address where you want to receive the funds. This can be any valid Stellar address, including one that has never interacted with the pool.

   > **Tip:** For maximum privacy, use a fresh Stellar address that has no prior transaction history and no connection to the depositor address.

4. **Set relayer (optional)** -- If you want a relayer to submit the transaction on your behalf (to avoid connecting your IP address to the withdrawal), enter the relayer address and fee. For most users, you can skip this and set the relayer to zero.

5. **Generate the proof** -- Click "Generate Proof." This step may take 30 seconds to a few minutes depending on your device. The dApp will:
   - Sync the Merkle tree from the blockchain.
   - Compute a Merkle inclusion proof for your commitment.
   - Generate a Groth16 zero-knowledge proof using the Noir prover running in your browser (via WASM).

   > **Note:** Proof generation happens entirely on your device. Your nullifier and secret are never sent to any server.

6. **Submit the withdrawal** -- Click "Withdraw." The dApp sends the proof and public inputs to the contract. Freighter will ask you to approve the transaction.

7. **Wait for confirmation** -- Once the transaction confirms:
   - The contract verifies the Groth16 proof using BN254 pairing operations.
   - Your nullifier is marked as "spent" to prevent double-spending.
   - Funds are transferred to the recipient address.
   - A `WithdrawEvent` is emitted.

### 4.2 What to Do if the Withdrawal Fails

- **"Unknown root" error:** Your Merkle root may be too old. The pool keeps only the 30 most recent roots. If many deposits have been made since yours, regenerate the proof with the current root.
- **"Nullifier already spent" error:** This note has already been used for a withdrawal. Each note can only be withdrawn once.
- **"Invalid proof" error:** The proof verification failed. This can happen if:
  - The note was entered incorrectly. Double-check for typos.
  - The verifying key on-chain does not match the circuit used to generate the proof.
  - The public inputs (recipient, amount) do not match what was used during proof generation.
- **"Pool paused" error:** The admin has temporarily paused the pool. Wait and try again later.
- **Proof generation takes too long or crashes:** This is computationally intensive. Close other browser tabs, ensure your device has sufficient memory, and try again.

---

## 5. Note Management

### 5.1 Understanding the Note

Your note is the only proof that you own a deposit in the shielded pool. It contains:

- **Nullifier:** A random field element. When you withdraw, a hash of this value is published on-chain to prevent double-spending. The nullifier itself is never revealed.
- **Secret:** A random field element that is never revealed, not even during withdrawal. It is part of the commitment preimage.
- **Commitment:** The Poseidon2 hash of the nullifier and secret. This value is stored on-chain in the Merkle tree.
- **Leaf index:** The position of your commitment in the Merkle tree.

A typical note looks like a long hexadecimal string or a structured text format, depending on the dApp implementation.

### 5.2 How to Back Up Notes Securely

Your note is essentially a password to your funds. Treat it with the same care as a private key or seed phrase.

**Recommended backup methods:**

1. **Encrypted file on multiple devices** -- Save the note in an encrypted file (using tools like VeraCrypt, 7-Zip with AES, or an encrypted notes app) and store copies on at least two separate devices.

2. **Password manager** -- Store the note in a reputable password manager (e.g., 1Password, Bitwarden, KeePass) under a descriptive entry.

3. **Physical paper backup** -- Write the note on paper and store it in a secure location (e.g., a safe). Make two copies and store them in different locations.

4. **Encrypted cloud storage** -- Store an encrypted copy in cloud storage as a secondary backup.

**Methods to avoid:**

- Plain text files on your computer or phone (vulnerable to malware)
- Screenshots (may be synced to cloud photo services)
- Email or messaging apps (may be compromised or monitored)
- Clipboard managers (may store clipboard history)

### 5.3 Recovering Lost Notes

**There is no way to recover a lost note.** The nullifier and secret are generated randomly on your device and are never stored on-chain or on any server. If you lose the note, the funds remain locked in the pool permanently.

This is a fundamental property of the privacy design: if notes could be recovered by a third party, that third party could also link deposits to withdrawals, breaking the privacy guarantee.

### 5.4 Managing Multiple Notes

If you make multiple deposits, you will have multiple notes. Keep them organized:

- Label each note with the deposit date, denomination, and pool (testnet/mainnet).
- Track which notes have been withdrawn (mark them as "spent").
- Never reuse or share notes across different pools or networks.

---

## 6. Security Best Practices

### 6.1 Protect Your Note

Your note is the key to your funds. Follow these rules:

- **Never share your note with anyone.** Anyone who has your note can withdraw your funds to their own address.
- **Never paste your note into untrusted websites or applications.** Only enter it in the official PrivacyLayer dApp.
- **Do not transmit notes over unencrypted channels** (email, SMS, Slack, Discord).

### 6.2 Back Up Before Depositing

Always verify that your note backup is complete and accessible before clicking "Deposit." Once the transaction is confirmed, your only way to retrieve the funds is through the note.

### 6.3 Use Different Recipient Addresses

When withdrawing, use a fresh Stellar address that has no prior connection to your depositor address. If you withdraw to the same address you deposited from, an observer can trivially link the two transactions.

### 6.4 Wait Between Deposit and Withdrawal

Do not deposit and withdraw within the same block or within a very short time window. Timing correlation is one of the easiest ways to de-anonymize transactions. Wait for additional deposits from other users to enter the pool before withdrawing.

As a general guideline:
- **Minimum:** Wait at least a few hours.
- **Recommended:** Wait at least 24 hours, or until several other deposits have been made.

### 6.5 Avoid Patterns

Do not create recognizable patterns that could link your deposits and withdrawals:

- Do not always deposit and withdraw the same number of times in sequence.
- Do not use the same relayer for all withdrawals.
- Do not withdraw to addresses that are linked to each other (e.g., addresses that subsequently send funds to the same destination).

### 6.6 Verify the dApp URL

Always verify that you are using the official PrivacyLayer dApp. Phishing sites can steal your notes. Bookmark the official URL and never click links from untrusted sources.

---

## 7. Privacy Considerations

### 7.1 Anonymity Set Size

Your privacy depends on the **anonymity set** -- the number of deposits in the pool at the time of your withdrawal. If the pool contains 1,000 deposits and you withdraw one, an observer knows you are one of the 1,000 depositors but cannot determine which one.

- **Small pool (< 10 deposits):** Weak privacy. An observer can narrow down your identity significantly.
- **Medium pool (10-100 deposits):** Moderate privacy.
- **Large pool (> 100 deposits):** Strong privacy.

The anonymity set only includes deposits of the same denomination. A 100 XLM pool and a 1,000 XLM pool are completely separate.

### 7.2 Timing Attacks

If you deposit 100 XLM and immediately withdraw 100 XLM to a different address, the timing makes it likely that the two transactions are related. Wait for other deposits to accumulate in the pool before withdrawing.

### 7.3 Amount Correlation

PrivacyLayer uses fixed denominations to prevent amount correlation. All deposits and withdrawals in a given pool are exactly the same amount, so an observer cannot match deposits to withdrawals based on amount.

However, if you deposit multiple times (e.g., three deposits of 100 XLM) and then make three withdrawals shortly after, the pattern of "three in, three out" could be correlated. Spread your transactions over time.

### 7.4 Network Privacy (VPN/Tor)

The blockchain transaction itself is private (deposit and withdrawal are unlinkable), but your IP address is visible to the RPC node you connect to. If the RPC node operator logs IP addresses, they could potentially associate your IP with your deposit or withdrawal.

To mitigate this:

- **Use a VPN** when interacting with the dApp. This hides your IP from the RPC node.
- **Use Tor Browser** for maximum network-level privacy. Ensure the dApp functions correctly in Tor Browser.
- **Use a relayer** to submit the withdrawal transaction on your behalf, so your IP is never associated with the withdrawal.

### 7.5 Metadata Leakage

Be aware of other metadata that could link your transactions:

- **Browser fingerprinting:** The dApp website itself could track you. Use a privacy-focused browser.
- **Wallet addresses:** If both your deposit address and withdrawal address are known to belong to you (e.g., linked on an exchange), the privacy pool does not help.
- **Token movements after withdrawal:** If you withdraw to a fresh address and then immediately send the funds to an exchange where you are KYC-verified, the exchange can see the withdrawal address.

---

## 8. Troubleshooting

### 8.1 Common Errors and Solutions

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| "Connect Wallet" does nothing | Freighter not installed or disabled | Install or enable the Freighter extension and refresh the page. |
| "Insufficient balance" | Not enough XLM/USDC in wallet | Transfer more funds to your wallet. Remember to account for the ~0.01 XLM network fee. |
| "Pool is paused" | Admin has temporarily paused the pool | Wait for the admin to unpause the pool. Check the project's communication channels for updates. |
| Deposit transaction pending for a long time | Network congestion | Wait a few minutes. Stellar transactions typically confirm within 5-6 seconds; longer waits may indicate network issues. |
| "Note not found" or "Invalid note" | Note was pasted incorrectly | Double-check the note for missing or extra characters. Ensure you copied the complete note string. |
| Proof generation fails in browser | Insufficient device resources | Close other tabs and applications. Try on a device with more RAM (at least 4 GB free). |
| "Unknown root" on withdrawal | Too many deposits since yours | The pool keeps 30 recent Merkle roots. Re-sync the Merkle tree and generate a new proof with a current root. |
| "Nullifier already spent" | Note was already used | Each note can only be withdrawn once. If you did not make this withdrawal, your note may have been compromised. |
| "Invalid proof" | Corrupted note or wrong network | Verify you are on the correct network (testnet vs. mainnet) and that the note is entered correctly. |

### 8.2 Transaction Stuck

If your transaction appears to be stuck:

1. **Wait 30 seconds** -- Stellar typically confirms transactions within 5-6 seconds. Brief delays are normal.
2. **Check the Stellar explorer** -- Visit [stellar.expert](https://stellar.expert/) (mainnet) or [testnet.stellar.expert](https://testnet.stellar.expert/) (testnet) and search for your transaction hash or wallet address.
3. **Retry** -- If the transaction failed, you can safely retry. Deposits are idempotent as long as you generate a new note (a new commitment). Do not reuse a commitment from a failed deposit.

### 8.3 Proof Generation Failed

If proof generation fails or takes excessively long:

1. **Check device requirements** -- Groth16 proof generation is computationally intensive. Use a desktop or laptop computer rather than a mobile device.
2. **Close other applications** -- Free up RAM and CPU resources.
3. **Try a different browser** -- Chrome and Firefox tend to perform best for WASM workloads.
4. **Clear browser cache** -- Corrupted WASM cache files can cause issues.
5. **Check console logs** -- Open your browser's developer console (F12) and look for error messages that may indicate the specific failure.

### 8.4 Support Resources

- [PrivacyLayer GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) -- Report bugs or request help.
- [Stellar Developer Discord](https://discord.gg/stellar) -- Community support in the `#soroban` channel.
- [Freighter Support](https://www.freighter.app/) -- For wallet-specific issues.

---

## 9. FAQ

### General Questions

**Q: Is PrivacyLayer free to use?**

A: There is no fee charged by the PrivacyLayer protocol itself beyond standard Stellar network fees (approximately 0.01 XLM per transaction). If you use a relayer for your withdrawal, the relayer may charge a fee that is deducted from your withdrawal amount.

**Q: What assets does PrivacyLayer support?**

A: PrivacyLayer supports XLM (Stellar Lumens) and USDC on Stellar. Each denomination operates as a separate pool:
- 10 XLM, 100 XLM, 1,000 XLM
- 100 USDC, 1,000 USDC

**Q: Can I deposit any amount?**

A: No. PrivacyLayer uses fixed denominations to prevent amount-based correlation attacks. You must deposit exactly the denomination amount (e.g., exactly 100 XLM for the Xlm100 pool). To deposit larger amounts, make multiple deposits.

**Q: How many deposits can the pool hold?**

A: Each pool instance supports up to 1,048,576 (2^20) deposits. This is determined by the Merkle tree depth of 20 levels.

### Privacy Questions

**Q: Can the pool admin see who deposited and withdrew?**

A: No. The admin can pause/unpause the pool and update the verification key, but they have no ability to link deposits to withdrawals. The contract does not record the depositor address in deposit events.

**Q: Can someone with access to the blockchain data de-anonymize me?**

A: Not from the on-chain data alone. The Groth16 proof reveals nothing about which deposit is being withdrawn. However, timing patterns, amount patterns, and network-level metadata (IP addresses) can weaken your privacy. Follow the [Security Best Practices](#6-security-best-practices) to minimize this risk.

**Q: What is a nullifier?**

A: A nullifier is a unique random value included in your note. When you withdraw, a hash of the nullifier is published on-chain to prevent double-spending (using the same note twice). The nullifier itself is never revealed -- only its hash is published, and this hash cannot be linked back to any specific deposit commitment.

**Q: What is a Merkle tree?**

A: A Merkle tree is a data structure that efficiently stores and verifies a list of values (in this case, deposit commitments). PrivacyLayer uses it to prove that your deposit exists in the pool without revealing which specific deposit is yours.

### Technical Questions

**Q: What cryptographic primitives does PrivacyLayer use?**

A: PrivacyLayer uses:
- **Poseidon2 hash function** -- for computing commitments and Merkle tree nodes (efficient inside ZK circuits)
- **Groth16 proof system** -- for generating and verifying zero-knowledge proofs
- **BN254 elliptic curve** -- the underlying curve for Groth16 proofs and Poseidon hash operations

All three are supported natively by Stellar Protocol 25 host functions, meaning no external cryptographic libraries are needed on-chain.

**Q: What is Protocol 25?**

A: Stellar Protocol 25 (codename "X-Ray," released January 2026) added native support for BN254 elliptic curve operations and Poseidon hash functions as Soroban host functions. This is what makes PrivacyLayer possible without requiring external cryptographic libraries.

**Q: How long does proof generation take?**

A: Proof generation time depends on your device:
- **Desktop/laptop:** Typically 30 seconds to 2 minutes.
- **Mobile device:** May take several minutes or fail due to resource constraints.
- The proof is generated entirely in your browser using WASM. No data is sent to external servers during proof generation.

### Cost Questions

**Q: What are the transaction costs?**

A: Approximate costs per operation:
- **Deposit:** ~0.01 XLM network fee + the denomination amount (which goes into the pool and is returned on withdrawal)
- **Withdrawal:** ~0.01 XLM network fee (paid by whoever submits the transaction; the denomination amount is returned to the recipient)
- **Relayer fee (optional):** Set by the relayer, deducted from the withdrawal amount

**Q: Can I get a partial refund?**

A: No. Withdrawals always return the full denomination amount (minus any optional relayer fee). You cannot withdraw a partial amount.

### Safety Questions

**Q: What happens if the admin pauses the pool?**

A: If the pool is paused, no new deposits or withdrawals can be processed. Your funds remain safe in the pool. When the admin unpauses the pool, you can withdraw normally using your note.

**Q: What if PrivacyLayer is shut down?**

A: The smart contract is deployed on the Stellar blockchain and cannot be "shut down" by the team. As long as the Stellar network is running and the contract is not paused, you can withdraw your funds using any compatible client (even a command-line tool). Your note is all you need.

**Q: Has PrivacyLayer been audited?**

A: No. PrivacyLayer has not yet undergone a formal security audit. The contract and circuits use well-established cryptographic primitives (BN254, Poseidon, Groth16) that are battle-tested, but the specific implementation has not been independently verified. Use with caution and only with amounts you can afford to lose.

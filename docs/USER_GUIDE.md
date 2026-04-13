# PrivacyLayer User Guide

## 1. Introduction

### What is PrivacyLayer?

PrivacyLayer is the first zero-knowledge proof (ZK) shielded pool built on the Stellar Soroban blockchain. It enables **compliance-forward private transactions**, allowing users to deposit XLM or USDC into a shielded pool and withdraw to any address using a zero-knowledge proof -- with no on-chain link between deposit and withdrawal.

### How Does It Work?

PrivacyLayer uses cutting-edge cryptography made possible by Stellar Protocol 25 (X-Ray, January 2026):

1. **Deposit**: You send cryptocurrency to the PrivacyLayer smart contract. The contract creates a cryptographic "commitment" using the Poseidon hash function, which is stored in an on-chain Merkle tree.

2. **Note Generation**: When you deposit, you receive a secret "note" -- a cryptographic proof that you deposited funds. This note contains a nullifier (unique identifier) and a secret.

3. **Withdraw**: To withdraw, you prove ownership of a deposit using a zero-knowledge proof (Groth16 via Noir). The smart contract verifies the proof on-chain using BN254 elliptic curve pairing, without ever revealing which deposit corresponds to your withdrawal.

The result: you can deposit and withdraw with complete privacy. Nobody can link your deposit address to your withdrawal address.

### Privacy Guarantees

- **No deposit-to-withdrawal link**: The zero-knowledge proof mathematically guarantees that no one can determine which deposit corresponds to which withdrawal.
- **Merkle tree anonymity**: Your deposit is hidden among all other deposits in the Merkle tree (depth=20, supporting over 1 million deposits).
- **Nullifier protection**: The system prevents double-spending by tracking spent nullifiers without revealing which deposit they correspond to.

### Limitations

- **Fixed denominations**: Deposits and withdrawals use fixed amounts (e.g., 10 XLM, 100 XLM, 1000 XLM). This is by design -- varying amounts could leak information.
- **Timing analysis risk**: Withdrawing immediately after depositing may reduce privacy. The anonymity set grows with time.
- **On-chain privacy only**: PrivacyLayer does not hide your IP address or network activity. Use a VPN or Tor for complete privacy.
- **Smart contract risk**: As with all smart contracts, there is inherent risk. PrivacyLayer's contracts have not yet undergone a formal security audit.

---

## 2. Getting Started

### Prerequisites

Before using PrivacyLayer, you need:

1. **A Stellar wallet** -- We recommend [Freighter](https://freighter.app/), a browser extension wallet for Stellar.
2. **XLM or USDC** -- You need funds to deposit. You can acquire XLM from any major exchange.
3. **A small amount of XLM for transaction fees** -- Stellar transaction fees are minimal (typically 0.00001 XLM).

### Setting Up Freighter

1. Install the Freighter browser extension from [freighter.app](https://freighter.app/).
2. Create a new wallet or import an existing one.
3. **IMPORTANT**: Write down your recovery phrase and store it securely. This is separate from your PrivacyLayer note.
4. Fund your wallet with XLM (or USDC) from an exchange or another wallet.

### Accessing the dApp

1. Navigate to the PrivacyLayer web application (link to be provided at launch).
2. Connect your Freighter wallet when prompted.
3. Ensure you are on the correct Stellar network (Mainnet for real transactions, Testnet for testing).

---

## 3. Making a Deposit

### Step-by-Step Guide

**Step 1: Choose Denomination**

Select the amount you wish to deposit. PrivacyLayer supports fixed denominations:

| Denomination | Asset |
|-------------|-------|
| 10 XLM | XLM |
| 100 XLM | XLM |
| 1000 XLM | XLM |
| 10 USDC | USDC |
| 100 USDC | USDC |
| 1000 USDC | USDC |

> **Why fixed denominations?** Using fixed amounts prevents amount-based analysis. If everyone deposits different amounts, an observer could correlate deposits and withdrawals by matching amounts.

**Step 2: Generate Your Note**

When you initiate a deposit, PrivacyLayer will:
- Generate a unique nullifier and secret
- Compute a commitment using Poseidon hash: `commitment = Poseidon(nullifier, secret)`
- Submit the commitment to the smart contract

**Step 3: BACK UP YOUR NOTE (CRITICAL)**

After your deposit is confirmed, you will receive a **note** -- a string of text that looks something like:

```
privacylayer-10xlm-0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890-0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba
```

This note contains your nullifier and secret. **Without this note, you CANNOT withdraw your funds. There is NO recovery mechanism.**

**Backup options**:
- Write it down on paper and store in a secure location
- Save it in a password manager (e.g., Bitwarden, 1Password)
- Store it in an encrypted file on multiple devices
- Do NOT store it in plain text on cloud storage

**Step 4: Confirm Transaction**

Your Freighter wallet will prompt you to confirm the transaction. Review the details and approve.

**Step 5: Transaction Confirmation**

Once the transaction is confirmed on the Stellar network (typically 3-5 seconds), your deposit is complete. The commitment is now in the Merkle tree.

### What If the Deposit Fails?

- **Insufficient balance**: Ensure you have enough XLM plus a small amount for fees.
- **Transaction timeout**: Try again. Stellar transactions sometimes timeout if the network is congested.
- **Contract error**: Note the error message and report it on the [PrivacyLayer GitHub repository](https://github.com/ANAVHEOBA/PrivacyLayer/issues).

---

## 4. Making a Withdrawal

### Step-by-Step Guide

**Step 1: Enter Your Note**

Navigate to the Withdraw page and paste the note you received during deposit. PrivacyLayer will parse the note to extract the nullifier and secret.

**Step 2: Choose Recipient Address**

Enter the Stellar address where you want to receive your funds. This can be:
- A different address than the one you used to deposit (recommended for privacy)
- A brand new address (maximum privacy)
- The same address you used to deposit (reduces privacy)

**Step 3: Generate Zero-Knowledge Proof**

PrivacyLayer will:
1. Sync the Merkle tree state from the blockchain
2. Find your commitment in the tree
3. Generate a Merkle proof that your commitment exists in the tree
4. Generate a Groth16 zero-knowledge proof using the Noir prover (runs in your browser via WASM)

> **Note**: Proof generation takes approximately 10-30 seconds depending on your device. This is normal -- the cryptographic computation is complex.

**Step 4: Submit Proof to Contract**

The smart contract will:
1. Verify the Groth16 proof using BN254 elliptic curve pairing (native Stellar Protocol 25)
2. Check that the nullifier has not been spent before
3. Mark the nullifier as spent
4. Transfer funds to your recipient address

**Step 5: Confirmation**

Once verified, funds are transferred to your recipient address. The withdrawal is complete.

### What If the Withdrawal Fails?

- **Note invalid**: Double-check that you copied the note correctly, including all characters.
- **Nullifier already spent**: This note has already been used to withdraw. Each note can only be used once.
- **Proof generation failed**: Try refreshing the page and attempting again. Ensure you have a stable internet connection.
- **Merkle tree sync failed**: The dApp needs to sync the latest tree state. Wait a moment and try again.

---

## 5. Note Management

### How Notes Work

A PrivacyLayer note contains:
- **Denomination**: The amount deposited (e.g., 10 XLM)
- **Nullifier**: A unique identifier used to prevent double-spending
- **Secret**: A random value combined with the nullifier to create the commitment

The note is the ONLY proof that you deposited funds. Treat it like cash.

### Secure Backup Practices

1. **Multiple copies**: Store your note in at least 2-3 different secure locations.
2. **Physical backup**: Write it on paper and store in a safe or safety deposit box.
3. **Digital backup**: Use a password manager or encrypted file.
4. **Test your backup**: Before making a large deposit, try a small test deposit and verify you can withdraw using your backup.

### Lost Notes

**There is no recovery mechanism for lost notes.** The zero-knowledge system is designed so that only the note holder can withdraw. This is a privacy feature, not a bug.

If you lose your note, the deposited funds remain in the pool forever. They cannot be recovered by anyone -- not even the PrivacyLayer team.

### Multiple Notes

You can make multiple deposits, each generating a separate note. Each note corresponds to one withdrawal. Keep track of all your notes and their associated amounts.

---

## 6. Security Best Practices

### Protecting Your Privacy

1. **Never share your note**: Sharing your note allows anyone to withdraw your funds.

2. **Use different recipient addresses**: For maximum privacy, withdraw to a different address than the one you deposited from.

3. **Wait between deposit and withdrawal**: Withdrawing immediately after depositing is suspicious. The longer you wait, the larger your anonymity set.

4. **Avoid patterns**: Don't always deposit and withdraw the same amount on the same day of the week.

5. **Network privacy**: Use a VPN or Tor to hide your IP address from the PrivacyLayer dApp and blockchain nodes.

### Protecting Your Funds

1. **Verify the contract address**: Always verify you are interacting with the official PrivacyLayer contract.

2. **Check the URL**: Ensure you are on the correct website. Bookmark it to avoid phishing.

3. **Small test transactions**: Before depositing large amounts, test with a small deposit and withdrawal.

4. **Keep software updated**: Ensure your browser and Freighter wallet are up to date.

5. **Hardware wallet**: Consider using a hardware wallet (Ledger) with Freighter for additional security.

---

## 7. Privacy Considerations

### Anonymity Set

Your privacy depends on the "anonymity set" -- the number of other deposits that could be yours. A larger anonymity set means better privacy.

- **Deposit timing**: The longer you wait between deposit and withdrawal, the more other deposits accumulate, increasing your anonymity set.
- **Denomination choice**: Popular denominations have larger anonymity sets.
- **Pool size**: As PrivacyLayer grows, anonymity sets increase.

### Timing Attacks

An observer watching the blockchain can see:
- When deposits and withdrawals occur
- How many deposits and withdrawals happen in a given period

To mitigate timing attacks:
- Wait at least several hours (ideally days) between deposit and withdrawal
- Make deposits during high-activity periods when more transactions are happening
- Consider making multiple deposits at different times

### Amount Correlation

Fixed denominations prevent basic amount correlation. However:
- If you deposit 1000 XLM and a 1000 XLM withdrawal happens 5 minutes later, observers might suspect a connection.
- Mixing different denominations can improve privacy.

### Network Privacy

PrivacyLayer does not protect your network-level privacy. For complete anonymity:
- Use the PrivacyLayer dApp through Tor
- Use a VPN when connecting to Stellar nodes
- Avoid using the same IP address for deposit and withdrawal

---

## 8. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Insufficient balance" | Add more XLM to your wallet. You need the deposit amount plus a small fee (~0.00001 XLM). |
| "Transaction failed" | Network congestion. Wait a moment and try again. |
| "Invalid note" | Check for typos or missing characters in your note. |
| "Nullifier already spent" | This note has been used. Check if you already withdrew. |
| "Proof generation failed" | Refresh the page and try again. Ensure stable internet. |
| "Merkle sync failed" | Wait for the dApp to sync with the blockchain. Try again in 30 seconds. |
| Freighter not connecting | Ensure Freighter is installed and unlocked. Try refreshing the page. |

### Getting Help

- **GitHub Issues**: Report bugs at [github.com/ANAVHEOBA/PrivacyLayer/issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- **Documentation**: Refer to the [README](../README.md) and [CONTRIBUTING](../CONTRIBUTING.md) guides
- **Community**: Join the PrivacyLayer community channels (links TBD)

---

## 9. FAQ

**Q: Is PrivacyLayer free to use?**
A: There is no platform fee. You only pay standard Stellar transaction fees (~0.00001 XLM per transaction).

**Q: How long does a deposit take?**
A: Stellar transactions confirm in 3-5 seconds. Your deposit will be available for withdrawal almost instantly.

**Q: How long does a withdrawal take?**
A: Withdrawals take 10-30 seconds for proof generation, plus 3-5 seconds for transaction confirmation.

**Q: Can I deposit any amount?**
A: No. PrivacyLayer uses fixed denominations to prevent amount-based analysis. See the supported denominations in Section 3.

**Q: What happens if the dApp goes offline?**
A: Your funds remain safe in the smart contract. You can interact with the contract directly using the Stellar CLI or Soroban SDK, though this requires technical knowledge.

**Q: Is PrivacyLayer anonymous?**
A: PrivacyLayer provides on-chain privacy (no link between deposit and withdrawal). It does NOT hide your IP address or network activity. Use VPN/Tor for complete anonymity.

**Q: Can I withdraw to a different address than I deposited from?**
A: Yes! That's the whole point. Withdrawing to a different address is recommended for maximum privacy.

**Q: What if I forget to back up my note?**
A: Without your note, you cannot withdraw your funds. There is no recovery mechanism. Always back up your note immediately after depositing.

**Q: Can I use PrivacyLayer on mobile?**
A: The dApp is web-based and should work in mobile browsers, though we recommend using a desktop browser for the best experience.

**Q: Is PrivacyLayer audited?**
A: As of now, PrivacyLayer has not undergone a formal security audit. Use at your own risk. We recommend starting with small amounts.

**Q: What Stellar assets does PrivacyLayer support?**
A: PrivacyLayer currently supports XLM and USDC on Stellar Mainnet.

---

## Glossary

| Term | Definition |
|------|------------|
| **Commitment** | A cryptographic hash of your nullifier and secret, stored on-chain |
| **Nullifier** | A unique value that prevents double-spending; revealed during withdrawal |
| **Secret** | A random value known only to you; combined with nullifier to create commitment |
| **Note** | The complete deposit receipt containing denomination, nullifier, and secret |
| **ZK Proof** | Zero-knowledge proof -- proves you know something without revealing what you know |
| **Groth16** | A specific type of zero-knowledge proof system used by PrivacyLayer |
| **BN254** | An elliptic curve used for cryptographic operations |
| **Poseidon** | A hash function optimized for zero-knowledge proofs |
| **Merkle Tree** | A data structure that efficiently proves membership of a value in a set |
| **Anonymity Set** | The group of deposits that your withdrawal could potentially correspond to |
| **Shielded Pool** | A smart contract that holds deposited funds and enables private withdrawals |

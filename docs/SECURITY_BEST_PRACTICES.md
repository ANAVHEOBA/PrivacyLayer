# Security Best Practices for PrivacyLayer

> **A comprehensive guide for users of the PrivacyLayer shielded pool on Stellar Soroban.**

> ⚠️ **AUDIT STATUS: Unaudited.** PrivacyLayer uses zero-knowledge cryptography with battle-tested primitives (BN254, Poseidon), but the implementation has not yet undergone a formal security audit. Use with caution and never deposit more than you can afford to lose.

---

## Table of Contents

1. [Understanding PrivacyLayer](#understanding-privatelayer)
2. [Note Management](#1-note-management)
3. [Privacy Practices](#2-privacy-practices)
4. [Operational Security](#3-operational-security)
5. [Common Mistakes](#4-common-mistakes)
6. [Threat Model](#5-threat-model)
7. [Emergency Procedures](#6-emergency-procedures)
8. [Quick Reference Checklist](#quick-reference-checklist)

---

## Understanding PrivacyLayer

PrivacyLayer is a **shielded pool** on Stellar. You deposit a fixed amount of XLM or USDC, receive a secret **note**, and later withdraw to a different address using a zero-knowledge proof. The proof demonstrates you deposited — without revealing *which* deposit was yours.

### How It Works (Key Concepts)

```
DEPOSIT                              WITHDRAW
┌─────────────────────┐              ┌──────────────────────────┐
│ 1. Generate note    │              │ 1. Open note             │
│    (nullifier +     │              │ 2. Generate ZK proof     │
│     secret)         │              │    "I know a commitment  │
│ 2. Hash → commit    │              │     in the Merkle tree"  │
│ 3. Send commitment  │              │ 3. Submit proof to       │
│    to contract      │              │    contract              │
│ 4. RECEIVE NOTE ←   │              │ 4. Receive funds at      │
│    KEEP THIS SAFE!  │              │    new address           │
└─────────────────────┘              └──────────────────────────┘
```

| Component | What It Is | Why It Matters |
|-----------|-----------|----------------|
| **Note** | Your deposit receipt — contains `nullifier` + `secret` | Without it, you cannot withdraw. With it, anyone can withdraw your funds. |
| **Nullifier** | A unique value revealed at withdrawal time | Prevents double-spending. Once revealed, that deposit can never be withdrawn again. |
| **Secret** | A random value only you know | Combined with nullifier via Poseidon hash to create the on-chain commitment. |
| **Commitment** | `Poseidon(nullifier ∥ secret)` — the public deposit record | Stored in the on-chain Merkle tree. No one can derive nullifier/secret from this. |

---

## 1. Note Management

Your note is **the single most important artifact** in PrivacyLayer. It is the *only* way to withdraw your funds.

### Backup Your Note Immediately

After every deposit, back up your note **before** closing the application.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  RULE: If you lose your note, your funds are GONE.      │
│      There is no recovery mechanism. No support ticket       │
│      can help. No admin can retrieve it. This is by design.  │
└──────────────────────────────────────────────────────────────┘
```

**Recommended backup methods (in order of preference):**

| Method | Setup | Risk |
|--------|-------|------|
| **Encrypted file on USB drive** | Save note to a `.txt` file. Encrypt with `gpg` or VeraCrypt. Store USB in a safe. | Physical theft if unencrypted. |
| **Password manager** | Create a secure entry in Bitwarden, 1Password, or KeePassXC. | Password manager compromise. |
| **Paper backup** | Write the note on paper. Store in a fireproof safe or safety deposit box. | Fire, water damage, legibility. |
| **Encrypted cloud storage** | Encrypt with a strong passphrase before uploading to cloud. | Cloud provider breach. |

### What a Note Looks Like

A PrivacyLayer note typically encodes:
- **Nullifier**: 32 bytes (hex string)
- **Secret**: 32 bytes (hex string)
- **Denomination**: e.g., `XLM100`
- **Leaf index**: Position in the Merkle tree

Example (conceptual):
```
privacylayer-xlm100-abc123...def456-7
│               │     │          │
│               │     │          └── leaf index
│               │     └── nullifier ∥ secret (hex)
│               └── denomination
└── protocol identifier
```

> **Never** truncate or modify any part of the note. Store it exactly as provided.

### Never Share Your Note

- **Do not** send your note over email, Discord, Telegram, or any messaging platform.
- **Do not** paste your note into websites, even if they claim to be affiliated with PrivacyLayer.
- **Do not** share screenshots of your note.
- **Do not** store your note in plaintext on a device connected to the internet.

Treat your note like a **bearer bond** — whoever possesses it can redeem the funds.

### Recovery Is Impossible

This is not a limitation — it is a **fundamental property** of the system:

- The contract stores `Poseidon(nullifier ∥ secret)` — a one-way hash.
- Even the contract admin cannot reverse this hash.
- There is no "forgot password" flow.
- There is no seed phrase that can reconstruct the note.

```
┌─────────────────────────────────────────────┐
│  Lost note = Lost funds. Permanently.       │
│  This is the tradeoff for privacy.          │
└─────────────────────────────────────────────┘
```

---

## 2. Privacy Practices

PrivacyLayer provides *transaction* privacy — it breaks the on-chain link between deposit and withdrawal. But privacy is a **practice**, not just a protocol. Your behavior can leak information even when the cryptography is perfect.

### Timing: Wait Between Deposit and Withdrawal

**The single most important privacy rule.**

```
 ❌ DON'T                              ✅ DO
 Deposit → immediate Withdraw         Deposit → wait hours/days → Withdraw
```

**Why?** If you deposit 100 XLM and someone withdraws 100 XLM 30 seconds later, statistical analysis makes the link obvious — even though the ZK proof is mathematically sound.

**Recommended waiting periods:**

| Pool Size (total deposits) | Minimum Wait | Recommended Wait |
|---------------------------|-------------|-----------------|
| < 100 deposits | 24 hours | 72 hours |
| 100–1,000 deposits | 4 hours | 24 hours |
| > 1,000 deposits | 1 hour | 8 hours |

The larger the pool's **anonymity set**, the less timing matters. But early in the pool's life, timing analysis is your biggest vulnerability.

### Use Different Addresses

- **Deposit** from Address A.
- **Withdraw** to Address B.
- Never link A and B on-chain (no transfers between them).
- Ideally, A and B were never funded from the same source.

```
  GOOD:   Exchange → Address A → [Deposit] → [Withdraw] → Address B → DeFi
                (no on-chain path from A to B)

  BAD:    Exchange → Address A → [Deposit] → [Withdraw] → Address A
                (same address defeats the purpose)
```

### Avoid Patterns

- **Don't deposit and withdraw the same denomination repeatedly.** If you need ongoing privacy, deposit different amounts across time (remember: denominations are fixed, so timing is the variable).
- **Don't always withdraw to the same destination address.** If you withdraw to the same exchange or contract repeatedly, an observer can correlate withdrawals.
- **Don't announce your deposits/withdrawals publicly.** Posting "just deposited 1000 XLM to PrivacyLayer" defeats the purpose.

### Network Privacy

Your IP address can be correlated with on-chain transactions. PrivacyLayer transactions are visible on the Stellar blockchain (even if the *link* between deposit and withdrawal is not).

**Consider:**

| Tool | What It Protects | Setup Difficulty |
|------|-----------------|-----------------|
| **Tor Browser** | Hides your IP from the Stellar RPC node | Medium |
| **VPN (no-log provider)** | Hides your IP from your ISP | Easy |
| **Running your own Stellar node** | No third-party sees your queries | Hard |

For maximum privacy, access PrivacyLayer through Tor and run your own Stellar node.

---

## 3. Operational Security

### Wallet Security

PrivacyLayer works with Stellar wallets (e.g., Freighter, Albedo). Your wallet security is the foundation of your privacy.

- **Use a hardware wallet** (Ledger) for the wallet that deposits into PrivacyLayer. This prevents malware from stealing keys.
- **Set strong PINs** on any wallet application.
- **Never import your wallet seed phrase** into a web browser extension on a shared or public computer.
- **Verify contract addresses** before interacting. Always check the PrivacyLayer contract address against the official README. A malicious lookalike contract can steal your funds.

### Transaction Privacy

Even with PrivacyLayer, your Stellar transactions have metadata:

| Metadata | Visible On-Chain | How to Minimize |
|----------|------------------|-----------------|
| Deposit timestamp | ✅ Yes | Wait before withdrawing (see Timing) |
| Deposit amount | ✅ Yes (denomination) | Use different denominations over time |
| Source address balance | ✅ Yes | Fund deposit address from mixing sources |
| Memo field | ✅ Yes | Never put identifying info in memos |
| Sequence number | ✅ Yes | Use a fresh account for each deposit |

### Browser Fingerprinting

If using a web frontend for PrivacyLayer:

- **Use a fresh browser profile** or private/incognito window.
- **Disable browser extensions** that could track your activity (ad blockers are fine; wallet extensions are necessary).
- **Clear cookies** before and after using PrivacyLayer.
- **Consider Tails OS** for high-privacy operations — a live OS that leaves no traces.

### Smart Contract Interaction Hygiene

- **Verify the contract hash** matches the audited version before depositing.
- **Check the admin address** — if it has changed unexpectedly, do not deposit.
- **Monitor for contract upgrades** — Soroban allows contract updates. Subscribe to the project's GitHub releases.
- **Use testnet first** — practice the full deposit-withdraw cycle on Stellar testnet before using real funds.

---

## 4. Common Mistakes

### ❌ Reusing Addresses

**The mistake:** Depositing and withdrawing to the same Stellar address.

```
User: GABC...1234 → Deposit 100 XLM → ... → Withdraw 100 XLM → GABC...1234
                    ↑                                              ↑
              On-chain observer sees: "GABC...1234 moved 100 XLM through PrivacyLayer"
```

**The fix:** Always withdraw to a **fresh address** that has no transaction history linking it to your deposit address.

### ❌ Immediate Withdrawals

**The mistake:** Withdrawing seconds or minutes after depositing.

**The fix:** Wait at least the minimum recommended time. The anonymity set must have enough activity for your withdrawal to be one of many plausible candidates.

### ❌ Small Anonymity Sets

**The mistake:** Using a denomination that has very few deposits.

```
Pool state for XLM10 denomination:
  - 3 total deposits
  - 1 withdrawal (yours)
  → Anonymity set = 3 (trivially linkable by timing)
```

**The fix:** Check the pool's deposit count (`deposit_count()` on the contract). If it's low for your denomination, either:
- Wait for more deposits before withdrawing.
- Use a more popular denomination.

### ❌ Linking Deposit and Withdrawal Addresses

**The mistake:** Sending funds from your withdrawal address back to your deposit address.

```
Exchange → Address A → Deposit → Withdraw → Address B
                                                     ↓
                                          Transfer back to Address A
                                                     ↓
                                          Observer links A ↔ B (privacy broken)
```

**The fix:** Treat your withdrawal address as completely separate from your deposit address. Never transact between them.

### ❌ Amount Correlation

**The mistake:** Depositing and withdrawing amounts that correlate with your known financial behavior.

```
Public info: "Alice's freelance payment was 100 XLM on March 1"
On-chain:    Someone deposited exactly 100 XLM on March 1
             Someone withdrew exactly 99.9 XLM on March 3
Statistical inference: Alice used PrivacyLayer
```

**The fix:** If timing your deposit to a known event, wait longer before withdrawing. PrivacyLayer's fixed denominations help — everyone deposits the same amounts — but timing is still a signal.

### ❌ Insufficient Backup

**The mistake:** Saving the note only in browser local storage or a single device.

**The fix:** Follow the [Note Management](#1-note-management) section. Use at least two independent backup methods.

---

## 5. Threat Model

Understanding what PrivacyLayer **does** and **does not** protect you from is critical.

### What PrivacyLayer Provides

| Protection | Mechanism | Strength |
|-----------|-----------|----------|
| **Deposit-withdrawal unlinkability** | Groth16 ZK proof on BN254 | Cryptographic (assuming trusted setup is valid) |
| **Double-spend prevention** | On-chain nullifier set | Guaranteed by contract logic |
| **Commitment hiding** | Poseidon hash (one-way) | Computational (hardness of hash inversion) |
| **Balance privacy** | Fixed denominations | No amount to correlate |

### What PrivacyLayer Does NOT Provide

| NOT Protected | Why | Mitigation |
|--------------|-----|------------|
| **Deposit timing** | Deposits are public on-chain | Wait before withdrawing |
| **IP address** | Stellar RPC sees your IP | Use Tor/VPN |
| **Deposit denomination** | Public on-chain | Use popular denominations |
| **Fungibility of withdrawn funds** | Withdrawn XLM/USDC is still traceable on-chain after withdrawal | Withdraw to fresh addresses; use the funds immediately for new transactions |
| **Regulatory compliance** | Privacy tools may attract regulatory scrutiny | Understand your jurisdiction's laws |
| **Metadata at application layer** | If the frontend leaks data | Use Tor, fresh browser profiles |

### Known Attack Vectors

#### 1. Timing Analysis

```
Attacker monitors:  Deposit at T=0, Withdrawal at T=30s
                    → Probability of link: very high
                    → Anonymity set effectively = 1
```

**Defense:** Wait between deposit and withdrawal. The anonymity set grows with each additional deposit.

#### 2. Denomination Fingerprinting

If only one person deposits a specific denomination at a specific time, the withdrawal is linkable even with ZK proofs.

**Defense:** Use common denominations. Wait for sufficient deposit activity.

#### 3. Relayer Centralization

If all withdrawals go through the same relayer, the relayer knows the deposit-withdrawal mapping.

**Defense:** Run your own relayer, or use multiple independent relayers. In PrivacyLayer's basic model, you submit the withdrawal yourself — no relayer is required.

#### 4. Frontend Compromise

A malicious or compromised frontend could:
- Log your note before you back it up.
- Submit your ZK proof to a different contract.
- Leak your IP address.

**Defense:** Verify the frontend's source code (if open-source), use browser developer tools to inspect network requests, and consider interacting with the contract directly via CLI.

#### 5. Trusted Setup Compromise

Groth16 requires a trusted setup ceremony. If the toxic waste is compromised, a malicious actor could forge proofs and drain the pool.

**Defense:** Verify the trusted setup ceremony's transparency and multi-party participation. The Noir proving system's trusted setup should be publicly auditable.

---

## 6. Emergency Procedures

### Lost Note

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  LOST NOTE = LOST FUNDS                                 │
│                                                              │
│  There is no recovery. The funds remain locked in the pool   │
│  forever. This is by design — it prevents anyone (including  │
│  the admin) from seizing your funds.                         │
└──────────────────────────────────────────────────────────────┘
```

**What to do:**
1. Check all your backup locations (USB, password manager, paper, cloud).
2. Search your device for any files containing the note string.
3. If truly lost: accept the loss. Do not fall for scams claiming to "recover" your note.
4. **Lesson learned:** For future deposits, use at least two independent backup methods.

### Compromised Wallet

If you believe your Stellar wallet's private key has been compromised:

1. **Immediately withdraw** all funds from PrivacyLayer to a **new, clean wallet** — using the compromised wallet is fine for withdrawals (you're sending TO a safe address).
2. If you have *deposited but not yet withdrawn*, you can still withdraw — the ZK proof does not require the deposit wallet's key. You only need the note.
3. Generate a completely new Stellar keypair on a clean device.
4. Do not reuse the compromised keypair for anything.

### Contract Paused

The PrivacyLayer admin can pause deposits and withdrawals via the `pause()` function. If the contract is paused:

1. **Don't panic.** Your funds are not lost. Pausing is a safety mechanism.
2. Check the project's GitHub and social channels for an explanation.
3. Wait for the admin to unpause.
4. If the admin is unresponsive or malicious, the contract's open-source nature means the community can deploy a new instance (but existing deposits in the paused contract remain until unpaused).

### Suspected Contract Vulnerability

If you discover a vulnerability in the PrivacyLayer contract or circuits:

1. **Do not exploit it.**
2. **Do not discuss it publicly.**
3. Report it privately to the project maintainers via GitHub (open a security advisory) or direct contact.
4. Allow reasonable time for a fix before disclosing.

---

## Quick Reference Checklist

Use this checklist before every PrivacyLayer interaction:

### Before Deposit
- [ ] I have verified the contract address matches the official source.
- [ ] I am depositing from a well-funded, secure wallet.
- [ ] I have prepared at least **two backup locations** for my note.
- [ ] I understand that losing my note means losing my funds permanently.
- [ ] I am using a popular denomination (check `deposit_count()`).

### After Deposit
- [ ] I have saved my note to my primary backup.
- [ ] I have saved my note to my secondary backup.
- [ ] I have verified both backups are readable (open them and check).
- [ ] I am **waiting** before withdrawing (minimum recommended time).

### Before Withdrawal
- [ ] I have my note ready.
- [ ] I am withdrawing to a **fresh address** (no link to my deposit address).
- [ ] I have waited the recommended time since deposit.
- [ ] I understand the withdrawn funds are traceable on-chain after withdrawal.

### Ongoing
- [ ] My note backups are stored securely (encrypted, offline).
- [ ] I am not reusing deposit/withdrawal addresses.
- [ ] I am using VPN or Tor for network privacy.
- [ ] I have read the [Threat Model](#5-threat-model) section.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Anonymity set** | The group of deposits your withdrawal could plausibly be linked to. Larger = more private. |
| **Commitment** | `Poseidon(nullifier ∥ secret)` — the public hash stored on-chain. |
| **Groth16** | The zero-knowledge proof system used to verify withdrawals without revealing which deposit is being spent. |
| **Merkle tree** | An on-chain data structure storing all deposit commitments. Proves a commitment exists without revealing which one. |
| **Note** | Your private deposit receipt containing nullifier and secret. Required to withdraw. |
| **Nullifier** | A unique value revealed at withdrawal time to prevent double-spending. |
| **Poseidon** | A hash function optimized for zero-knowledge circuits. Used to create commitments. |
| **Shielded pool** | A smart contract that accepts deposits and allows anonymous withdrawals via ZK proofs. |
| **ZK proof** | Zero-knowledge proof — a cryptographic proof that reveals no information beyond the statement being proven. |

---

*Last updated: March 2026*
*For questions or corrections, open an issue on the [PrivacyLayer GitHub repository](https://github.com/ANAVHEOBA/PrivacyLayer).*

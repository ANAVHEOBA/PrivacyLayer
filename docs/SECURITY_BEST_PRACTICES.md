# 🛡️ PrivacyLayer Security Best Practices Guide

> **Protect your privacy. Protect your funds.** This guide explains how to use PrivacyLayer safely and effectively.

---

## Table of Contents

1. [Note Management](#1-note-management)
2. [Privacy Practices](#2-privacy-practices)
3. [Operational Security](#3-operational-security)
4. [Common Mistakes](#4-common-mistakes)
5. [Threat Model](#5-threat-model)
6. [Emergency Procedures](#6-emergency-procedures)

---

## 1. Note Management

### 1.1 What Is a Note?

A **note** is your secret proof of deposit. It contains two critical values:

- **Nullifier** — a unique secret that identifies your deposit on-chain
- **Secret** — random data used to derive your commitment

Together, these form a **note** that proves you own the deposited funds. **Losing a note means losing access to those funds permanently.**

### 1.2 Backup Strategies

#### ✅ Do This

- **Export immediately** after every deposit. Do not rely on memory or local storage.
- Save notes in **at least 2 separate locations**:
  - Encrypted file on an air-gapped computer
  - Hardware wallet seed phrase backup (if the note is incorporated into a seed phrase system)
  - Encrypted USB drive stored in a secure physical location
- Use **password-protected encrypted archives** (e.g., GPG symmetric encryption: `gpg --symmetric --cipher-algo AES256 note.txt`)
- Label backups clearly so you or your trusted contacts can identify them in an emergency

#### ❌ Never Do This

- **Never** take a screenshot of your note. Screenshots sync to cloud services and can be extracted from backup files.
- **Never** paste notes into chat apps (Telegram, Discord, email). These services log messages on servers.
- **Never** store notes in plain text on your phone or computer.
- **Never** send notes to yourself via email or messaging apps as a "backup."
- **Never** share notes with anyone, including people claiming to be support staff.

### 1.3 Secure Storage

| Storage Method | Security Level | Notes |
|---------------|---------------|-------|
| Hardware wallet (encrypted) | 🟢 Excellent | Best for large amounts |
| Air-gapped computer | 🟢 Excellent | No network access |
| Encrypted USB drive | 🟡 Good | Physical security required |
| Password manager (encrypted) | 🟡 Good | Use a strong master password |
| Cloud storage (encrypted by you) | 🟡 Good | Ensure encryption is client-side |
| Plain USB drive | 🔴 Dangerous | Too easy to lose or steal |
| Screenshot / Notes app | 🔴 Dangerous | No encryption, easy to extract |

### 1.4 Recovery Impossibility

> ⚠️ **Critical:** PrivacyLayer is designed so that **no one — not even the PrivacyLayer team — can recover a lost note.**

This is a fundamental property of zero-knowledge proofs:

- The contract only stores **commitments** (hashed values), not the underlying secrets.
- Without the original note, there is no way to generate a valid withdrawal proof.
- There is no backdoor, no admin override, and no recovery mechanism.
- If you lose your note, your deposited funds are **permanently unrecoverable**.

**Before depositing, ensure you have a reliable backup system in place.**

---

## 2. Privacy Practices

### 2.1 Wait Time Between Deposit and Withdrawal

The **anonymity set** (the group of deposits your transaction is mixed with) grows over time. Withdrawing immediately after depositing creates a **temporal link** that can be used to de-anonymize transactions.

#### Recommended Wait Times

| Amount Size | Minimum Wait | Recommended Wait |
|-------------|-------------|------------------|
| Small (< $100 equivalent) | 4 hours | 24 hours |
| Medium ($100–$1,000) | 12 hours | 3–7 days |
| Large (> $1,000) | 3 days | 2–4 weeks |

> **Rule of thumb:** The larger your deposit relative to the pool's activity, the longer you should wait before withdrawing.

### 2.2 Use Different Addresses

Always withdraw to a **fresh address** that has never been associated with your real identity:

- **Do not** withdraw to an exchange deposit address (exchanges link all transactions to your identity via KYC).
- **Do not** withdraw to an address you've used before in a non-private context.
- **Do** use a brand-new Stellar account created specifically for this withdrawal.
- **Do** consider using a sub-account if your wallet supports account creation.

#### Address Checklist Before Withdrawal

- [ ] The withdrawal address has never received funds from a KYC'd source
- [ ] The withdrawal address has no transaction history on-chain
- [ ] You control the private key for this address (not a custodial wallet)
- [ ] The address is not associated with any identity-revealing service

### 2.3 Avoid Patterns

Traffic analysis can link deposits to withdrawals even with time delays:

- **Avoid regular intervals.** If you deposit every Monday at 9 AM and withdraw every Tuesday, patterns emerge.
- **Avoid round numbers.** Withdrawing exactly 100.0000000 XLM is more identifiable than 99.8472913 XLM.
- **Avoid repeated amounts.** If you always deposit exactly 500 XLM, correlating transactions becomes easier.
- **Vary your deposit/withdrawal sizes** to blend into the broader distribution of transactions.

### 2.4 Network Privacy (VPN / Tor)

Your IP address can be a linking vector:

- **Connect to the PrivacyLayer interface through a VPN** to prevent IP-based transaction correlation.
- **Use Tor Browser** for maximum network-level anonymity (ensure JavaScript is enabled for the app to function).
- **Avoid using the same VPN exit node** for both deposit and withdrawal transactions.
- **Be aware of DNS leaks** — use `dns leak test` sites to verify your VPN is working correctly.

> **Note:** PrivacyLayer itself does not log IPs, but your ISP and network infrastructure may.

---

## 3. Operational Security

### 3.1 Wallet Security

Your Stellar wallet is the gateway to PrivacyLayer. Protect it accordingly:

#### Hot Wallet (For Regular Use)

- Use a **non-custodial wallet** (e.g.,LOBSTR, Solar Wallet, or a self-hosted Freighter).
- Enable **all available security features**: PIN/biometric, app lock, spending limits.
- Keep only the amount you're actively using in the hot wallet.
- Never share your private key or seed phrase. PrivacyLayer will never ask for it.

#### Cold Storage (For Large Amounts)

- For amounts exceeding your personal comfort threshold, use a **hardware wallet** (Ledger, Trezor).
- Hardware wallets keep private keys physically isolated from internet-connected devices.
- Set up a **watch-only address** in your hot wallet to monitor your cold storage without exposing the keys.

#### Seed Phrase Backup

- Write your seed phrase on **paper** (laminate it for durability) or use a **metal seed phrase backup** (e.g., Cryptosteel, Billfodl).
- Store the backup in a **secure physical location** (safe, bank deposit box).
- **Never** take a digital photo or scan of your seed phrase.
- **Never** store your seed phrase in a password manager that is accessed from an internet-connected device.

### 3.2 Transaction Privacy

#### On-Chain Behavior

- **Do not** transact directly from your PrivacyLayer withdrawal address. Send funds to a **intermediary address first**, then to the final destination.
- **Break up amounts.** If you withdraw 1,000 XLM but need to pay 3 different people, split the funds through separate intermediary addresses, not from one transaction.
- **Avoid blockchain explorers.** Paste your addresses into public block explorers as little as possible — these services can log and correlate your queries with your IP.

#### Intermediary Address Pattern

```
PrivacyPool Withdrawal
        ↓ (fresh address A)
  Intermediary Address (1-7 days)
        ↓ (split or mix)
  Final Destination Addresses
```

### 3.3 Metadata Protection

Even if your transaction is private, metadata can betray you:

- **Browser fingerprinting:** Use a dedicated browser profile or Firefox with strict privacy settings for PrivacyLayer. Avoid Chrome (Google ties everything to your account).
- **Timezone consistency:** If your computer is set to UTC+8 but your VPN is in Germany, that mismatch is a data point.
- **System font list:** Unusual fonts installed on your system can be used to identify you.
- **Canvas / WebGL fingerprints:** Use privacy extensions (uBlock Origin, Canvas Blocker) to prevent fingerprinting.

#### Recommended Browser Setup

```
Browser: Firefox (with Multi-Account Containers) or Tor Browser
Extensions: uBlock Origin, Canvas Blocker, HTTPS Everywhere
VPN: Enabled (ideally a no-log VPN provider)
JavaScript: Enabled (required for PrivacyLayer UI)
Cookies: Clear between sessions or use container tabs
```

### 3.4 Browser Fingerprinting

PrivacyLayer's web interface can be vulnerable to browser fingerprinting:

| Fingerprint Vector | Risk Level | Mitigation |
|-------------------|-----------|-----------|
| Canvas rendering | Medium | Use Canvas Blocker extension |
| WebGL renderer | Medium | Disable WebGL or use privacy extension |
| Screen resolution | Low | Use standard resolution (1920×1080) |
| Timezone | Low | Set to UTC or match VPN location |
| Installed fonts | Low-Medium | Use system fonts only |
| User agent | Low | Don't customize; use defaults |

---

## 4. Common Mistakes

### 4.1 Reusing Addresses

**The classic privacy mistake.** Using the same address for deposits and withdrawals creates an **on-chain link** between your identity and your private transaction.

**Impact:** Even if your withdrawal is private, the public ledger will show that Address A (which may be linked to your identity) sent funds to the privacy pool, and Address B (your withdrawal address) received funds. Chain analysis firms can use this link to reduce the anonymity set dramatically.

**Fix:** Always use fresh addresses for every transaction.

### 4.2 Immediate Withdrawals

Depositing and withdrawing the same amount within a short time window creates a **temporal correlation**.

**Impact:** If you deposit 500 XLM at 10:00 AM and withdraw 500 XLM at 10:05 AM, it's trivial to infer that these are the same transaction. Chain analysis reduces the effective anonymity set to a handful of transactions.

**Fix:** Always wait the recommended time before withdrawing (see Section 2.1).

### 4.3 Small Anonymity Sets

Withdrawing a **unique amount** when the pool has few deposits creates a trivially identifiable transaction.

**Example:** If only one person deposited exactly 1,337.0000000 XLM in the past week, withdrawing that exact amount immediately identifies your transaction, regardless of wait time.

**Fix:** Choose deposit amounts that match common transaction sizes in the pool. Avoid odd, specific amounts.

### 4.4 Linking Transactions

Sending the **same amount** to and from the pool from the **same IP address** or device can create a linking vector.

**Impact:** Even if the on-chain transaction is private, network-level correlation can connect:
1. Your deposit transaction (from your IP)
2. Your withdrawal transaction (from your IP or same device)

**Fix:** Use different devices or VPNs for deposit and withdrawal. Wait between transactions. Split amounts.

### 4.5 Assuming Perfect Privacy

PrivacyLayer provides **probabilistic privacy**, not absolute anonymity.

- The anonymity set determines how many possible deposits your withdrawal could come from.
- A withdraw from a pool with only 3 deposits is **83% identifiable** (1 out of 3).
- A withdraw from a pool with 1,000 deposits is **0.1% identifiable**.
- **The larger the pool and the longer the wait, the better your privacy.**

---

## 5. Threat Model

### 5.1 What Privacy Is Provided

PrivacyLayer breaks the **on-chain link** between deposit and withdrawal addresses using zero-knowledge proofs:

- ✅ The Stellar network does not know which deposit corresponds to which withdrawal
- ✅ Block explorers cannot trace funds through the PrivacyLayer contract
- ✅ Chain analysis firms cannot automatically link deposit and withdrawal addresses
- ✅ There is no on-chain record of the amount, sender, or receiver within the pool

### 5.2 What Privacy Is NOT Provided

PrivacyLayer is not a silver bullet. The following are **NOT protected** by the protocol:

- 🔴 **IP address correlation** (without additional tools like VPN/Tor)
- 🔴 **Timing correlation** (deposits and withdrawals at the same time are linkable)
- 🔴 **Amount correlation** (exact-amount matches reduce anonymity set)
- 🔴 **KYC-linked addresses** (if you withdraw to a KYC'd exchange, your identity is revealed)
- 🔴 **Browser fingerprinting** (your browser setup can identify you)
- 🔴 **Network-level attacks** (ISP surveillance, VPN logging, exit node monitoring)
- 🔴 **Social engineering** (you can still be tricked into revealing your note)

### 5.3 Attack Scenarios

#### Chain Analysis (Most Common Threat)

An adversary (exchange, chain analysis firm, government agency) monitors the Stellar network and tries to link deposits to withdrawals.

**Mitigation:** Wait longer than the anonymity set growth curve. Split amounts. Use fresh addresses.

#### Front-Running

An adversary watches the mempool for PrivacyLayer deposits and tries to front-run by depositing a large amount to reduce your effective anonymity set.

**Mitigation:** Split deposits across multiple transactions. Wait between deposits. Use privacy-preserving transaction submission.

#### Collusion Between Depositors

If multiple parties collaborate, they can share deposit data to narrow down withdrawal candidates.

**Mitigation:** Assume some depositors may be adversarial. Use non-standard amounts and timing.

#### Quantum Computing Threat

Future quantum computers could potentially break the Groth16 zkSNARK proofs used by PrivacyLayer.

**Current mitigation:** PrivacyLayer uses Stellar Protocol 25's BN254 curve. Post-quantum alternatives are an active research area. Monitor developments and consider moving funds if a quantum threat becomes practical.

### 5.4 Limitations

- **Fixed denominations only.** PrivacyLayer currently supports fixed-denomination deposits (e.g., 1, 10, 100 XLM). Splitting or combining denominations reveals amounts.
- **No smart contract composability.** PrivacyLayer withdrawals cannot be automatically routed into other DeFi protocols without revealing the withdrawal address.
- **Liquidity dependency.** Privacy is only as strong as the pool's activity. Low-liquidity pools have reduced anonymity sets.
- **Bridge privacy.** PrivacyLayer provides privacy within the Stellar ecosystem. Bridging to other chains may reveal information.

---

## 6. Emergency Procedures

### 6.1 Lost Note

If you have lost or accidentally deleted your note backup:

1. **Search thoroughly** in all backup locations (encrypted drives, password managers, physical locations).
2. **Check email archives** (if you ever emailed yourself a backup).
3. **Check cloud storage** (Google Drive, Dropbox — if you used cloud backup, the file may still be there).
4. **Accept the reality:** If the note is genuinely lost, the funds are **permanently unrecoverable**. No one can help you. This is by design.

#### Prevention Checklist

- [ ] Note exported immediately after deposit
- [ ] At least 2 physical backup copies exist
- [ ] Backup locations are secure and independent
- [ ] You have tested restoring from backup (try a small amount first)

### 6.2 Compromised Wallet

If you believe your Stellar wallet private key has been compromised:

1. **Transfer all funds immediately** to a new, secure wallet (not through PrivacyLayer — that reveals your address).
2. **Do not** use PrivacyLayer to transfer the funds — a compromised device may also be logging your PrivacyLayer activity.
3. **Create a new wallet** on a clean, malware-free device.
4. **Generate a new PrivacyLayer note** if you have existing deposits and still have their notes.

> **Note:** If your wallet was compromised **before** you deposited into PrivacyLayer, the attacker may have sent funds directly. In this case, PrivacyLayer cannot help — the transaction is already on-chain.

### 6.3 Contract Paused

The PrivacyLayer contract has an **admin pause function** for emergency situations (critical vulnerability detected, governance attack, etc.).

If the contract is paused:

- **Deposits are disabled.** You cannot deposit new funds.
- **Withdrawals are disabled.** You cannot withdraw existing funds during the pause.
- **Funds remain safe.** Your funds are locked in the contract and are not at risk.
- **Monitor official channels** for updates on unpausing and next steps.

The pause function exists to protect users. In most cases, a pause means a serious issue was discovered and the team needs time to fix it. **Do not panic.** Follow official announcements.

### 6.4 Support Resources

> ⚠️ **警惕钓鱼:** 永远不要向"支持人员"分享你的种子短语或 note。

| Resource | URL / Contact | Use Case |
|----------|---------------|----------|
| Official GitHub | github.com/ANAVHEOBA/PrivacyLayer | Issue tracking, bug reports |
| PrivacyLayer Docs | `docs/USER_GUIDE.md` | Usage instructions |
| Stellar Development Foundation | stellar.org | Soroban/Protocol updates |
| Security Disclosures | (Check GitHub for PGP contact) | Report security vulnerabilities |

**PrivacyLayer team will NEVER:**
- Ask for your seed phrase or private key
- Ask for your note
- Ask you to send funds to an "official" address
- Request remote access to your device

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  PRIVACYLAYER — DO'S & DON'TS           │
├─────────────────────────────────────────────────────────┤
│ ✅ ALWAYS                                                   │
│  - Backup notes immediately after deposit                 │
│  - Wait before withdrawing (min 4h, rec. 24h+)           │
│  - Use fresh addresses for every withdrawal              │
│  - Use VPN/Tor for network-level anonymity              │
│  - Split amounts to avoid pattern matching              │
│  - Use non-custodial wallets                            │
├─────────────────────────────────────────────────────────┤
│  ❌ NEVER                                                   │
│  - Share your note with anyone                          │
│  - Withdraw to a KYC'd exchange address                 │
│  - Deposit and withdraw immediately                     │
│  - Use the same address for deposit and withdrawal      │
│  - Use a screenshot or plain text for note storage      │
│  - Send funds directly from PrivacyLayer to an exchange │
└─────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-03-26 | PrivacyLayer v1.0 | For the latest version, see [github.com/ANAVHEOBA/PrivacyLayer](https://github.com/ANAVHEOBA/PrivacyLayer)*

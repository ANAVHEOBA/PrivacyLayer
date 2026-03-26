# Security Best Practices Guide

> 🔐 Protect your privacy. Protect your funds. This guide covers essential security practices for using PrivacyLayer.

---

## Table of Contents

1. [Note Management](#1-note-management)
2. [Privacy Practices](#2-privacy-practices)
3. [Operational Security](#3-operational-security)
4. [Common Pitfalls](#4-common-pitfalls)
5. [Emergency Procedures](#5-emergency-procedures)

---

## 1. Note Management

Your note is the **only proof of your deposit**. Loss of note = permanent loss of funds. There is no recovery mechanism.

### 1.1 Backup Strategies

| Method | Recommended | Notes |
|--------|-------------|-------|
| Encrypted USB drive | ✅ Yes | Store in a secure physical location |
| Hardware wallet (air-gapped) | ✅ Yes | Best for large amounts |
| Encrypted cloud storage | ⚠️ Use with caution | Ensure strong encryption and 2FA |
| Paper backup | ✅ Yes | Laminate and protect from fire/water |
| Password manager | ⚠️ Use reputable ones | 1Password, Bitwarden, etc. |

**Backup checklist:**
- [ ] Create at least **2 independent backups** on different media
- [ ] Verify backups are readable before relying on them
- [ ] Periodically check backup integrity (every 6 months)
- [ ] Store backups in **different physical locations**

### 1.2 Secure Storage

**DO:**
- Store notes in an encrypted container (GPG, VeraCrypt)
- Use strong, unique passwords for encrypted containers
- Keep firmware and software updated
- Use air-gapped computers for critical operations

**DON'T:**
- Store notes in plain text files
- Keep notes in cloud-synced folders without encryption
- Share notes via email, messaging apps, or screenshots
- Store notes on devices connected to the internet

### 1.3 Never Share Notes

> ⚠️ **CRITICAL: Your note is your funds. Anyone with your note can withdraw your deposit.**

**Never share your note under any circumstances.** PrivacyLayer staff will NEVER ask for your note.

**Legitimate scenarios where you might share a note (use extreme caution):**
- Withdrawal verification (only when YOU initiate the process)
- Auditing (use read-only tools, never expose the raw note)

**Red flags — STOP immediately:**
- Anyone asking for your note to "verify" your account
- "Support" requests requiring note access
- Phishing attempts with privacy pool branding

### 1.4 Recovery Impossibility

PrivacyLayer is designed so that:

- **No one** (including the development team) can recover your note
- **No password reset** is possible
- **No central authority** holds backup keys
- **No KYC data** is linked to your notes

This is a **feature**, not a bug. It ensures true privacy. Accept the trade-off: **you are solely responsible for your note's security.**

---

## 2. Privacy Practices

PrivacyLayer hides the link between your deposit and withdrawal — but only if you follow these practices.

### 2.1 Wait Time Between Deposit and Withdrawal

| Scenario | Minimum Wait | Recommendation |
|----------|-------------|----------------|
| Small privacy amount | 24 hours | Wait 1–7 days for better privacy |
| Large privacy amount | 7+ days | Wait 2–4 weeks |
| High-risk activity | 30+ days | Extreme caution for large sums |

**Why wait?** The longer the time between deposit and withdrawal, the harder it is to correlate transactions on-chain.

### 2.2 Use Different Addresses

Always use **fresh, unrelated addresses** for:

- Deposit address (where you send funds FROM)
- Withdrawal address (where you receive funds TO)

**Best practices:**
- Never reuse addresses
- Use a new address for each privacy session
- Ensure deposit and withdrawal addresses have no prior transaction history together
- Consider using intermediate addresses for large amounts

```
❌ BAD: Deposit from A → Withdraw to B where A and B have prior transactions
✅ GOOD: Deposit from A → Withdraw to C (no prior relationship to A)
```

### 2.3 Avoid Patterns

**Transaction patterns can break privacy:**

| Avoid | Instead |
|-------|---------|
| Regular deposits/withdrawals at set times | Vary amounts and timing |
| Round numbers (1000 XLM, 100 USDC) | Add small random amounts |
| Always withdrawing to the same address | Rotate withdrawal destinations |
| Predictable deposit amounts | Use variable denominations |
| Same-time-of-day transactions | Distribute across different times |

### 2.4 Privacy Pool Parameters

| Parameter | Recommended Setting |
|-----------|-------------------|
| Minimum deposit denomination | Follow pool's base denomination |
| Deposit batching | Group deposits, wait between each |
| Withdrawal frequency | Reduce frequency for large amounts |
| Address generation | Use SDK's built-in address generation |

---

## 3. Operational Security

### 3.1 Computer Security

**Essential practices:**

- Use a dedicated device for privacy pool transactions
- Keep OS and software updated
- Use reputable antivirus/antimalware
- Enable firewall
- Use hardware security keys (YubiKey, etc.) for sensitive accounts

**For maximum security — Air-Gapped Setup:**

```
Internet ─ ✗ DISCONNECTED ▼
         │
    [USB Drive]
         │
   [Air-Gapped Computer]
         │
    [Generate & Sign Transactions]
         │
      [USB Drive]
         │
   [Online Computer]
         │
   [Broadcast to Stellar]
```

### 3.2 Network Privacy

- **Avoid** using PrivacyLayer on public Wi-Fi
- Use Tor or a reputable VPN for additional network privacy
- Check for DNS leaks
- Consider using a network-isolated setup for sensitive operations

### 3.3 Smart Contract Interaction

**Before interacting with PrivacyLayer:**

- [ ] Verify contract address on official sources (GitHub, Stellar.expert)
- [ ] Test with a small amount first
- [ ] Read the contract source code if technically capable
- [ ] Check for recent security audits
- [ ] Monitor official channels for security announcements

---

## 4. Common Pitfalls

### 4.1 User Errors

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Losing note | Permanent fund loss | Multiple encrypted backups |
| Sharing note | Funds stolen | Never share, ever |
| Reusing addresses | Privacy reduced | Always use fresh addresses |
| Rushing withdrawals | Privacy broken | Wait appropriate time |
| Ignoring denominational limits | Transaction failure | Check pool config before depositing |

### 4.2 Scam Prevention

**Recognize and avoid:**

- ❌ Fake "PrivacyLayer support" DMs — staff will never DM you first
- ❌ Unofficial websites mimicking PrivacyLayer
- ❌ "Guaranteed privacy" claims — no system is 100% private
- ❌ Requests to send funds to "verify" your wallet
- ❌ Phishing emails with fake PrivacyLayer links

**Verify official channels:**
- GitHub: [ANAVHEOBA/PrivacyLayer](https://github.com/ANAVHEOBA/PrivacyLayer)
- Official documentation only from these sources

### 4.3 Technical Pitfalls

- **Clock sync issues** — Ensure your device clock is accurate (Stellar uses UTC)
- **Insufficient balance** — Always reserve XLM for fees (minimum ~1 XLM fee)
- **Wrong network** — Double-check you're on Stellar mainnet/testnet
- **Transaction timeout** — Some operations may take time; wait for confirmation

---

## 5. Emergency Procedures

### 5.1 If Your Note is Compromised

1. **ACT FAST** — If someone else has your note, they can withdraw your funds immediately
2. Withdraw ALL funds from the compromised note immediately
3. Generate a new note and secure it properly
4. Report the incident (for documentation, not recovery)

### 5.2 If You Lose Your Note

**Unfortunately, there is no recovery path.** This is by design.

**Prevention is the only solution:**
- Follow the backup procedures in Section 1.1
- Use the checklist to verify your backup strategy
- Test restore procedure periodically

### 5.3 Suspected Phishing/Scam

1. **DO NOT** interact with the suspicious entity
2. Verify through official channels
3. Report to the PrivacyLayer community
4. Share details to warn others (without exposing your sensitive data)

---

## Quick Reference Checklist

### Before Each Transaction

- [ ] Device clock synced and secure
- [ ] Official contract address verified
- [ ] Sufficient balance for fees + deposit
- [ ] Fresh withdrawal address prepared
- [ ] No public Wi-Fi or VPN concerns

### Long-Term Security

- [ ] 2+ encrypted backups created
- [ ] Backups in different physical locations
- [ ] Backup integrity verified
- [ ] Hardware security key configured
- [ ] No sensitive data in plain text anywhere

---

## Security Contacts

- **Bug Bounties:** See [Bug Bounty Program](../../BugBounty.md)
- **Security Disclosures:** Via GitHub Security Advisories
- **Questions:** Open a GitHub Discussion (NEVER share your note)

---

*Last updated: 2026-03-26*

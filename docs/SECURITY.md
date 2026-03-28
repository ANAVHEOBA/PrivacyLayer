# Security Best Practices

> Security model, known limitations, and best practices for using PrivacyLayer.

## ⚠️ Important Disclaimer

**PrivacyLayer is experimental software.** While it implements well-established cryptographic patterns (Groth16, Poseidon, Merkle trees), it has **not been audited by a professional security firm** as of this writing. Use at your own risk.

---

## Smart Contract Security

### Access Control

| Function | Access |
|----------|--------|
| `deposit()` | Anyone |
| `withdraw()` | Anyone (via ZK proof) |
| `pause()` | Admin only |
| `unpause()` | Admin only |
| `set_verification_key()` | Admin only |
| `set_admin()` | Admin only |

**Recommendation:** The admin address should be a multi-signature wallet or a timelock contract.

### Emergency Pause

The contract implements an emergency pause mechanism:

```rust
fn pause() {
    only_admin();
    paused = true;
}

fn unpause() {
    only_admin();
    paused = false;
}
```

During pause:
- ✅ Deposits are blocked
- ✅ Withdrawals are blocked
- ✅ No funds can be stolen (proof still required for withdrawal)

### Re-entrancy Protection

All state changes (nullifier insertion, Merkle tree update) happen **before** the external transfer call, following the Checks-Effects-Interactions pattern.

---

## ZK Proof Security

### Soundness

PrivacyLayer uses **Groth16** — a widely-used, proven SNARK construction:

- **Soundness error:** < 2^-128 (for typical circuits)
- **Proof size:** ~200 bytes (very small, cheap to verify on-chain)
- **Prover time:** Depends on circuit size (30-120 seconds for typical hardware)

### Trusted Setup

Groth16 requires a per-circuit trusted setup ceremony. PrivacyLayer's setup:

- Follows the **Powers of Tau** approach
- Verification keys are stored in the contract
- A malicious trusted setup operator **cannot** forge proofs or steal funds
- A malicious setup operator **could** create false proofs — mitigate by running your own ceremony for production use

### Circuit Correctness

The Noir circuits are designed to ensure:

1. **Membership proof** — The commitment must exist in the Merkle tree
2. **Nullifier uniqueness** — The nullifier must not have been spent
3. **Value conservation** — Deposited value = withdrawn value (no value creation)
4. **Recipient authorization** — The proof is bound to a specific recipient address

---

## User Security Best Practices

### Protecting Your Note

The **note** (containing `nullifier` and `secret`) is the only thing that can unlock your deposit. Protect it like a private key.

| Do ✅ | Don't ❌ |
|-------|---------|
| Store in secure wallet | Share with anyone |
| Backup in multiple secure locations | Store in plain text on a server |
| Use hardware wallet integration | Send via email or chat |
| Delete after successful withdrawal | Keep after withdrawing |

### Avoiding Privacy Leaks

Privacy is only as strong as the **weakest link** in your transaction chain:

1. **Don't deposit from exchange accounts** — KYC data links your identity to the deposit
2. **Don't withdraw to exchange accounts** — Same issue in reverse
3. **Use a fresh address** for each withdrawal — Don't reuse addresses
4. **Wait before withdrawing** — Deposits and withdrawals at the same time are correlatable
5. **Use Tor/VPN** — IP addresses can be a privacy leak
6. **Don't announce your deposit** — On-chain social engineering

### Recommended Privacy Intervals

For strong privacy, maintain a **time gap** between deposit and withdrawal:

| Threat Level | Minimum Interval |
|-------------|-----------------|
| Casual observer | 2 hours |
| Determined analyst | 24 hours |
| Nation-state adversary | 1 week + |

### Amount Correlation

Avoid depositing/withdrawing round amounts that can be correlated:

| Bad ❌ | Better ✅ |
|--------|----------|
| Deposit exactly 10 XLM | Deposit 10.001 XLM |
| Withdraw exactly 10 XLM | Withdraw 10.001 XLM |
| Always use the same denomination | Mix denominations when possible |

---

## Operational Security

### For Exchange Operators

If you operate an exchange and accept PrivacyLayer deposits:

- **Wait for confirmations** — At least 10 Stellar confirmations before crediting
- **Monitor for privacy池 patterns** — Multiple deposits from the same commitment tree may indicate PrivacyLayer usage
- **Don't block PrivacyLayer** — This harms user privacy; instead comply with applicable regulations through other means

### For Smart Contract Auditors

Key areas to focus on in a security audit:

1. **Merkle tree implementation** — Circular buffer overflow, index validation
2. **Nullifier set** — Duplicate spend prevention, storage bloat
3. **BN254 pairing** — Proof verification correctness
4. **Access control** — Admin functions properly protected
5. **Re-entrancy** — No callbacks during fund transfers
6. **Front-running** — Withdrawal recipient binding

---

## Bug Bounty Program

PrivacyLayer maintains an active bug bounty program. See our [ bounty issues](../issues?q=label%3Abounty) for current bounties.

### Scope

In-scope:

- Smart contract vulnerabilities
- Circuit soundness bugs
- SDK vulnerabilities
- Key management issues

Out-of-scope:

- Social engineering attacks
- Network-level attacks
- Vulnerabilities in third-party dependencies (unless directly exploitable in PrivacyLayer context)

---

## Reporting Security Issues

For critical security issues, **do NOT open a public GitHub issue**. Instead:

1. Email the repository maintainers directly
2. Include a detailed description of the vulnerability
3. Include reproduction steps (if applicable)
4. Await acknowledgment before disclosure

---

## JSON-LD Security Documentation Schema

This page implements the [TechArticle schema](https://schema.org/TechArticle) for search engines:

```json
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "name": "PrivacyLayer Security Best Practices",
  "description": "Security model, known limitations, and best practices for using PrivacyLayer on Stellar Soroban",
  "url": "https://github.com/ANAVHEOBA/PrivacyLayer/blob/main/docs/SECURITY.md",
  "about": {
    "@type": "SoftwareApplication",
    "name": "PrivacyLayer",
    "applicationCategory": "FinanceApplication"
  }
}
```

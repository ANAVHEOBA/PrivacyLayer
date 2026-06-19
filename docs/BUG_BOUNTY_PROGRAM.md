# PrivacyLayer Bug Bounty Program

**Version:** 1.0  
**Launch Date:** March 2026  
**Status:** Active

---

## Program Overview

PrivacyLayer welcomes security researchers to help identify vulnerabilities in our protocol. This bug bounty program rewards responsible disclosure of security issues that could impact user funds or privacy.

---

## Rewards

### Reward Tiers

| Severity | Description | Reward (USD) |
|----------|-------------|--------------|
| **Critical** | Direct loss of user funds, privacy breach | $10,000 - $50,000 |
| **High** | Vulnerabilities leading to potential fund loss | $5,000 - $10,000 |
| **Medium** | Security issues with limited impact | $1,000 - $5,000 |
| **Low** | Minor vulnerabilities | $100 - $1,000 |
| **Informational** | Best practice suggestions | $50 - $100 |

### Critical Vulnerabilities

Examples of Critical vulnerabilities:
- Theft of user funds from the privacy pool
- Ability to withdraw funds without valid ZK proof
- Merkle tree manipulation leading to double-spending
- Privacy leakage allowing deposit-withdrawal linking

### High Vulnerabilities

Examples of High vulnerabilities:
- Bypass of rate limits or pause mechanisms
- Governance key compromise vectors
- Front-running attacks with guaranteed profit
- Circuit implementation flaws

### Medium Vulnerabilities

Examples of Medium vulnerabilities:
- Denial of service vectors
- Gas manipulation attacks
- Information disclosure
- Access control bypass (non-critical functions)

---

## Scope

### In Scope

| Component | Type | Details |
|-----------|------|---------|
| Pool Contract | Soroban | `contracts/privacy_pool/` |
| Verifier Contract | Soroban | `contracts/verifier/` |
| Noir Circuits | ZK | `circuits/` |
| TypeScript SDK | Library | `sdk/` |
| CLI Tool | Application | `cli/` |

### Out of Scope

- Third-party dependencies (report to upstream)
- Social engineering attacks
- DDOS attacks
- Spam attacks
- Issues requiring physical access
- UI/UX issues without security impact

### Specific Exclusions

- Vulnerabilities in test files
- Issues in example code
- Theoretical vulnerabilities without proof of concept
- Issues already reported

---

## Submission Process

### 1. Report Format

Submit reports via email to: **security@privacylayer.io**

Include:
```
Subject: [BUG BOUNTY] <Brief Description>

Body:
- Summary
- Affected Component(s)
- Steps to Reproduce
- Proof of Concept
- Impact Assessment
- Suggested Fix (optional)
```

### 2. Response Timeline

| Stage | SLA |
|-------|-----|
| Initial Response | 48 hours |
| Triage & Severity | 5 business days |
| Validation | 10 business days |
| Fix Development | Variable |
| Reward Payment | 7 days after fix |

### 3. Communication

- All communication via encrypted email
- PGP Key: [Download from website]
- Do not discuss vulnerabilities publicly

---

## Rules

### Do's ✅

- Test only on testnet initially
- Report vulnerabilities promptly
- Provide clear reproduction steps
- Allow time for fix before disclosure
- Respond to follow-up questions

### Don'ts ❌

- Access or modify others' data
- Perform testing on mainnet without permission
- Publicly disclose before fix is deployed
- Demand payment or threaten disclosure
- Test vulnerabilities beyond what's needed

---

## Safe Harbor

PrivacyLayer commits to:

1. **No Legal Action**: We will not pursue legal action against researchers who follow these rules.

2. **Anonymity**: Your identity will be kept confidential unless you request otherwise.

3. **Fair Evaluation**: All reports will be evaluated fairly and rewards determined transparently.

4. **Public Recognition**: With your permission, we will publicly thank you for your contribution.

---

## Platform Integration

### Immunefi (Recommended)

For higher rewards and better protection, submit via Immunefi:

- URL: https://immunefi.com/bounty/privacylayer
- Immunefi handles mediation
- Faster payout process
- Additional rewards from Immunefi

### Direct Submission

For sensitive findings or if you prefer:

- Email: security@privacylayer.io
- PGP encrypted preferred
- Manual review process

---

## Responsible Disclosure

### Timeline

| Day | Action |
|-----|--------|
| 0 | Vulnerability reported |
| 2 | Initial response sent |
| 10 | Severity determined |
| 30 | Fix developed and tested |
| 45 | Fix deployed to testnet |
| 60 | Fix deployed to mainnet |
| 90 | Public disclosure (with permission) |

### Disclosure Policy

- Do not disclose publicly until fix is deployed
- Coordinate disclosure timing with PrivacyLayer team
- Credit will be given in security advisories

---

## Eligibility

### Who Can Participate

- Individual security researchers
- Security firms
- PrivacyLayer community members

### Who Cannot Participate

- PrivacyLayer employees and contractors
- Immediate family members of employees
- Residents of sanctioned countries

---

## Payment

### Methods

| Method | Fees | Processing Time |
|--------|------|-----------------|
| USDC (Stellar) | None | Immediate |
| USDC (Ethereum) | Gas only | 24 hours |
| BTC | Network fee | 24 hours |
| Bank Transfer (USD) | Wire fee | 5-7 days |

### Tax Implications

- Rewards over $600 may require tax documentation
- PrivacyLayer will provide necessary forms
- Researchers responsible for local tax compliance

---

## Hall of Fame

### 2026

| Date | Researcher | Severity | Vulnerability |
|------|------------|----------|---------------|
| - | - | - | - |

*Be the first to appear here!*

---

## Contact

- **Security Email**: security@privacylayer.io
- **PGP Key**: [Link]
- **Immunefi**: https://immunefi.com/bounty/privacylayer
- **Discord**: #security channel

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial launch |

---

*By participating in this program, you agree to these terms and conditions.*
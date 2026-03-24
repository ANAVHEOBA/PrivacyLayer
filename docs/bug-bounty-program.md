# 🛡️ PrivacyLayer Bug Bounty Program

> **Status:** 🟢 Active | **Launch Date:** TBD
> 
> Help us secure the future of private transactions on Stellar.

---

## Table of Contents

1. [Program Overview](#1-program-overview)
2. [Rewards](#2-rewards)
3. [Scope](#3-scope)
4. [Rules](#4-rules)
5. [Submission Process](#5-submission-process)
6. [Disclosure Policy](#6-disclosure-policy)
7. [Safe Harbor](#7-safe-harbor)
8. [FAQ](#8-faq)

---

## 1. Program Overview

### About PrivacyLayer

PrivacyLayer is the first ZK-proof shielded pool on Stellar Soroban, enabling private deposits and withdrawals using zero-knowledge proofs. Our protocol uses:
- Noir circuits for ZK proof generation
- Poseidon hash for commitment schemes
- BN254 pairing-friendly curve (Protocol 25 native primitives)
- Merkle tree for commitment storage

### Program Goals

- Identify and remediate security vulnerabilities before they can be exploited
- Engage the security research community
- Protect user funds and privacy
- Maintain the integrity of our ZK proof system

### Platform

**Primary Platform:** [Immunefi](https://immunefi.com/) (preferred)  
**Alternative:** Direct submission via security@privacylayer.io

---

## 2. Rewards

### Bounty Tiers

| Severity | Description | Reward Range |
|----------|-------------|--------------|
| 🔴 **Critical** | Direct loss of user funds, privacy breach, or protocol takeover | **$50,000 - $100,000** |
| 🟠 **High** | Bypass of security controls, potential fund exposure | **$10,000 - $50,000** |
| 🟡 **Medium** | Logic errors, state manipulation (no fund loss) | **$5,000 - $10,000** |
| 🟢 **Low** | Minor bugs, documentation issues | **$1,000 - $5,000** |

### Critical Severity Examples

| Vulnerability Type | Max Bounty |
|-------------------|------------|
| Direct theft of user funds | $100,000 |
| Privacy breach (deposit-withdrawal linkability) | $75,000 |
| Bypass of ZK proof verification | $100,000 |
| Nullifier collision / double-spend | $75,000 |
| Merkle tree manipulation | $75,000 |
| Admin key compromise | $50,000 |

### High Severity Examples

| Vulnerability Type | Max Bounty |
|-------------------|------------|
| Unauthorized pause/unpause | $25,000 |
| Front-running leading to user loss | $20,000 |
| DoS on deposit/withdrawal functions | $15,000 |
| Incorrect event emission (audit trail) | $10,000 |

### Medium Severity Examples

| Vulnerability Type | Max Bounty |
|-------------------|------------|
| State inconsistency (no fund loss) | $8,000 |
| Missing input validation | $7,000 |
| Gas optimization leading to failed txs | $5,000 |

### Low Severity Examples

| Vulnerability Type | Max Bounty |
|-------------------|------------|
| Documentation errors | $1,000 |
| UI/UX bugs affecting security | $2,000 |
| Information disclosure | $3,000 |

### Payment Methods

- **USDC** (preferred, on Stellar or Ethereum)
- **XLM** (at current market rate)
- **Bank Transfer** (for large bounties, arranged case-by-case)

### Bonus Opportunities

- **First to report:** +10% bonus for first valid report of a vulnerability type
- **Quality report:** +5% for exceptionally detailed reports with PoC
- **Circuit vulnerability:** +20% for ZK circuit bugs (due to complexity)

---

## 3. Scope

### ✅ In-Scope Assets

#### Smart Contracts (Soroban)

| Contract | Address | Network |
|----------|---------|---------|
| Privacy Pool | `TBD` | Mainnet |
| Privacy Pool | `TBD` | Testnet |

**Files:**
- `contracts/privacy_pool/src/*.rs`
- `contracts/privacy_pool/src/**/*.rs`

#### ZK Circuits (Noir)

| Circuit | Location |
|---------|----------|
| Commitment Circuit | `circuits/commitment/src/main.nr` |
| Withdraw Circuit | `circuits/withdraw/src/main.nr` |
| Merkle Library | `circuits/lib/src/merkle/mod.nr` |
| Hash Library | `circuits/lib/src/hash/mod.nr` |

#### Frontend & SDK

| Component | Repository |
|-----------|------------|
| Frontend dApp | `frontend/src/**/*` |
| TypeScript SDK | `sdk/src/**/*` |

#### Infrastructure

| Asset | Scope |
|-------|-------|
| API Endpoints | `api.privacylayer.io` |
| Documentation | `docs.privacylayer.io` |

### ❌ Out-of-Scope

| Asset | Reason |
|-------|--------|
| Third-party dependencies | Report to upstream |
| Social engineering attacks | Not applicable |
| DDoS attacks | Handled by infrastructure |
| UI/UX issues without security impact | Non-security |
| Already known vulnerabilities | Check disclosed list |
| Vulnerabilities on testnet only | Use mainnet for testing |

### Testing Guidelines

#### ✅ Allowed

- View functions on mainnet
- All operations on testnet
- Local fork testing
- Static analysis
- Code review

#### ❌ Prohibited

- Depositing real funds on mainnet for testing
- Exploiting vulnerabilities for profit
- Testing on other users' transactions
- Any action that could harm users

---

## 4. Rules

### ✅ DO

1. **Report promptly** - Submit vulnerabilities as soon as discovered
2. **Provide details** - Include steps to reproduce, PoC code
3. **Stay in scope** - Only test in-scope assets
4. **Be patient** - We'll respond within 48 hours
5. **Keep confidential** - Don't disclose until fixed

### ❌ DON'T

1. **Don't exploit** - Never exploit for personal gain
2. **Don't harm users** - Never test with real user data/funds
3. **Don't spam** - No automated scanning without permission
4. **Don't threaten** - This is cooperation, not extortion
5. **Don't publicize** - Wait for our go-ahead before disclosure

### Qualifying Vulnerabilities

To qualify for a bounty, the vulnerability must:

1. Be previously unreported
2. Be reproducible
3. Have a security impact
4. Be submitted through proper channels
5. Follow all program rules

### Non-Qualifying Findings

- Theoretical vulnerabilities without PoC
- Issues already fixed in latest version
- Vulnerabilities requiring compromised keys
- Spam reports
- Duplicate reports

---

## 5. Submission Process

### Step 1: Prepare Your Report

Include the following:

```markdown
## Summary
Brief description of the vulnerability

## Impact
What could an attacker achieve?

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Proof of Concept
Code or screenshots demonstrating the issue

## Suggested Fix
Optional: How would you fix this?

## Your Contact Info
Preferred method for follow-up
```

### Step 2: Submit

**Option A: Immunefi (Preferred)**
1. Visit [Immunefi](https://immunefi.com/bounty/privacylayer)
2. Create an account
3. Submit detailed report

**Option B: Email**
1. Send to: security@privacylayer.io
2. Subject: `[BUG BOUNTY] <Brief Description>`
3. Encrypt with PGP if sensitive (key: `TBD`)

### Step 3: Response Timeline

| Stage | Timeline |
|-------|----------|
| Initial Response | Within 48 hours |
| Triage & Severity | Within 5 business days |
| Investigation | 1-2 weeks |
| Fix Development | 2-4 weeks |
| Bounty Payment | Within 30 days of fix |

### Step 4: Communication

- All updates via Immunefi or email
- We may request additional information
- You'll be notified when fix is deployed
- Payment details confirmed before deployment

---

## 6. Disclosure Policy

### Coordinated Disclosure

We follow **responsible disclosure**:

1. **Report submitted** - Vulnerability details shared
2. **Triage** - Severity assessed, investigation begins
3. **Fix developed** - Patch created and tested
4. **Fix deployed** - Update pushed to production
5. **Cool-down period** - Wait 7 days for adoption
6. **Public disclosure** - Full details published

### Timeline

| Phase | Duration |
|-------|----------|
| Fix Development | Up to 90 days |
| Deployment + Cool-down | 7-14 days |
| Total | Up to 104 days |

### Extensions

We may extend the timeline for:
- Complex vulnerabilities requiring significant changes
- Coordination with external parties
- Dependent libraries requiring updates

### Early Disclosure

Researchers may disclose after:
- 104 days with no response, OR
- 90 days after fix with no deployment

### Credit & Recognition

We publicly credit researchers who:
- Follow the disclosure policy
- Allow us to fix the issue first
- Provide quality reports

Recognition includes:
- Hall of Fame listing
- Social media acknowledgment
- Conference presentation opportunities
- Referrals and recommendations

---

## 7. Safe Harbor

### Legal Protection

We commit to **NOT** pursuing legal action against researchers who:

1. Make a good faith effort to comply with this program
2. Do not intentionally cause harm
3. Do not access or exfiltrate user data
4. Do not publicly disclose before we fix
5. Report in accordance with our rules

### Scope of Protection

This safe harbor applies to:
- Testing of in-scope assets only
- Research conducted in good faith
- Actions that don't violate applicable laws

### Exceptions

Safe harbor does NOT apply to:
- Accessing user data without authorization
- Actions that violate applicable law
- Testing outside of scope
- Ransomware or extortion attempts
- Disruption of services

---

## 8. FAQ

### General Questions

**Q: Who can participate?**
> Anyone 18 years or older, except where prohibited by law. Employees, contractors, and their immediate family members are ineligible.

**Q: How long does it take to get paid?**
> Typically within 30 days of the fix being deployed. Complex cases may take longer.

**Q: Can I remain anonymous?**
> Yes, but we need a way to contact you for payment. Consider using a pseudonymous identity.

**Q: What if I find multiple vulnerabilities?**
> Submit each as a separate report. You'll be rewarded for each valid finding.

### Technical Questions

**Q: What should I focus on?**
> Priority areas: ZK circuit soundness, double-spend vectors, privacy breaches, fund theft.

**Q: Is testnet in scope?**
> Yes, for testing. But vulnerabilities that only exist on testnet are not bounty-eligible.

**Q: Can I use automated tools?**
> Manual testing is preferred. If using automated tools, limit rate to avoid disruption.

**Q: Do I need to provide a PoC?**
> Not required but highly recommended. PoCs significantly speed up triage and increase bounty.

### Payment Questions

**Q: What currencies do you pay in?**
> USDC (preferred), XLM, or bank transfer for large bounties.

**Q: Are there tax implications?**
> We'll collect necessary tax forms. Consult a tax professional for your jurisdiction.

**Q: Can I donate my bounty?**
> Yes! We can donate to a charity of your choice or to our privacy education fund.

---

## Contact

| Channel | Purpose |
|---------|---------|
| 🛡️ **Immunefi** | Bug submissions (preferred) |
| 📧 **security@privacylayer.io** | Alternative submission |
| 💬 **Discord** | #security channel for questions |
| 🐦 **Twitter** | @PrivacyLayer for updates |

---

## Hall of Fame

### 2026

| Researcher | Vulnerability | Severity | Date |
|------------|---------------|----------|------|
| *Be the first!* | - | - | - |

---

## Program Updates

| Date | Change |
|------|--------|
| 2026-03-24 | Initial program launch |

---

## Legal

This bug bounty program is governed by the terms and conditions available at [privacylayer.io/security/bounty-terms](https://privacylayer.io/security/bounty-terms).

Participation constitutes agreement to these terms.

---

*We appreciate your help in making PrivacyLayer secure. Together, we're building the future of private finance.* 🛡️
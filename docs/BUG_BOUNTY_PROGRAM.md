# PrivacyLayer Bug Bounty Program

> **Protecting the first ZK-proof shielded pool on Stellar Soroban**

---

## Program Overview

PrivacyLayer invites security researchers, white-hat hackers, and the broader community to help identify vulnerabilities in our protocol. As a zero-knowledge privacy protocol handling user funds and cryptographic proofs, security is our highest priority.

This program is designed to reward responsible disclosure of security vulnerabilities that could affect the PrivacyLayer protocol, its smart contracts, ZK circuits, SDK, or frontend application.

**Program Launch Date:** March 2026
**Program Type:** Ongoing (no end date)
**Maximum Bounty:** $50,000 USDC (Critical severity)
**Minimum Bounty:** $100 USDC (Low severity)

---

## Table of Contents

1. [Scope](#scope)
2. [Severity Classifications](#severity-classifications)
3. [Reward Structure](#reward-structure)
4. [Submission Process](#submission-process)
5. [Report Template](#report-template)
6. [Rules of Engagement](#rules-of-engagement)
7. [Response SLA](#response-sla)
8. [Legal Safe Harbor](#legal-safe-harbor)
9. [Hall of Fame](#hall-of-fame)
10. [Exclusions and Out-of-Scope](#exclusions-and-out-of-scope)
11. [FAQ](#faq)

---

## Scope

### In-Scope Assets

The following components are in scope for this bug bounty program:

#### Smart Contracts (Soroban/Rust) — **Highest Priority**

| Asset | Repository Path | Type |
|-------|----------------|------|
| Privacy Pool Contract | `contracts/privacy_pool/src/contract.rs` | Soroban Smart Contract |
| Deposit Logic | `contracts/privacy_pool/src/core/deposit.rs` | Core Business Logic |
| Withdrawal Logic | `contracts/privacy_pool/src/core/withdraw.rs` | Core Business Logic |
| Admin Functions | `contracts/privacy_pool/src/core/admin.rs` | Access Control |
| Initialization | `contracts/privacy_pool/src/core/initialize.rs` | Contract Setup |
| Merkle Tree | `contracts/privacy_pool/src/crypto/merkle.rs` | Cryptographic Primitive |
| Groth16 Verifier | `contracts/privacy_pool/src/crypto/verifier.rs` | Cryptographic Primitive |
| Nullifier Storage | `contracts/privacy_pool/src/storage/nullifier.rs` | State Management |
| Configuration | `contracts/privacy_pool/src/storage/config.rs` | State Management |
| Input Validation | `contracts/privacy_pool/src/utils/validation.rs` | Security Boundary |
| Error Handling | `contracts/privacy_pool/src/types/errors.rs` | Error Types |

#### ZK Circuits (Noir) — **High Priority**

| Asset | Repository Path | Type |
|-------|----------------|------|
| Commitment Circuit | `circuits/commitment/src/main.nr` | ZK Circuit |
| Withdrawal Circuit | `circuits/withdraw/src/main.nr` | ZK Circuit |
| Merkle Circuit Library | `circuits/merkle/src/lib.nr` | ZK Library |
| Hash Functions | `circuits/lib/src/hash/` | Cryptographic Utility |
| Merkle Utilities | `circuits/lib/src/merkle/` | Cryptographic Utility |
| Input Validation | `circuits/lib/src/validation/` | Security Boundary |
| Integration Tests | `circuits/integration_test.nr` | Test Coverage |

#### SDK (TypeScript) — **Medium Priority**

| Asset | Repository Path | Type |
|-------|----------------|------|
| Note Generation | `sdk/src/note.ts` | Client Library |
| Deposit Flow | `sdk/src/deposit.ts` | Client Library |
| Withdrawal Flow | `sdk/src/withdraw.ts` | Client Library |
| Merkle Sync | `sdk/src/merkle.ts` | Client Library |

#### Frontend (Next.js) — **Medium Priority**

| Asset | Repository Path | Type |
|-------|----------------|------|
| Web Application | `frontend/` | Web Interface |
| Wallet Integration | Freighter wallet connection | Authentication |

#### Deployment Scripts — **Low Priority**

| Asset | Repository Path | Type |
|-------|----------------|------|
| Deploy Scripts | `scripts/` | Infrastructure |

---

## Severity Classifications

We use a four-tier severity classification system aligned with the CVSS v3.1 framework and adapted to the specific threat landscape of a ZK privacy protocol.

### Critical (CVSS 9.0 - 10.0)

Vulnerabilities that can lead to direct loss of user funds, complete protocol compromise, or catastrophic privacy breaches.

**Examples:**
- Theft or permanent freezing of deposited funds (XLM or USDC)
- Bypassing the ZK proof verification to withdraw without a valid proof
- Forging Groth16 proofs that pass on-chain verification
- Breaking the commitment scheme (finding preimages of Poseidon commitments)
- Double-spending via nullifier bypass or collision attacks
- Merkle tree manipulation allowing unauthorized withdrawals
- Linking deposits to withdrawals on-chain (complete de-anonymization)
- Unauthorized admin access leading to fund extraction
- Smart contract upgrade path exploitation
- Exploiting BN254 pairing checks to bypass verification

### High (CVSS 7.0 - 8.9)

Vulnerabilities that can cause significant financial damage, partial privacy loss, or severe protocol disruption.

**Examples:**
- Partial de-anonymization (reducing the anonymity set significantly)
- Denial-of-service against the deposit or withdrawal functions
- Griefing attacks that permanently corrupt the Merkle tree state
- Bypassing the contract pause mechanism during emergencies
- Exploiting admin functions to alter contract parameters maliciously
- Circuit constraint under-specification allowing invalid proofs
- Race conditions in deposit/withdrawal ordering
- Nullifier tracking attacks that reduce privacy guarantees
- Storage manipulation via unauthorized state access
- Front-running attacks that extract user deposit/withdrawal intent

### Medium (CVSS 4.0 - 6.9)

Vulnerabilities that cause limited financial impact, moderate privacy degradation, or protocol functionality issues.

**Examples:**
- Timing side-channels in proof generation or verification
- Information leakage through error messages or event emissions
- Gas griefing attacks (forcing excessive computation costs)
- SDK vulnerabilities exposing note secrets in memory
- Incorrect Merkle proof generation in the client SDK
- Event emission inconsistencies that break indexers
- Input validation bypasses that do not lead to fund loss
- Configuration parameter manipulation within allowed ranges
- Frontend XSS or CSRF vulnerabilities affecting wallet interactions
- Insufficient entropy in note generation

### Low (CVSS 0.1 - 3.9)

Vulnerabilities with minimal impact that represent deviations from best practices or minor issues.

**Examples:**
- Informational event leakage without privacy implications
- Non-critical code quality issues in circuits or contracts
- Minor gas optimization opportunities
- UI/UX issues that could mislead users
- Missing input validation on non-critical parameters
- Documentation inconsistencies affecting security understanding
- Test coverage gaps in non-critical paths
- Dependency version pinning issues
- Non-exploitable integer overflow/underflow

### Informational

Issues that do not pose an immediate security risk but improve overall protocol robustness.

**Examples:**
- Code style improvements for security-critical sections
- Documentation improvements for security processes
- Suggestions for additional test coverage
- Best practice recommendations for ZK circuit design
- Recommendations for monitoring and alerting

---

## Reward Structure

Rewards are paid in **USDC** via the [Drips Wave](https://www.drips.network/wave) platform. The exact reward amount within each tier is determined based on the following factors:

1. **Severity** of the vulnerability
2. **Quality** of the report (reproduction steps, PoC, analysis depth)
3. **Impact** on the protocol (funds at risk, users affected)
4. **Novelty** of the attack vector

### Reward Tiers

| Severity | Reward Range (USDC) | Typical Payout |
|----------|---------------------|----------------|
| **Critical** | $10,000 - $50,000 | $25,000 |
| **High** | $2,500 - $10,000 | $5,000 |
| **Medium** | $500 - $2,500 | $1,000 |
| **Low** | $100 - $500 | $250 |
| **Informational** | $0 - $100 | Recognition only |

### Bonus Multipliers

| Condition | Multiplier |
|-----------|-----------|
| First valid Critical finding | 1.5x |
| Proof of Concept with working exploit | 1.25x |
| Fix suggestion included and accepted | 1.1x |
| Vulnerability in BN254/Poseidon integration | 1.25x |
| Vulnerability affecting mainnet deployment | 1.5x |

### Payment Process

1. Vulnerability is confirmed and severity is agreed upon
2. Fix is developed and verified
3. Researcher is notified of the final reward amount
4. USDC payment is initiated via Drips Wave
5. Payment is typically processed within 14 business days of fix deployment

---

## Submission Process

### Step 1: Discover

Identify a potential vulnerability in any in-scope asset.

### Step 2: Document

Prepare a detailed report following the [Report Template](#report-template) below.

### Step 3: Submit

Submit your report through one of the following channels:

- **Preferred:** Create a private security advisory via [GitHub Security Advisories](https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new)
- **Alternative:** Email security findings to the repository maintainers (contact via GitHub profile)
- **GitHub Issue:** For Low/Informational severity only, use the [Bug Bounty Report](../../.github/ISSUE_TEMPLATE/bug-bounty-report.yml) issue template

**IMPORTANT:** For Critical and High severity vulnerabilities, do NOT create public GitHub issues. Use the private security advisory channel.

### Step 4: Triage

Our security team will triage and respond per the [Response SLA](#response-sla).

### Step 5: Resolution

We will work with you to understand the vulnerability, develop a fix, and agree on a reward.

### Step 6: Disclosure

After the fix is deployed, we will coordinate public disclosure with you. You will be credited in the [Hall of Fame](#hall-of-fame) (unless you prefer anonymity).

---

## Report Template

Please include the following information in your submission:

```markdown
## Vulnerability Report

### Summary
[Brief description of the vulnerability — 1-2 sentences]

### Severity Assessment
[Your assessment: Critical / High / Medium / Low / Informational]

### Affected Component
[Contract / Circuit / SDK / Frontend / Scripts]

### Affected Files
[List specific files and line numbers]

### Description
[Detailed description of the vulnerability]

### Attack Scenario
[Step-by-step description of how an attacker could exploit this]

### Proof of Concept
[Code, scripts, or transaction sequences demonstrating the vulnerability]

### Impact Analysis
[What is the worst-case impact? How many users/funds are affected?]

### Root Cause
[What is the underlying cause of the vulnerability?]

### Suggested Fix
[Optional: Your recommended approach to fixing the issue]

### Environment
- Branch/Commit: [git commit hash]
- Noir version: [if circuit-related]
- Rust/Soroban SDK version: [if contract-related]
- Node.js version: [if SDK/frontend-related]

### Additional Context
[Any other information that might help us understand and reproduce the issue]
```

---

## Rules of Engagement

### DO

- Test against your own local deployment or testnet instances
- Report vulnerabilities promptly after discovery
- Provide sufficient detail for us to reproduce the issue
- Give us reasonable time to fix the vulnerability before disclosure
- Act in good faith to avoid privacy violations, data destruction, or service disruption
- Follow the coordinated disclosure process
- Test on Stellar Testnet only (never Mainnet)
- Keep all findings confidential until coordinated disclosure

### DO NOT

- Access, modify, or delete data belonging to other users
- Perform attacks against Stellar Mainnet or production environments
- Execute denial-of-service attacks against any network or infrastructure
- Conduct social engineering attacks against PrivacyLayer contributors
- Use automated scanning tools that generate excessive traffic
- Submit vulnerabilities already reported by others (first reporter wins)
- Publicly disclose vulnerabilities before coordinated disclosure
- Exploit vulnerabilities beyond what is necessary to demonstrate the issue
- Attempt to phish or spam project maintainers
- Sell or transfer vulnerability information to third parties
- Deploy malicious contracts to testnet that affect other users

### Multiple Vulnerabilities

- If one root cause leads to multiple symptoms, it will be treated as one vulnerability
- If multiple distinct root causes lead to one symptom, each root cause is a separate vulnerability
- Chain of vulnerabilities that require sequential exploitation are rewarded as a single finding at the highest applicable severity

---

## Response SLA

We are committed to the following response times:

| Action | Target Time |
|--------|-------------|
| **Initial Acknowledgment** | Within 24 hours |
| **Triage and Severity Assessment** | Within 72 hours |
| **Status Update (if still investigating)** | Every 7 days |
| **Fix Development** | Within 14 days (Critical), 30 days (High), 60 days (Medium/Low) |
| **Reward Decision** | Within 7 days of fix confirmation |
| **Payment Processing** | Within 14 business days of reward decision |
| **Public Disclosure** | 90 days after fix deployment (coordinated with researcher) |

### Escalation

If you do not receive an initial acknowledgment within 48 hours, please:

1. Re-send your report via an alternative channel
2. Open a non-descriptive GitHub issue titled "Security Report Follow-up" (do not include vulnerability details)

---

## Legal Safe Harbor

### Policy Statement

PrivacyLayer is committed to working with security researchers who act in good faith. We will not pursue legal action against researchers who:

1. Make a good faith effort to comply with this bug bounty program's rules
2. Avoid privacy violations, destruction of data, and service disruption
3. Do not exploit vulnerabilities beyond what is minimally necessary
4. Report vulnerabilities through the designated channels
5. Allow us reasonable time to address issues before public disclosure

### Scope of Safe Harbor

This safe harbor applies to:

- Security research performed in accordance with this program
- Activities that would otherwise violate applicable computer fraud laws
- Testing on local deployments, testnets, or personal forks
- Creating proof-of-concept exploits for demonstration purposes only

### Limitations

The safe harbor does NOT extend to:

- Attacks against systems or services not listed in the scope
- Actions that violate any applicable law beyond computer fraud statutes
- Physical security attacks or social engineering
- Denial-of-service attacks against production infrastructure
- Data exfiltration beyond what is necessary for the report

### Commitment

We will:

- Not initiate legal action for security research conducted in good faith
- Work with researchers to understand and resolve issues promptly
- Recognize the contributions of security researchers publicly (with consent)
- Maintain confidentiality of vulnerability reports until coordinated disclosure

---

## Hall of Fame

Security researchers who contribute valid vulnerability reports will be recognized in our Hall of Fame (with their consent).

### Criteria for Inclusion

- Submitted a valid vulnerability report that was confirmed
- Followed the rules of engagement
- Acted in good faith throughout the process

### Recognition Tiers

| Tier | Criteria | Recognition |
|------|----------|-------------|
| **Diamond** | Critical vulnerability with PoC | Named in Hall of Fame, project README mention, social media acknowledgment |
| **Gold** | High severity vulnerability | Named in Hall of Fame, social media acknowledgment |
| **Silver** | Medium severity vulnerability | Named in Hall of Fame |
| **Bronze** | Low severity vulnerability | Named in Hall of Fame |
| **Contributor** | Informational finding | Named in Hall of Fame |

### Current Hall of Fame

*No entries yet. Be the first to secure PrivacyLayer!*

---

## Exclusions and Out-of-Scope

The following are explicitly **out of scope** for this bug bounty program:

### Out-of-Scope Vulnerabilities

- Vulnerabilities in third-party dependencies that are not exploitable in the context of PrivacyLayer
- Known issues listed in the project's threat model (`docs/threat-model.md`)
- Issues that require physical access to a user's device
- Issues related to outdated browsers or operating systems
- Theoretical vulnerabilities without a practical attack scenario
- Issues found through automated scanning without manual verification
- Rate limiting or brute force attacks against public APIs
- Missing HTTP security headers on non-sensitive pages
- SSL/TLS configuration issues on third-party services
- Clickjacking on pages with no sensitive actions
- Content spoofing or text injection without demonstrable impact
- Vulnerabilities in the Stellar network itself (report to Stellar SDF)
- Vulnerabilities in the Noir compiler or toolchain (report to Aztec/Noir team)
- Vulnerabilities in the Soroban runtime (report to Stellar SDF)
- Issues already reported by another researcher (duplicate)
- Vulnerabilities discovered and reported after a fix has been deployed

### Out-of-Scope Activities

- Phishing or social engineering of PrivacyLayer team members
- Attacks against PrivacyLayer infrastructure (servers, CI/CD, email)
- Physical security testing
- Denial-of-service testing against production systems
- Spamming GitHub issues or pull requests
- Accessing other researchers' submissions
- Automated mass vulnerability scanning

### Known Limitations

The following are known limitations that are NOT eligible for bounty:

- The protocol has not undergone a formal security audit (this is documented)
- The anonymity set is limited by the number of deposits in the pool
- Gas costs may be high for proof verification (optimization is planned)
- The SDK is in development and not yet feature-complete

---

## Responsible Disclosure Timeline

We follow a 90-day coordinated disclosure policy:

1. **Day 0:** Vulnerability reported to PrivacyLayer team
2. **Day 1:** Acknowledgment sent to researcher
3. **Day 3:** Triage completed, severity assessed
4. **Day 3-14:** Fix developed (Critical), or Day 3-30 (High), or Day 3-60 (Medium/Low)
5. **Day 14-30:** Fix deployed to testnet and verified
6. **Day 30-60:** Fix deployed to mainnet (if applicable)
7. **Day 90:** Coordinated public disclosure

If the fix requires more time, we will negotiate an extension with the researcher.

---

## Program Updates

This bug bounty program may be updated from time to time. Changes will be reflected in this document with a changelog entry. Researchers are encouraged to check this document periodically for updates.

### Changelog

| Date | Change |
|------|--------|
| March 2026 | Initial bug bounty program launch |

---

## FAQ

### Q: Who can participate?

**A:** Anyone can participate, regardless of location or experience level. You do not need to be a professional security researcher. However, participants must comply with applicable laws in their jurisdiction.

### Q: How do I get started?

**A:** Clone the repository, set up a local development environment (see README.md), and start reviewing the code. Focus on the smart contracts and ZK circuits first, as these are the highest-priority assets.

### Q: What if my finding is a duplicate?

**A:** The first reporter of a vulnerability receives the bounty. If your report is a duplicate, we will inform you and no reward will be issued. However, if your report contains additional information or a different attack vector, it may be considered as a separate finding.

### Q: Can I report issues in dependencies?

**A:** Only if the vulnerability is exploitable in the context of PrivacyLayer. If the issue is in a third-party library and is not specific to our usage, please report it to the upstream maintainer instead.

### Q: What if I disagree with the severity assessment?

**A:** You may appeal the severity assessment by providing additional context, impact analysis, or proof of concept. We will review appeals in good faith and may adjust the severity and reward accordingly.

### Q: Is there a minimum report quality?

**A:** Yes. Reports must include sufficient detail for us to reproduce the issue. Reports that consist only of a vulnerability scanner output without analysis will not be accepted. See the [Report Template](#report-template) for expected detail level.

### Q: Can I discuss my findings publicly?

**A:** Only after coordinated disclosure (90 days after fix deployment, or earlier with mutual agreement). Premature public disclosure will disqualify you from the bounty and Hall of Fame.

### Q: Do you offer swag or other rewards?

**A:** Currently, all rewards are paid in USDC. We may introduce additional rewards (swag, NFTs, recognition tokens) in the future.

---

## Contact

- **Security Reports:** [GitHub Security Advisories](https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new)
- **General Questions:** Open a [GitHub Discussion](https://github.com/ANAVHEOBA/PrivacyLayer/discussions)
- **Program Questions:** Comment on the [Bug Bounty Program issue (#94)](https://github.com/ANAVHEOBA/PrivacyLayer/issues/94)

---

## Acknowledgments

This bug bounty program is modeled after industry-leading programs including [Immunefi](https://immunefi.com/), [HackerOne](https://hackerone.com/), and the [Ethereum Foundation Bug Bounty](https://ethereum.org/en/bug-bounty/). We thank the broader security research community for making decentralized protocols safer.

---

*This document is maintained by the PrivacyLayer core team. Last updated: March 2026.*

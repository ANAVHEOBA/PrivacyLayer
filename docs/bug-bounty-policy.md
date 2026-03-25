# PrivacyLayer Bug Bounty Policy

*Immunefi-compatible program specification*

---

## Program Overview

PrivacyLayer is a zero-knowledge privacy pool built on Stellar/Soroban using Noir circuits and BN254/Poseidon cryptography. This bug bounty program incentivizes responsible disclosure of security vulnerabilities in the protocol's core components.

**Program status**: Active (pre-audit phase)
**Platform**: [Immunefi](https://immunefi.com/)

---

## Scope

### In-Scope Assets

| Asset | Type | Severity | Repository Path |
|-------|------|----------|-----------------|
| ZK Commitment Circuit | Noir Circuit | Critical | `circuits/commitment/` |
| ZK Withdrawal Circuit | Noir Circuit | Critical | `circuits/withdraw/` |
| ZK Merkle Circuit | Noir Circuit | Critical | `circuits/merkle/` |
| Circuit Library (hash, merkle, validation) | Noir Library | Critical | `circuits/lib/` |
| Privacy Pool Contract | Soroban Smart Contract | Critical | `contracts/privacy_pool/src/contract.rs` |
| Deposit Logic | Soroban Module | Critical | `contracts/privacy_pool/src/core/deposit.rs` |
| Withdraw Logic | Soroban Module | Critical | `contracts/privacy_pool/src/core/withdraw.rs` |
| Merkle Tree Implementation | Rust Crypto | Critical | `contracts/privacy_pool/src/crypto/merkle.rs` |
| Proof Verifier | Rust Crypto | Critical | `contracts/privacy_pool/src/crypto/verifier.rs` |
| Admin Controls | Soroban Module | High | `contracts/privacy_pool/src/core/admin.rs` |
| Nullifier Storage | Soroban Module | High | `contracts/privacy_pool/src/storage/nullifier.rs` |
| Input Validation | Utility Module | Medium | `contracts/privacy_pool/src/utils/validation.rs` |

### Out-of-Scope

The following are explicitly excluded from the program:

- **Frontend / UI** — Not yet implemented.
- **SDK / Client libraries** — Not yet implemented.
- **Test code** — Files under `test_snapshots/`, `test.rs`, `integration_test.rs`.
- **Build scripts** — Files under `scripts/`.
- **Known limitations** — The project is explicitly marked as unaudited; reports restating this are not eligible.
- **Social engineering** — Phishing, pretexting, or other non-technical attacks against contributors.
- **Denial of Service (DoS)** — Volumetric or resource-exhaustion attacks.
- **Third-party dependencies** — Vulnerabilities in upstream crates or Noir libraries (report to the upstream project).
- **Issues requiring physical access** to infrastructure.

---

## Severity Classification

Severity is assessed using a modified CVSS framework tailored to DeFi/ZK protocols:

### Critical (CVSS 9.0-10.0)

Direct loss of funds or complete protocol compromise:

- Unauthorized withdrawal of deposited assets
- Forging a valid ZK proof without knowledge of the secret/nullifier
- Bypassing the nullifier check to enable double-spending
- Manipulating the Merkle tree to create fraudulent membership proofs
- Extracting private inputs from public proof data

### High (CVSS 7.0-8.9)

Significant impact on protocol integrity:

- Nullifier replay across different roots or states
- Merkle root history corruption enabling stale-root attacks
- Circumventing the pause mechanism during an emergency
- Breaking the commitment scheme (commitment != hash(secret, nullifier, amount))

### Medium (CVSS 4.0-6.9)

Limited impact, requires specific conditions:

- Admin privilege escalation (non-admin performing admin operations)
- Access control bypass on `initialize`, `set_vk`, `pause`, `unpause`
- State inconsistency between storage modules (config, nullifier, merkle)
- Integer overflow/underflow in amount or index calculations

### Low (CVSS 0.1-3.9)

Minimal impact:

- Information leakage through error messages or events
- Gas/resource optimization issues
- Minor deviations from specification
- Non-critical storage inefficiencies

---

## Reward Structure

| Severity | Reward Range (USDC) | Conditions |
|----------|---------------------|------------|
| Critical | $5,000 - $25,000 | Valid PoC demonstrating fund loss or proof forgery |
| High | $2,000 - $5,000 | Valid PoC demonstrating protocol integrity impact |
| Medium | $500 - $2,000 | Clear reproduction steps with identified impact |
| Low | $100 - $500 | Clear description with suggested fix |

Reward amounts within each tier are determined based on:

1. **Impact**: Potential damage if exploited in production
2. **Likelihood**: Ease of exploitation and prerequisites
3. **Quality**: Clarity of report, PoC quality, and suggested remediation
4. **Novelty**: Previously unknown attack vector

---

## Submission Process

### Step 1: Discovery

Identify a vulnerability in an in-scope asset. Confirm it is reproducible.

### Step 2: Report via Immunefi

Submit your finding through the [Immunefi platform](https://immunefi.com/). Your report must include:

1. **Title**: Concise description of the vulnerability
2. **Severity**: Your assessed severity level
3. **Affected component**: Specific file path(s) and function(s)
4. **Description**: Detailed explanation of the vulnerability
5. **Proof of Concept**: Code or step-by-step instructions to reproduce
6. **Impact analysis**: What an attacker could achieve
7. **Suggested fix**: Optional but appreciated

### Step 3: Triage

The PrivacyLayer team will:

- Acknowledge receipt within **48 hours**
- Assess severity within **5 business days**
- Provide status updates at least every **7 days**

### Step 4: Resolution

- Critical issues: Target fix within **30 days**
- All other issues: Target fix within **90 days**
- Reporter will be notified when the fix is deployed

### Step 5: Payment

Payment is issued after:

1. The vulnerability is confirmed as valid and in-scope
2. The fix is verified and merged
3. No duplicate report was submitted prior

---

## Program Rules

### Eligibility

- The vulnerability must be in an in-scope asset
- The report must include sufficient detail to reproduce the issue
- First reporter of a unique vulnerability receives the reward
- PrivacyLayer team members and their immediate families are not eligible

### Responsible Disclosure

Researchers must:

- **Not** publicly disclose the vulnerability before a fix is deployed
- **Not** exploit the vulnerability beyond what is necessary for the PoC
- **Not** access or modify other users' data
- **Not** perform attacks on mainnet or public testnets (use local environments)
- **Not** submit vulnerabilities found through automated scanning without manual verification

### Duplicate Reports

- The first valid report of a vulnerability receives the full reward
- Subsequent reports of the same vulnerability are marked as duplicates
- If multiple reporters identify the same issue independently, the earliest submission (by Immunefi timestamp) takes priority

### Disqualifying Actions

The following will result in report rejection and potential program ban:

- Public disclosure before coordinated timeline
- Attempting to exploit the vulnerability for personal gain
- Social engineering attacks against team members
- Submitting reports generated entirely by automated tools without analysis
- Demanding payment before providing full details

---

## Legal Safe Harbor

PrivacyLayer will not pursue legal action against researchers who:

- Act in good faith and follow this policy
- Avoid privacy violations, data destruction, and service disruption
- Report findings promptly and allow reasonable time for remediation
- Do not exploit findings beyond PoC requirements

---

## Contact

- **Primary**: [Immunefi platform](https://immunefi.com/) (for bounty-eligible reports)
- **General security questions**: See [SECURITY.md](../SECURITY.md)
- **Project information**: [GitHub repository](https://github.com/ANAVHEOBA/PrivacyLayer)

---

*This policy is subject to change. Researchers are encouraged to review the latest version before submitting reports.*

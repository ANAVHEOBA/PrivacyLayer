# PrivacyLayer Bug Bounty Program

## Overview

PrivacyLayer invites security researchers to find vulnerabilities in our privacy pool smart contracts and infrastructure. We reward responsible disclosure with bounties proportional to severity.

## Scope

### In Scope

| Component | Repository Path | Priority |
|-----------|----------------|----------|
| Privacy Pool Contract | `contracts/privacy_pool/` | Critical |
| ZK Circuits (Noir) | `circuits/` | Critical |
| Merkle Tree Implementation | `contracts/privacy_pool/src/crypto/merkle.rs` | Critical |
| Groth16 Verifier | `contracts/privacy_pool/src/crypto/verifier.rs` | Critical |
| Deposit/Withdraw Logic | `contracts/privacy_pool/src/core/` | High |
| Deployment Scripts | `scripts/` | Medium |

### Out of Scope
- Known issues listed in GitHub Issues
- Theoretical attacks with no practical exploit path
- Social engineering or phishing
- Denial of service attacks on public infrastructure
- Issues in third-party dependencies (report upstream)

## Reward Tiers

| Severity | Bounty | Examples |
|----------|--------|----------|
| **Critical** | $5,000 - $25,000 | Double-spend, fund theft, proof forgery, nullifier bypass |
| **High** | $1,000 - $5,000 | Privacy leaks (depositor/withdrawer linkability), Merkle state corruption |
| **Medium** | $250 - $1,000 | Admin key escalation, griefing attacks, DoS on contract |
| **Low** | $50 - $250 | Gas optimization issues, minor logic errors, informational findings |

## Submission Process

### Step 1: Discover
Find a vulnerability in the in-scope components.

### Step 2: Document
Create a detailed report including:
- **Title**: One-line description
- **Severity**: Your assessment (Critical/High/Medium/Low)
- **Description**: What the vulnerability is
- **Steps to Reproduce**: Minimal steps or PoC code
- **Impact**: What an attacker could achieve
- **Suggested Fix**: Optional but appreciated

### Step 3: Submit
- **Email**: security@privacylayer.xyz (preferred for Critical/High)
- **GitHub**: Open a **private security advisory** on this repository
- **Do NOT** open a public issue for Critical or High severity bugs

### Step 4: Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 24 hours |
| Initial Assessment | Within 3 business days |
| Fix Development | Within 14 days (Critical), 30 days (others) |
| Bounty Payment | Within 7 days of fix deployment |

## Rules

1. **No exploitation**: Do not exploit vulnerabilities on mainnet or testnet beyond what's needed to demonstrate the bug
2. **Responsible disclosure**: Give us reasonable time to fix before public disclosure (90 days)
3. **One submission per bug**: Duplicate reports are not eligible
4. **First come, first served**: The first valid report of a vulnerability receives the bounty
5. **Legal safe harbor**: We will not pursue legal action against researchers who follow these rules

## Platform Setup

We recommend using [Immunefi](https://immunefi.com) for structured bounty submissions. Our Immunefi program page will be linked here once live.

## Hall of Fame

Security researchers who responsibly disclose valid vulnerabilities will be credited in our Hall of Fame (with consent).

## Contact

- Security: security@privacylayer.xyz
- General: Open a GitHub issue
- Discord: #security channel

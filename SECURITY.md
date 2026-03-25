# Security Policy

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in PrivacyLayer, please report it responsibly through one of the following channels:

1. **Immunefi Bug Bounty Program** (preferred): Submit through our [Immunefi page](https://immunefi.com/) for eligible rewards.
2. **Private disclosure**: Email security findings to the maintainers via the contact methods listed on the [GitHub organization profile](https://github.com/ANAVHEOBA).

### What to include in your report

- Description of the vulnerability and its potential impact
- Step-by-step reproduction instructions
- Proof of Concept (PoC) code, if applicable
- Affected components (circuits, contracts, crypto logic)
- Suggested severity rating (Critical / High / Medium / Low)

## Response SLA

| Stage | Target |
|-------|--------|
| Initial acknowledgment | 48 hours |
| Severity assessment | 5 business days |
| Fix development & verification | 30 days (critical), 90 days (others) |
| Public disclosure (coordinated) | After fix is deployed |

We ask that reporters practice responsible disclosure and allow us reasonable time to address issues before any public disclosure.

## Bug Bounty Program

PrivacyLayer maintains a bug bounty program to reward security researchers who identify vulnerabilities in the protocol.

### Scope

The following components are in scope:

| Component | Path | Priority |
|-----------|------|----------|
| ZK Circuits | `circuits/` | Critical |
| Smart Contracts | `contracts/privacy_pool/src/` | Critical |
| Cryptographic logic | `contracts/privacy_pool/src/crypto/` (merkle.rs, verifier.rs) | Critical |
| Core deposit/withdraw flow | `contracts/privacy_pool/src/core/` | High |

### Reward Tiers

| Severity | Examples | Reward Range |
|----------|----------|--------------|
| **Critical** | Fund theft, ZK proof forgery, unauthorized withdrawals | $5,000 - $25,000 |
| **High** | Nullifier double-spend, Merkle tree manipulation, root history corruption | $2,000 - $5,000 |
| **Medium** | Access control bypass, admin privilege escalation, state inconsistency | $500 - $2,000 |
| **Low** | Information leakage, minor inconsistencies, gas optimization issues | $100 - $500 |

Reward amounts are determined at the sole discretion of the PrivacyLayer team based on severity, impact, and quality of the report.

### Out of Scope

- Frontend applications (not yet implemented)
- SDK and client libraries (not yet implemented)
- Issues already disclosed in documentation (e.g., "unaudited" status)
- Social engineering or phishing attacks
- Denial of Service (DoS) attacks
- Third-party dependencies (report upstream)

For the full program rules, eligibility criteria, and submission process, see [`docs/bug-bounty-policy.md`](docs/bug-bounty-policy.md).

## Audit Status

> **This project is currently unaudited. Do not use in production.**

The cryptographic primitives (BN254, Poseidon) are battle-tested, but the circuit logic and contract integration have not undergone a formal security audit. A professional audit is planned before any mainnet deployment.

The bug bounty program serves as an additional security layer during the pre-audit phase.

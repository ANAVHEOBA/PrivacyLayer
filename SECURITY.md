# Security Policy

## Reporting a Vulnerability

PrivacyLayer takes security seriously. As a zero-knowledge privacy protocol handling user funds and cryptographic proofs on Stellar Soroban, the integrity and security of our codebase is paramount.

If you discover a security vulnerability, we appreciate your responsible disclosure.

### Reporting Channels

**For Critical and High severity vulnerabilities:**
- **Preferred:** [GitHub Security Advisories](https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new) (private, encrypted)
- **Alternative:** Contact the maintainer directly via their GitHub profile

**For Medium, Low, and Informational findings:**
- Use the [Bug Bounty Report](https://github.com/ANAVHEOBA/PrivacyLayer/issues/new?template=bug-bounty-report.yml) issue template

**IMPORTANT:** Please do NOT create public GitHub issues for Critical or High severity vulnerabilities.

### What to Include

Your report should include:

1. **Summary** - Brief description of the vulnerability
2. **Severity** - Your assessment (Critical / High / Medium / Low)
3. **Affected Component** - Contract, Circuit, SDK, or Frontend
4. **Affected Files** - Specific files and line numbers
5. **Description** - Detailed explanation of the vulnerability
6. **Steps to Reproduce** - Clear, step-by-step instructions
7. **Proof of Concept** - Code or scripts demonstrating the issue
8. **Impact** - What could an attacker achieve?
9. **Suggested Fix** - Optional but appreciated

### What to Expect

| Action | Timeline |
|--------|----------|
| Acknowledgment | Within 24 hours |
| Triage and severity assessment | Within 72 hours |
| Status updates | Every 7 days |
| Fix for Critical issues | Within 14 days |
| Fix for High issues | Within 30 days |
| Fix for Medium/Low issues | Within 60 days |

## Bug Bounty Program

PrivacyLayer operates a bug bounty program with rewards paid in USDC via [Drips Wave](https://www.drips.network/wave).

| Severity | Reward Range |
|----------|-------------|
| Critical | $10,000 - $50,000 |
| High | $2,500 - $10,000 |
| Medium | $500 - $2,500 |
| Low | $100 - $500 |

For full details, see [docs/BUG_BOUNTY_PROGRAM.md](docs/BUG_BOUNTY_PROGRAM.md).

## Scope

### In-Scope
- Smart contracts (`contracts/privacy_pool/`)
- ZK circuits (`circuits/`)
- TypeScript SDK (`sdk/`)
- Frontend application (`frontend/`)
- Deployment scripts (`scripts/`)

### Out-of-Scope
- Vulnerabilities in third-party dependencies not exploitable via PrivacyLayer
- Issues in the Stellar network, Soroban runtime, or Noir compiler
- Theoretical attacks without a practical exploitation path
- Social engineering or phishing
- Denial-of-service against production infrastructure

## Safe Harbor

We will not pursue legal action against security researchers who:

- Act in good faith and comply with this policy
- Avoid privacy violations, data destruction, and service disruption
- Do not exploit vulnerabilities beyond minimal proof of concept
- Report findings through designated channels
- Allow reasonable time for remediation before disclosure

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch (latest) | Yes |
| Older commits | Best effort |

## Security Best Practices for Contributors

If you are contributing to PrivacyLayer, please follow these guidelines:

1. **Never commit secrets** - No private keys, API keys, or credentials in code
2. **Validate all inputs** - Both in contracts and client-side code
3. **Use constant-time operations** - For any sensitive comparisons
4. **Minimize dependencies** - Each new dependency is an attack surface
5. **Write tests** - Especially for edge cases and error paths
6. **Review cryptographic code carefully** - ZK circuit constraints must be complete and sound
7. **Follow the principle of least privilege** - Admin functions should be minimal

## Audit Status

> **This project has NOT undergone a formal security audit. Do not use in production.**

A formal security audit is planned before mainnet deployment. See [docs/threat-model.md](docs/threat-model.md) for known risks and threat analysis.

## Contact

- Security reports: [GitHub Security Advisories](https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new)
- Bug bounty questions: [Issue #94](https://github.com/ANAVHEOBA/PrivacyLayer/issues/94)
- General questions: [GitHub Discussions](https://github.com/ANAVHEOBA/PrivacyLayer/discussions)

---

*Last updated: March 2026*

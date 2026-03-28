# Mainnet Launch Checklist

This checklist outlines the essential steps and considerations for launching the PrivacyLayer mainnet. It is organized into six key categories: Security, Audit, Testing, Deployment, Rollback, and Communication.

---

## 1. Security Checklist

- [ ] **Code Review**: All new code merged into `main` has undergone thorough peer review.
- [ ] **Static Analysis**: Run static analysis tools (e.g., `cargo clippy`, `solidity‑lint`, `noir‑fmt`) on the entire codebase.
- [ ] **Dependency Audit**: Verify that all third‑party dependencies are up‑to‑date and have no known vulnerabilities.
- [ ] **Access Controls**: Ensure only authorized accounts can perform privileged actions (e.g., admin functions, contract upgrades).
- [ ] **Key Management**: Securely store and manage any private keys used for deployment and admin operations (e.g., hardware security modules, multi‑sig wallets).
- [ ] **Bug Bounty**: Confirm that a bug bounty program is live and funded for post‑launch security research.
- [ ] **Emergency Pause**: Verify that a pause/circuit‑breaker mechanism is implemented and can be triggered by the governance multisig.

---

## 2. Audit Requirements

- [ ] **External Audit**: Obtain a comprehensive audit from a reputable security firm covering:
  - Smart contract logic
  - ZK‑proof generation and verification
  - Integration with Stellar Soroban host functions
- [ ] **Audit Report Review**: Address all findings, re‑audit if necessary, and obtain a final sign‑off.
- [ ] **Audit Publication**: Publish the audit report (or a summary) in the repository's `docs/` folder and link it from the README.

---

## 3. Testing Requirements

- [ ] **Unit Tests**: Achieve ≥ 90 % coverage for all Rust/Noir modules and Soroban contracts.
- [ ] **Integration Tests**: Run end‑to‑end tests on a local Soroban testnet simulating deposit, withdrawal, and proof verification.
- [ ] **Fuzz Testing**: Execute fuzzing on critical functions (e.g., Merkle tree updates, proof verification) to uncover edge‑case bugs.
- [ ] **Performance Benchmarks**: Measure gas/fee consumption for deposit, withdraw, and proof verification; ensure they meet target thresholds.
- [ ] **Testnet Deployment**: Deploy the full stack to the public Soroban testnet and perform a full user flow with real XLM/USDC.
- [ ] **Chaos Testing**: Simulate network partitions, node failures, and high‑load scenarios to verify resilience.

---

## 4. Deployment Procedures

1. **Pre‑deployment Checklist**
   - Verify that the latest `main` branch passes CI/CD pipelines.
   - Ensure the compiled WASM prover and contract binaries are reproducible (deterministic builds).
2. **Contract Deployment**
   - Deploy the Soroban contract using the designated multisig account.
   - Record the contract ID and verify on‑chain storage initialization.
3. **Verifier & Prover Deployment**
   - Publish the ZK‑proof verifier contract (if separate) and the WASM prover binaries to a CDN with integrity hashes.
4. **Configuration**
   - Set environment variables (e.g., network endpoints, fee parameters) in the SDK and scripts.
5. **Post‑deployment Validation**
   - Execute a smoke test: deposit a small amount, generate a note, withdraw, and confirm funds arrive.
   - Verify Merkle tree root consistency across nodes.

---

## 5. Rollback Plans

- [ ] **Versioning**: Tag each release (`vX.Y.Z`) and keep previous contract binaries archived.
- [ ] **Upgrade Mechanism**: Ensure the contract includes an upgradeable proxy pattern or admin‑controlled migration path.
- [ ] **Emergency Pause**: Ability to pause all user‑facing functions within 2 minutes of detection.
- [ ] **Rollback Procedure**:
  1. Activate pause.
  2. Deploy the previous stable contract version.
  3. Migrate state if necessary (provide migration script).
  4. Unpause after verification.
- [ ] **Communication**: Notify the community immediately via the channels listed in the Communication Strategy.

---

## 6. Communication Strategy

- **Announcement Channels**:
  - Official Discord and Telegram communities.
  - Stellar community forums and Soroban developer newsletters.
  - Blog post on the project website.
- **Pre‑launch**:
  - Publish a “Launch Countdown” thread with dates and checklist milestones.
  - Share a security audit summary and link to the full report.
- **Launch Day**:
  - Real‑time status updates (e.g., “Deploying contract…”, “Verifier live”, “Mainnet ready”).
  - Provide a link to a live health‑check dashboard.
- **Post‑launch**:
  - Publish a “Launch Recap” with metrics (transactions, gas usage, any incidents).
  - Open a feedback thread for users to report issues.
- **Incident Response**:
  - Define a clear escalation path (dev lead → security lead → community manager).
  - Prepare templated statements for potential issues (e.g., “Bug discovered, pausing contract”).

---

## Checklist Summary

| Category | Item | Done |
|----------|------|------|
| Security | Code Review | [ ] |
| Security | Static Analysis | [ ] |
| Security | Dependency Audit | [ ] |
| Security | Access Controls | [ ] |
| Security | Key Management | [ ] |
| Security | Bug Bounty | [ ] |
| Security | Emergency Pause | [ ] |
| Audit | External Audit Completed | [ ] |
| Audit | Findings Addressed | [ ] |
| Audit | Report Published | [ ] |
| Testing | Unit Tests ≥90% | [ ] |
| Testing | Integration Tests on Testnet | [ ] |
| Testing | Fuzz Testing | [ ] |
| Testing | Performance Benchmarks | [ ] |
| Testing | Chaos Testing | [ ] |
| Deployment | Pre‑deployment CI Passed | [ ] |
| Deployment | Contract Deployed | [ ] |
| Deployment | Prover/Verifier Published | [ ] |
| Deployment | Configuration Set | [ ] |
| Deployment | Post‑deployment Smoke Test | [ ] |
| Rollback | Version Tags | [ ] |
| Rollback | Upgrade Mechanism Verified | [ ] |
| Rollback | Emergency Pause Tested | [ ] |
| Rollback | Migration Script Ready | [ ] |
| Communication | Announcement Drafted | [ ] |
| Communication | Launch Day Updates Planned | [ ] |
| Communication | Post‑launch Recap | [ ] |
| Communication | Incident Response Plan | [ ] |

---

*This checklist should be reviewed and updated regularly as the project evolves.*
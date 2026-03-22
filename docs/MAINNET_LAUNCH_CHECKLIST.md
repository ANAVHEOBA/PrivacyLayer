# PrivacyLayer Mainnet Launch Checklist

> **Status**: PRE-LAUNCH
> **Last Updated**: 2026-03-22
> **Target Network**: Stellar Mainnet (Protocol 25+)
> **Contract**: Privacy Pool (ZK Shielded Pool on Soroban)

This document defines every prerequisite, verification step, and operational
procedure that **must** be completed before PrivacyLayer smart contracts are
deployed to the Stellar mainnet. Each item carries a severity level, an
owner role, and a checkbox for tracking.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Blocks launch. Must be resolved or mainnet deployment is not safe. |
| **HIGH** | Strongly recommended. Skipping introduces significant risk. |
| **MEDIUM** | Best practice. Should be addressed before or shortly after launch. |
| **LOW** | Nice-to-have. Can follow in a post-launch iteration. |

## Owner Roles

| Role | Abbreviation |
|------|--------------|
| Security Lead | **SEC** |
| Smart Contract Engineer | **SCE** |
| ZK / Circuits Engineer | **ZKE** |
| DevOps / Infrastructure | **OPS** |
| Project Lead | **PL** |
| Frontend Engineer | **FE** |
| SDK Engineer | **SDK** |
| Community / Comms | **COM** |

---

## 1. Security Audit

### 1.1 Smart Contract Audit

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 1.1.1 | [ ] Engage independent auditor with Soroban/Rust experience | CRITICAL | PL |  |
| 1.1.2 | [ ] Provide auditor with full source: `contracts/privacy_pool/` | CRITICAL | SCE |  |
| 1.1.3 | [ ] Review all error codes in `types/errors.rs` for completeness | HIGH | SEC |  |
| 1.1.4 | [ ] Audit `deposit.rs` — verify `require_auth()` is called before any state change | CRITICAL | SEC |  |
| 1.1.5 | [ ] Audit `withdraw.rs` — verify nullifier is marked spent **before** funds transfer | CRITICAL | SEC |  |
| 1.1.6 | [ ] Audit `merkle.rs` — verify root history circular buffer cannot be corrupted | CRITICAL | SEC |  |
| 1.1.7 | [ ] Audit `verifier.rs` — verify Groth16 pairing check matches reference implementation | CRITICAL | SEC |  |
| 1.1.8 | [ ] Verify `transfer_funds()` handles relayer fee edge cases (fee = 0, fee = amount) | HIGH | SEC |  |
| 1.1.9 | [ ] Verify `admin.rs` — ensure admin key rotation is safe and cannot brick contract | HIGH | SEC |  |
| 1.1.10 | [ ] Confirm no integer overflow in `denomination.amount()` calculations | HIGH | SEC |  |
| 1.1.11 | [ ] Review `config.rs` storage — confirm TTL and persistence strategy | MEDIUM | SEC |  |
| 1.1.12 | [ ] Publish audit report to `docs/audit/` | HIGH | PL |  |
| 1.1.13 | [ ] Address all CRITICAL and HIGH findings from audit | CRITICAL | SCE |  |
| 1.1.14 | [ ] Re-audit after fixes (delta audit) | CRITICAL | SEC |  |

### 1.2 ZK Circuit Audit

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 1.2.1 | [ ] Engage auditor with Noir/ZK-SNARK expertise | CRITICAL | PL |  |
| 1.2.2 | [ ] Audit `circuits/commitment/src/main.nr` — verify Poseidon commitment scheme | CRITICAL | SEC |  |
| 1.2.3 | [ ] Audit `circuits/withdraw/src/main.nr` — verify Merkle path + nullifier proof | CRITICAL | SEC |  |
| 1.2.4 | [ ] Audit `circuits/merkle/src/lib.nr` — verify Merkle tree utilities | CRITICAL | SEC |  |
| 1.2.5 | [ ] Audit `circuits/lib/src/hash/` — verify hash function implementations | CRITICAL | SEC |  |
| 1.2.6 | [ ] Audit `circuits/lib/src/validation/` — verify input constraint correctness | HIGH | SEC |  |
| 1.2.7 | [ ] Verify constraint count is within Soroban gas limits for proof verification | CRITICAL | ZKE |  |
| 1.2.8 | [ ] Verify no under-constrained variables (soundness check) | CRITICAL | SEC |  |
| 1.2.9 | [ ] Verify no over-constrained circuits that reject valid proofs | HIGH | ZKE |  |
| 1.2.10 | [ ] Run `nargo test` on all circuits — 100% pass | CRITICAL | ZKE |  |
| 1.2.11 | [ ] Verify trusted setup ceremony (if Groth16 with per-circuit setup) | CRITICAL | SEC |  |
| 1.2.12 | [ ] Document circuit constraint counts and gas estimates | MEDIUM | ZKE |  |

### 1.3 Cryptographic Verification

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 1.3.1 | [ ] Verify BN254 curve parameters match Stellar Protocol 25 CAP-0074 | CRITICAL | ZKE |  |
| 1.3.2 | [ ] Verify Poseidon2 hash parameters match Stellar Protocol 25 CAP-0075 | CRITICAL | ZKE |  |
| 1.3.3 | [ ] Verify Poseidon2 t=3 (rate=2, capacity=1) matches Noir circuit implementation | CRITICAL | ZKE |  |
| 1.3.4 | [ ] Confirm Groth16 verification equation: e(-A,B) * e(alpha,beta) * e(vk_x,gamma) * e(C,delta) == 1 | CRITICAL | ZKE |  |
| 1.3.5 | [ ] Verify IC point count = 7 (IC[0] + 6 public inputs: root, nullifier_hash, recipient, amount, relayer, fee) | CRITICAL | ZKE |  |
| 1.3.6 | [ ] Cross-check zero-value chain: zero(0) = Poseidon2(0,0), zero(i) = Poseidon2(zero(i-1), zero(i-1)) | HIGH | ZKE |  |
| 1.3.7 | [ ] Verify Merkle tree depth = 20 (supports 1,048,576 deposits) is appropriate | MEDIUM | ZKE |  |
| 1.3.8 | [ ] Verify root history size = 30 is sufficient for concurrent withdrawal windows | MEDIUM | ZKE |  |

---

## 2. Smart Contract Deployment Verification

### 2.1 Pre-Deployment Checks

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 2.1.1 | [ ] `cargo build --target wasm32-unknown-unknown --release` succeeds cleanly | CRITICAL | SCE |  |
| 2.1.2 | [ ] `cargo test` — all unit tests pass | CRITICAL | SCE |  |
| 2.1.3 | [ ] All integration tests in `integration_test.rs` pass | CRITICAL | SCE |  |
| 2.1.4 | [ ] WASM binary size is within Soroban deployment limits | CRITICAL | SCE |  |
| 2.1.5 | [ ] WASM binary is reproducibly built (deterministic build) | HIGH | OPS |  |
| 2.1.6 | [ ] Git tag created for the release commit (e.g., `v1.0.0-mainnet`) | HIGH | SCE |  |
| 2.1.7 | [ ] Source code matches the exact audited version (git SHA comparison) | CRITICAL | SEC |  |
| 2.1.8 | [ ] No debug/test code left in production contract | HIGH | SCE |  |
| 2.1.9 | [ ] All `TODO` and `FIXME` comments resolved | MEDIUM | SCE |  |

### 2.2 Testnet Validation

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 2.2.1 | [ ] Deploy contract to Stellar Testnet | CRITICAL | SCE |  |
| 2.2.2 | [ ] Execute `initialize()` with correct parameters | CRITICAL | SCE |  |
| 2.2.3 | [ ] Perform deposit with XLM denomination — verify commitment inserted | CRITICAL | SCE |  |
| 2.2.4 | [ ] Perform deposit with USDC denomination — verify commitment inserted | CRITICAL | SCE |  |
| 2.2.5 | [ ] Generate valid Groth16 proof and execute withdrawal | CRITICAL | ZKE |  |
| 2.2.6 | [ ] Verify nullifier marked as spent after withdrawal | CRITICAL | SCE |  |
| 2.2.7 | [ ] Verify double-spend (same nullifier) is rejected with `NullifierAlreadySpent` | CRITICAL | SCE |  |
| 2.2.8 | [ ] Verify invalid proof is rejected with `InvalidProof` | CRITICAL | SCE |  |
| 2.2.9 | [ ] Verify deposit while paused returns `PoolPaused` | HIGH | SCE |  |
| 2.2.10 | [ ] Verify withdrawal while paused returns `PoolPaused` | HIGH | SCE |  |
| 2.2.11 | [ ] Verify tree full condition (simulate 2^20 deposits or test boundary) | MEDIUM | SCE |  |
| 2.2.12 | [ ] Verify root history eviction after 30+ deposits | HIGH | SCE |  |
| 2.2.13 | [ ] Verify relayer fee distribution (net to recipient, fee to relayer) | HIGH | SCE |  |
| 2.2.14 | [ ] Verify zero-fee withdrawal (relayer = zero address) | HIGH | SCE |  |
| 2.2.15 | [ ] Test concurrent depositors with independent notes | MEDIUM | SCE |  |
| 2.2.16 | [ ] Verify admin can update verifying key | HIGH | SCE |  |
| 2.2.17 | [ ] Verify non-admin cannot pause/unpause/update VK | CRITICAL | SCE |  |
| 2.2.18 | [ ] Run testnet soak test (100+ deposits/withdrawals over 24h) | HIGH | OPS |  |

### 2.3 Mainnet Deployment Steps

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 2.3.1 | [ ] Upload WASM to Stellar Mainnet using `stellar contract deploy` | CRITICAL | OPS |  |
| 2.3.2 | [ ] Record deployed contract address in `docs/deployments.md` | CRITICAL | OPS |  |
| 2.3.3 | [ ] Record deployer account public key | CRITICAL | OPS |  |
| 2.3.4 | [ ] Record exact WASM hash for verification | CRITICAL | OPS |  |
| 2.3.5 | [ ] Call `initialize()` with production admin address | CRITICAL | OPS |  |
| 2.3.6 | [ ] Call `initialize()` with production token address (XLM SAC or USDC SAC) | CRITICAL | OPS |  |
| 2.3.7 | [ ] Set production denomination (e.g., 100 XLM, 100 USDC) | CRITICAL | OPS |  |
| 2.3.8 | [ ] Upload production verifying key via `set_vk()` | CRITICAL | OPS |  |
| 2.3.9 | [ ] Verify contract is in unpaused state | CRITICAL | OPS |  |
| 2.3.10 | [ ] Perform a single low-value deposit as smoke test | CRITICAL | OPS |  |
| 2.3.11 | [ ] Perform withdrawal of smoke test deposit | CRITICAL | OPS |  |
| 2.3.12 | [ ] Verify contract state is consistent after smoke test | CRITICAL | OPS |  |

---

## 3. ZK Circuit Verification

### 3.1 Circuit Build & Trusted Setup

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 3.1.1 | [ ] `nargo build` — all circuits compile without warnings | CRITICAL | ZKE |  |
| 3.1.2 | [ ] `nargo test` — all circuit tests pass | CRITICAL | ZKE |  |
| 3.1.3 | [ ] Generate production proving key and verifying key | CRITICAL | ZKE |  |
| 3.1.4 | [ ] Verify trusted setup ceremony participants (if applicable) | CRITICAL | SEC |  |
| 3.1.5 | [ ] Store proving key securely (used by SDK/relayer) | CRITICAL | OPS |  |
| 3.1.6 | [ ] Store verifying key in contract via `set_vk()` | CRITICAL | OPS |  |
| 3.1.7 | [ ] Verify VK on-chain matches VK from setup ceremony | CRITICAL | ZKE |  |
| 3.1.8 | [ ] Publish VK hash for independent verification | HIGH | ZKE |  |

### 3.2 Proof Generation Testing

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 3.2.1 | [ ] Generate 10+ proofs with random valid inputs — all verify on-chain | CRITICAL | ZKE |  |
| 3.2.2 | [ ] Generate proofs with boundary values (max field elements) | HIGH | ZKE |  |
| 3.2.3 | [ ] Verify invalid witness produces invalid proof (rejected by verifier) | HIGH | ZKE |  |
| 3.2.4 | [ ] Measure average proof generation time (target: < 30s on consumer hardware) | MEDIUM | ZKE |  |
| 3.2.5 | [ ] Measure proof size in bytes (fits in Soroban transaction) | CRITICAL | ZKE |  |
| 3.2.6 | [ ] Verify WASM prover (for browser SDK) produces same proofs as native | HIGH | ZKE |  |

---

## 4. Network Configuration

### 4.1 Stellar Network Verification

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 4.1.1 | [ ] Confirm Stellar Mainnet is on Protocol 25+ (BN254 + Poseidon available) | CRITICAL | OPS |  |
| 4.1.2 | [ ] Verify `bn254_pairing` host function is active on mainnet validators | CRITICAL | OPS |  |
| 4.1.3 | [ ] Verify `poseidon2_hash` host function is active on mainnet validators | CRITICAL | OPS |  |
| 4.1.4 | [ ] Test Horizon API endpoint connectivity and latency | HIGH | OPS |  |
| 4.1.5 | [ ] Configure Soroban RPC endpoint (primary + fallback) | HIGH | OPS |  |
| 4.1.6 | [ ] Verify gas/fee budget for deposit transaction (single Poseidon2 + Merkle insert) | CRITICAL | SCE |  |
| 4.1.7 | [ ] Verify gas/fee budget for withdrawal transaction (proof verification + transfers) | CRITICAL | SCE |  |
| 4.1.8 | [ ] Verify Soroban storage limits accommodate tree depth = 20 | HIGH | SCE |  |
| 4.1.9 | [ ] Verify contract invocation limits (max instruction count per tx) | CRITICAL | SCE |  |

### 4.2 Token Configuration

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 4.2.1 | [ ] Identify mainnet XLM SAC (Stellar Asset Contract) address | CRITICAL | SCE |  |
| 4.2.2 | [ ] Identify mainnet USDC SAC address (Centre/Circle issued) | CRITICAL | SCE |  |
| 4.2.3 | [ ] Verify denomination amounts are reasonable (e.g., 100 XLM, 10 USDC) | HIGH | PL |  |
| 4.2.4 | [ ] Verify contract can hold and transfer tokens (SAC compatibility) | CRITICAL | SCE |  |
| 4.2.5 | [ ] Test token approval flow for depositors | CRITICAL | SCE |  |

---

## 5. Monitoring and Alerting

### 5.1 On-Chain Monitoring

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 5.1.1 | [ ] Set up event listener for `Deposit` events | HIGH | OPS |  |
| 5.1.2 | [ ] Set up event listener for `Withdraw` events | HIGH | OPS |  |
| 5.1.3 | [ ] Monitor Merkle tree `next_index` (capacity usage) | HIGH | OPS |  |
| 5.1.4 | [ ] Alert when tree reaches 80% capacity (838,860 deposits) | MEDIUM | OPS |  |
| 5.1.5 | [ ] Alert when tree reaches 95% capacity (996,147 deposits) | HIGH | OPS |  |
| 5.1.6 | [ ] Monitor contract XLM/USDC balance vs expected (deposits - withdrawals) | CRITICAL | OPS |  |
| 5.1.7 | [ ] Alert on balance mismatch (potential exploit indicator) | CRITICAL | OPS |  |
| 5.1.8 | [ ] Monitor for failed withdrawal attempts (potential attack patterns) | HIGH | SEC |  |
| 5.1.9 | [ ] Monitor for rapid successive deposits (potential spam/DoS) | MEDIUM | SEC |  |
| 5.1.10 | [ ] Track unique depositor count and withdrawal patterns | LOW | OPS |  |

### 5.2 Infrastructure Monitoring

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 5.2.1 | [ ] Monitor Soroban RPC endpoint availability (uptime check) | HIGH | OPS |  |
| 5.2.2 | [ ] Monitor Horizon API response times | MEDIUM | OPS |  |
| 5.2.3 | [ ] Monitor relayer service health (if operating relayer) | HIGH | OPS |  |
| 5.2.4 | [ ] Set up PagerDuty/Opsgenie for CRITICAL alerts | HIGH | OPS |  |
| 5.2.5 | [ ] Configure alert escalation: OPS -> SEC -> PL | MEDIUM | OPS |  |
| 5.2.6 | [ ] Set up dashboard (Grafana or equivalent) for key metrics | MEDIUM | OPS |  |
| 5.2.7 | [ ] Monitor Stellar network upgrades that could affect Protocol 25 primitives | HIGH | OPS |  |

---

## 6. Incident Response Procedures

### 6.1 Incident Classification

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **P0 — Critical** | Funds at risk, active exploit | < 15 minutes | Balance mismatch, proof forgery |
| **P1 — High** | Service degraded, potential vulnerability | < 1 hour | Failed proof verifications spike |
| **P2 — Medium** | Non-critical issue | < 4 hours | Monitoring gap, RPC failover |
| **P3 — Low** | Minor issue | < 24 hours | Documentation error, UI glitch |

### 6.2 Incident Response Checklist

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 6.2.1 | [ ] Document incident response team contact list (phone, Signal, email) | CRITICAL | PL |  |
| 6.2.2 | [ ] Define incident commander role and rotation schedule | HIGH | PL |  |
| 6.2.3 | [ ] Document admin key holders and their availability (24/7 coverage) | CRITICAL | SEC |  |
| 6.2.4 | [ ] Create runbook: "How to pause the pool" (step-by-step with CLI commands) | CRITICAL | OPS |  |
| 6.2.5 | [ ] Create runbook: "How to verify contract state integrity" | HIGH | OPS |  |
| 6.2.6 | [ ] Create runbook: "How to rotate admin key in emergency" | HIGH | SEC |  |
| 6.2.7 | [ ] Create runbook: "How to update verifying key" | HIGH | OPS |  |
| 6.2.8 | [ ] Create template for post-incident report | MEDIUM | PL |  |
| 6.2.9 | [ ] Conduct tabletop exercise: simulated exploit scenario | HIGH | SEC |  |
| 6.2.10 | [ ] Conduct tabletop exercise: simulated network outage | MEDIUM | OPS |  |
| 6.2.11 | [ ] Verify admin can pause contract within 5 minutes of alert | CRITICAL | OPS |  |

### 6.3 Emergency Contacts

| Role | Primary | Backup | Escalation |
|------|---------|--------|------------|
| Incident Commander | _TBD_ | _TBD_ | _TBD_ |
| Security Lead | _TBD_ | _TBD_ | _TBD_ |
| Smart Contract Engineer | _TBD_ | _TBD_ | _TBD_ |
| DevOps | _TBD_ | _TBD_ | _TBD_ |
| Communications | _TBD_ | _TBD_ | _TBD_ |

---

## 7. Rollback Procedures

### 7.1 Contract Rollback

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 7.1.1 | [ ] Document that Soroban contracts are immutable once deployed | HIGH | SCE |  |
| 7.1.2 | [ ] Implement pause mechanism as primary "kill switch" (already in `admin.rs`) | CRITICAL | SCE |  |
| 7.1.3 | [ ] Verify `pause()` blocks both deposits and withdrawals | CRITICAL | SCE |  |
| 7.1.4 | [ ] Verify `unpause()` restores normal operation | CRITICAL | SCE |  |
| 7.1.5 | [ ] Document procedure: pause -> deploy fixed contract -> migrate state | HIGH | SCE |  |
| 7.1.6 | [ ] Design migration path: how to move funds from v1 to v2 contract | HIGH | SCE |  |
| 7.1.7 | [ ] Document that existing notes/proofs are bound to the specific contract | HIGH | ZKE |  |
| 7.1.8 | [ ] Plan for user communication during pause/migration | MEDIUM | COM |  |

### 7.2 State Recovery

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 7.2.1 | [ ] Document how to reconstruct Merkle tree state from on-chain events | HIGH | SCE |  |
| 7.2.2 | [ ] Document how to verify all nullifiers in storage match withdrawal events | HIGH | SCE |  |
| 7.2.3 | [ ] Create script to audit contract balance vs deposit/withdrawal history | HIGH | OPS |  |
| 7.2.4 | [ ] Plan for graceful drain: allow all valid withdrawals before migration | HIGH | SCE |  |
| 7.2.5 | [ ] Verify admin can force-return funds in catastrophic scenario | MEDIUM | SCE |  |

---

## 8. Performance Benchmarks

### 8.1 On-Chain Performance

| # | Metric | Target | Severity | Owner | Verified |
|---|--------|--------|----------|-------|----------|
| 8.1.1 | [ ] Deposit transaction gas cost | < 50% of max Soroban tx budget | CRITICAL | SCE |  |
| 8.1.2 | [ ] Withdrawal transaction gas cost (with proof verification) | < 80% of max Soroban tx budget | CRITICAL | SCE |  |
| 8.1.3 | [ ] Merkle insert (20 Poseidon2 hashes) execution time | < 5 seconds | HIGH | SCE |  |
| 8.1.4 | [ ] Groth16 pairing check execution time | < 10 seconds | HIGH | SCE |  |
| 8.1.5 | [ ] Contract storage usage per deposit | Documented | MEDIUM | SCE |  |
| 8.1.6 | [ ] Root history lookup time (30-entry scan) | < 1 second | HIGH | SCE |  |

### 8.2 Off-Chain Performance

| # | Metric | Target | Severity | Owner | Verified |
|---|--------|--------|----------|-------|----------|
| 8.2.1 | [ ] Proof generation time (native) | < 30 seconds | HIGH | ZKE |  |
| 8.2.2 | [ ] Proof generation time (WASM / browser) | < 120 seconds | MEDIUM | ZKE |  |
| 8.2.3 | [ ] Merkle tree sync time (full tree from events) | < 60 seconds | MEDIUM | SDK |  |
| 8.2.4 | [ ] Merkle proof generation time (client-side) | < 5 seconds | HIGH | SDK |  |
| 8.2.5 | [ ] Note generation time | < 1 second | LOW | SDK |  |
| 8.2.6 | [ ] End-to-end deposit flow (user click to confirmation) | < 30 seconds | MEDIUM | FE |  |
| 8.2.7 | [ ] End-to-end withdrawal flow (proof gen + submit + confirm) | < 180 seconds | MEDIUM | FE |  |

### 8.3 Load Testing

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 8.3.1 | [ ] Simulate 100 deposits in rapid succession | HIGH | OPS |  |
| 8.3.2 | [ ] Simulate 50 concurrent withdrawal proof submissions | HIGH | OPS |  |
| 8.3.3 | [ ] Verify no state corruption under concurrent access | CRITICAL | SCE |  |
| 8.3.4 | [ ] Measure peak TPS for deposit operations | MEDIUM | OPS |  |
| 8.3.5 | [ ] Verify root history handles rapid deposits (30+ in quick succession) | HIGH | SCE |  |

---

## 9. Key Management

### 9.1 Admin Key Security

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 9.1.1 | [ ] Admin key stored in hardware wallet (Ledger or equivalent) | CRITICAL | SEC |  |
| 9.1.2 | [ ] Admin key is a multisig account (e.g., 2-of-3) | CRITICAL | SEC |  |
| 9.1.3 | [ ] Multisig signers are geographically distributed | HIGH | SEC |  |
| 9.1.4 | [ ] At least one signer available 24/7 for emergency pause | CRITICAL | SEC |  |
| 9.1.5 | [ ] Admin key NEVER stored on internet-connected machine in plaintext | CRITICAL | SEC |  |
| 9.1.6 | [ ] Admin key backup procedure documented and tested | HIGH | SEC |  |
| 9.1.7 | [ ] Admin key rotation procedure documented | HIGH | SEC |  |
| 9.1.8 | [ ] Test admin operations (pause, unpause, set_vk) with multisig flow | CRITICAL | SEC |  |

### 9.2 Deployer Key Security

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 9.2.1 | [ ] Deployer key is separate from admin key | HIGH | SEC |  |
| 9.2.2 | [ ] Deployer key can be decommissioned after deployment | MEDIUM | SEC |  |
| 9.2.3 | [ ] Deployer account funded with sufficient XLM for deployment fees | HIGH | OPS |  |

### 9.3 Verifying Key Management

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 9.3.1 | [ ] Production verifying key generated from audited circuits only | CRITICAL | ZKE |  |
| 9.3.2 | [ ] VK hash published in documentation for independent verification | HIGH | ZKE |  |
| 9.3.3 | [ ] VK update procedure requires multisig admin approval | HIGH | SEC |  |
| 9.3.4 | [ ] VK change triggers alert in monitoring system | HIGH | OPS |  |
| 9.3.5 | [ ] Document impact of VK change on existing unspent notes | CRITICAL | ZKE |  |

### 9.4 User Key / Note Security

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 9.4.1 | [ ] Document that note (nullifier + secret) is the ONLY way to withdraw | CRITICAL | COM |  |
| 9.4.2 | [ ] SDK provides note backup/export functionality | HIGH | SDK |  |
| 9.4.3 | [ ] Frontend prompts user to save note immediately after deposit | HIGH | FE |  |
| 9.4.4 | [ ] Document that lost notes = lost funds (no recovery possible) | CRITICAL | COM |  |
| 9.4.5 | [ ] Note stored encrypted at rest in browser (localStorage or IndexedDB + encryption) | HIGH | FE |  |

---

## 10. Governance Setup

### 10.1 Admin Governance

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 10.1.1 | [ ] Define admin governance model (multisig threshold, signer roles) | CRITICAL | PL |  |
| 10.1.2 | [ ] Document admin capabilities: pause, unpause, set_vk | HIGH | PL |  |
| 10.1.3 | [ ] Document what admin CANNOT do (no fund access, no user data) | HIGH | COM |  |
| 10.1.4 | [ ] Establish admin action logging (all admin txs recorded off-chain) | HIGH | OPS |  |
| 10.1.5 | [ ] Define VK update governance (who approves, when, why) | HIGH | PL |  |
| 10.1.6 | [ ] Define pause governance (who can trigger, under what conditions) | CRITICAL | PL |  |

### 10.2 Upgrade Governance

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 10.2.1 | [ ] Define contract upgrade process (deploy v2, migrate, deprecate v1) | HIGH | PL |  |
| 10.2.2 | [ ] Require audit for all contract upgrades | CRITICAL | SEC |  |
| 10.2.3 | [ ] Minimum 7-day notice before any contract migration | HIGH | COM |  |
| 10.2.4 | [ ] Community can verify all contract source code on-chain | HIGH | SCE |  |
| 10.2.5 | [ ] All governance decisions documented in public repository | MEDIUM | PL |  |

### 10.3 Communication Governance

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 10.3.1 | [ ] Establish official communication channels (Discord, Twitter, GitHub) | HIGH | COM |  |
| 10.3.2 | [ ] Create security disclosure policy (SECURITY.md) | CRITICAL | SEC |  |
| 10.3.3 | [ ] Set up bug bounty program for post-launch vulnerability reports | HIGH | SEC |  |
| 10.3.4 | [ ] Prepare launch announcement with accurate technical details | MEDIUM | COM |  |
| 10.3.5 | [ ] Prepare FAQ document covering common user questions | MEDIUM | COM |  |

---

## 11. Documentation Completeness

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 11.1 | [ ] Architecture documentation is current and accurate | HIGH | SCE |  |
| 11.2 | [ ] API reference for all contract entry points | HIGH | SCE |  |
| 11.3 | [ ] SDK usage guide with code examples | HIGH | SDK |  |
| 11.4 | [ ] Deployment guide (step-by-step for mainnet) | CRITICAL | OPS |  |
| 11.5 | [ ] Threat model document (`docs/threat-model.md`) is complete | HIGH | SEC |  |
| 11.6 | [ ] User guide: how to deposit and withdraw | HIGH | FE |  |
| 11.7 | [ ] Note backup and recovery guide | CRITICAL | COM |  |
| 11.8 | [ ] Relayer setup guide (if applicable) | MEDIUM | OPS |  |
| 11.9 | [ ] Compliance documentation (KYC/AML considerations) | HIGH | PL |  |
| 11.10 | [ ] Contract deployment addresses published | CRITICAL | OPS |  |
| 11.11 | [ ] CONTRIBUTING.md is up to date | LOW | PL |  |
| 11.12 | [ ] LICENSE file present and correct | LOW | PL |  |

---

## 12. Compliance and Legal

| # | Item | Severity | Owner | Done |
|---|------|----------|-------|------|
| 12.1 | [ ] Legal review of privacy pool regulatory implications | HIGH | PL |  |
| 12.2 | [ ] Compliance-forward features documented (audit trail via events) | HIGH | PL |  |
| 12.3 | [ ] OFAC/sanctions screening strategy for relayers (if applicable) | HIGH | PL |  |
| 12.4 | [ ] Terms of service drafted | MEDIUM | PL |  |
| 12.5 | [ ] Privacy policy drafted | MEDIUM | PL |  |
| 12.6 | [ ] Open-source license (MIT) confirmed for all code | LOW | PL |  |

---

## 13. Pre-Launch Final Sign-Off

All items below must be checked by the indicated role before proceeding to
mainnet deployment.

| # | Gate | Approver | Signed | Date |
|---|------|----------|--------|------|
| 13.1 | All CRITICAL audit findings resolved | SEC | [ ] |  |
| 13.2 | All CRITICAL test cases pass | SCE + ZKE | [ ] |  |
| 13.3 | Testnet soak test completed (24h+) | OPS | [ ] |  |
| 13.4 | Admin multisig configured and tested | SEC | [ ] |  |
| 13.5 | Monitoring and alerting operational | OPS | [ ] |  |
| 13.6 | Incident response runbooks complete | OPS + SEC | [ ] |  |
| 13.7 | Performance benchmarks within targets | SCE | [ ] |  |
| 13.8 | Documentation complete | PL | [ ] |  |
| 13.9 | Communication plan ready | COM | [ ] |  |
| 13.10 | **GO / NO-GO decision** | **PL + SEC + SCE** | [ ] |  |

---

## Appendix A: Contract Error Reference

For quick incident triage, here is the complete error code map from
`types/errors.rs`:

| Code | Name | Category | Meaning |
|------|------|----------|---------|
| 1 | `AlreadyInitialized` | Initialization | Contract was already initialized |
| 2 | `NotInitialized` | Initialization | Contract has not been initialized |
| 10 | `UnauthorizedAdmin` | Access Control | Caller is not admin |
| 20 | `PoolPaused` | Pool State | Pool is paused |
| 21 | `TreeFull` | Pool State | Merkle tree at max capacity (2^20) |
| 30 | `WrongAmount` | Deposit | Incorrect deposit denomination |
| 31 | `ZeroCommitment` | Deposit | Commitment is zero (invalid) |
| 40 | `UnknownRoot` | Withdrawal | Merkle root not in history |
| 41 | `NullifierAlreadySpent` | Withdrawal | Double-spend attempt |
| 42 | `InvalidProof` | Withdrawal | Groth16 verification failed |
| 43 | `FeeExceedsAmount` | Withdrawal | Fee > denomination |
| 44 | `InvalidRelayerFee` | Withdrawal | Relayer set but fee is zero |
| 45 | `InvalidRecipient` | Withdrawal | Bad recipient address |
| 50 | `NoVerifyingKey` | Verifying Key | VK not set |
| 51 | `MalformedVerifyingKey` | Verifying Key | VK wrong byte length |
| 60 | `MalformedProofA` | Proof Format | Proof point A bad length |
| 61 | `MalformedProofB` | Proof Format | Proof point B bad length |
| 62 | `MalformedProofC` | Proof Format | Proof point C bad length |
| 70 | `PointNotOnCurve` | BN254 | Point not on BN254 curve |
| 71 | `PairingFailed` | BN254 | Pairing check failed |

---

## Appendix B: Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| `TREE_DEPTH` | 20 | `crypto/merkle.rs` |
| `ROOT_HISTORY_SIZE` | 30 | `crypto/merkle.rs` |
| Max deposits | 1,048,576 (2^20) | `crypto/merkle.rs` |
| Public inputs count | 6 (root, nullifier_hash, recipient, amount, relayer, fee) | `crypto/verifier.rs` |
| IC points in VK | 7 (IC[0] + 6 inputs) | `crypto/verifier.rs` |
| Hash function | Poseidon2 (t=3, BN254 field) | `crypto/merkle.rs` |
| Proof system | Groth16 over BN254 | `crypto/verifier.rs` |
| Curve | BN254 (alt-bn128) | Stellar Protocol 25 CAP-0074 |

---

## Appendix C: Post-Launch Monitoring Queries

### Deposit Rate
```
SELECT COUNT(*) as deposits, DATE(timestamp) as day
FROM deposit_events
GROUP BY day
ORDER BY day DESC
LIMIT 30;
```

### Balance Reconciliation
```
expected_balance = SUM(deposit_amounts) - SUM(withdrawal_amounts)
actual_balance = stellar_contract_balance(contract_id, token_id)
ALERT IF expected_balance != actual_balance
```

### Nullifier Double-Spend Attempts
```
SELECT nullifier_hash, COUNT(*) as attempts
FROM withdrawal_attempts
WHERE error_code = 41  -- NullifierAlreadySpent
GROUP BY nullifier_hash
HAVING attempts > 1
ORDER BY attempts DESC;
```

---

*This checklist is a living document. Update it as the project evolves and
new requirements are identified. All items marked CRITICAL must be resolved
before mainnet deployment proceeds.*

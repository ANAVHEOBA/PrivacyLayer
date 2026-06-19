# PrivacyLayer Disaster Recovery Plan

> **Classification:** CONFIDENTIAL
> **Version:** 1.0.0
> **Last Updated:** 2026-03-22
> **Document Owner:** PrivacyLayer Core Team
> **Review Cadence:** Quarterly

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Objectives](#2-scope-and-objectives)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [RTO/RPO Objectives](#4-rtorpo-objectives)
5. [Risk Assessment Matrix](#5-risk-assessment-matrix)
6. [Incident Classification](#6-incident-classification)
7. [Emergency Contacts and Escalation Matrix](#7-emergency-contacts-and-escalation-matrix)
8. [Recovery Procedures](#8-recovery-procedures)
   - 8.1 [Smart Contract Exploit](#81-smart-contract-exploit)
   - 8.2 [Admin Key Compromise](#82-admin-key-compromise)
   - 8.3 [ZK Proof System Failure](#83-zk-proof-system-failure)
   - 8.4 [Merkle Tree Corruption](#84-merkle-tree-corruption)
   - 8.5 [Stellar Network Issues](#85-stellar-network-issues)
   - 8.6 [Data Loss and Backup Restore](#86-data-loss-and-backup-restore)
   - 8.7 [Frontend/SDK Outage](#87-frontendsdk-outage)
   - 8.8 [Dependency Supply Chain Attack](#88-dependency-supply-chain-attack)
9. [Failover Procedures](#9-failover-procedures)
10. [Backup and Restore Procedures](#10-backup-and-restore-procedures)
11. [Communication Templates](#11-communication-templates)
12. [Post-Incident Review Process](#12-post-incident-review-process)
13. [DR Testing Schedule](#13-dr-testing-schedule)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

PrivacyLayer is the first ZK-proof shielded pool on Stellar Soroban, handling privacy-sensitive cryptographic operations and user funds. This Disaster Recovery Plan (DRP) ensures operational continuity, minimizes downtime, and protects user assets during adverse events.

This plan covers all system components: Soroban smart contracts, ZK circuits (Noir/Groth16), the TypeScript SDK, the Next.js frontend, and supporting infrastructure. Because PrivacyLayer processes irreversible on-chain transactions using zero-knowledge proofs, recovery procedures must account for the immutable nature of blockchain state and the cryptographic guarantees that underpin user privacy.

**Key principles:**
- User funds safety is the absolute top priority.
- Privacy guarantees must never be degraded during recovery.
- The admin `pause()` function is the first line of defense for on-chain incidents.
- All recovery actions must be logged and auditable.
- Communication must be timely, accurate, and transparent.

---

## 2. Scope and Objectives

### In Scope

| Component | Description |
|-----------|-------------|
| Soroban Smart Contracts | `PrivacyPool` contract (deposit, withdraw, admin, Merkle tree, Groth16 verifier) |
| ZK Circuits | Noir circuits for commitment, withdrawal proofs, and Merkle tree operations |
| Verifying Key | Groth16 verification key stored on-chain |
| TypeScript SDK | Client-side note generation, Merkle sync, proof creation |
| Next.js Frontend | User-facing dApp with Freighter wallet integration |
| Deployment Infrastructure | CI/CD pipelines, hosting, DNS |
| Off-chain Data | User notes (nullifier + secret backups), Merkle tree snapshots |

### Out of Scope

- Stellar network core infrastructure (managed by SDF)
- Third-party wallet software (Freighter, Albedo)
- User device security

### Objectives

1. Protect user funds deposited in the shielded pool at all times.
2. Maintain privacy guarantees (no link between deposit and withdrawal addresses).
3. Restore full system functionality within defined RTO targets.
4. Provide clear, actionable procedures for every identified disaster scenario.
5. Ensure the team can execute recovery without single points of failure.

---

## 3. System Architecture Overview

```
                    +-----------------+
                    |   Frontend      |
                    |   (Next.js)     |
                    +--------+--------+
                             |
                    +--------v--------+
                    |   SDK           |
                    |   (TypeScript)  |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+      +-----------v-----------+
    | Noir ZK Prover    |      | Soroban Contract      |
    | (WASM, client)    |      | (on-chain)            |
    |                   |      |                        |
    | - commitment      |      | - deposit()           |
    | - withdrawal      |      | - withdraw()          |
    | - merkle proof    |      | - pause()/unpause()   |
    +-------------------+      | - Merkle tree (d=20)  |
                               | - Groth16 verifier    |
                               | - Nullifier registry  |
                               +-----------+-----------+
                                           |
                               +-----------v-----------+
                               | Stellar Soroban       |
                               | (Protocol 25)         |
                               | - BN254 host fns      |
                               | - Poseidon2 host fns  |
                               +-----------------------+
```

**Critical on-chain state:**
- Merkle tree (2^20 leaves, incremental insertion)
- Nullifier set (spent nullifiers to prevent double-spend)
- Pool configuration (admin address, token, denomination, paused flag)
- Root history buffer (recent Merkle roots for withdrawal verification)
- Groth16 verifying key

---

## 4. RTO/RPO Objectives

Recovery Time Objective (RTO) defines the maximum acceptable downtime. Recovery Point Objective (RPO) defines the maximum acceptable data loss window.

| Component | RTO | RPO | Justification |
|-----------|-----|-----|---------------|
| **Smart Contract (pause)** | 5 minutes | 0 (no data loss) | Admin can pause immediately via `pause()`. On-chain state is immutable. |
| **Smart Contract (redeploy)** | 4 hours | 0 | Redeployment requires contract compilation, key setup, and migration. |
| **Verifying Key Update** | 30 minutes | 0 | Admin calls `set_verifying_key()` with new VK. |
| **ZK Circuits** | 2 hours | N/A | Circuits are compiled client-side. New build and SDK update required. |
| **TypeScript SDK** | 1 hour | N/A | Publish patched npm package and invalidate CDN cache. |
| **Frontend (Next.js)** | 30 minutes | N/A | Redeploy from CI/CD or switch to backup hosting. |
| **Off-chain Merkle Snapshots** | 1 hour | 1 hour | Snapshots taken hourly; SDK can resync from on-chain data. |
| **User Note Backups** | N/A | N/A | User responsibility; SDK provides export/import functionality. |
| **DNS/CDN** | 15 minutes | N/A | Failover to backup DNS provider. |

---

## 5. Risk Assessment Matrix

| ID | Risk | Likelihood | Impact | Severity | Mitigation |
|----|------|-----------|--------|----------|------------|
| R-01 | Smart contract exploit (fund drain) | Low | Critical | P0 | Formal audit, pause mechanism, denomination limits |
| R-02 | Admin key compromise | Low | Critical | P0 | Multisig (planned), key rotation, hardware wallet |
| R-03 | ZK circuit soundness bug | Very Low | Critical | P0 | Formal verification, trusted setup ceremony audit |
| R-04 | Groth16 verifying key corruption | Very Low | High | P1 | On-chain VK validation, admin `set_verifying_key()` |
| R-05 | Merkle tree state corruption | Very Low | High | P1 | Incremental tree with on-chain root history buffer |
| R-06 | Stellar network outage | Low | High | P1 | Monitor SDF status, queue transactions, retry logic |
| R-07 | Nullifier double-spend bypass | Very Low | Critical | P0 | On-chain nullifier registry, ZK proof verification |
| R-08 | Frontend compromise (XSS/phishing) | Medium | Medium | P2 | CSP headers, subresource integrity, code signing |
| R-09 | SDK supply chain attack | Low | High | P1 | Lock dependencies, audit deps, reproducible builds |
| R-10 | BN254/Poseidon host function bug | Very Low | Critical | P0 | SDF-maintained, monitor protocol updates |
| R-11 | Data loss (off-chain snapshots) | Medium | Low | P3 | Hourly backups, Merkle resync from on-chain |
| R-12 | DNS hijacking | Low | Medium | P2 | DNSSEC, CAA records, monitoring |
| R-13 | DDoS on frontend/API | Medium | Low | P3 | CDN, rate limiting, static fallback |
| R-14 | Relayer failure | Medium | Low | P3 | Multiple relayers, direct withdrawal fallback |

---

## 6. Incident Classification

### Severity Levels

| Level | Name | Description | Response Time | Examples |
|-------|------|-------------|---------------|----------|
| **P0** | Critical | Active fund loss or privacy breach. System integrity compromised. | Immediate (< 15 min) | Contract exploit, admin key theft, ZK soundness bug, nullifier bypass |
| **P1** | High | System degraded, potential for fund loss if unresolved. No active exploit. | < 1 hour | VK corruption, Merkle tree anomaly, Stellar network issues, dependency vulnerability |
| **P2** | Medium | Partial service disruption. User experience impacted but funds safe. | < 4 hours | Frontend down, SDK bug, relayer failure, DNS issues |
| **P3** | Low | Minor issues. Cosmetic or non-critical functionality affected. | < 24 hours | UI rendering bug, non-critical API errors, documentation gaps |
| **P4** | Informational | No immediate impact. Potential future risk identified. | < 1 week | Dependency update advisories, performance degradation, config drift |

### Severity Decision Tree

```
Is there active fund loss or privacy breach?
  YES -> P0 (Critical)
  NO  -> Could funds be lost if issue persists for 1 hour?
           YES -> P1 (High)
           NO  -> Are users unable to deposit or withdraw?
                    YES -> P2 (Medium)
                    NO  -> Is user experience degraded?
                             YES -> P3 (Low)
                             NO  -> P4 (Informational)
```

---

## 7. Emergency Contacts and Escalation Matrix

### Escalation Levels

| Level | Role | Responsibility | Notification Method |
|-------|------|----------------|-------------------|
| **L1** | On-Call Engineer | Initial triage, monitoring alerts, execute runbooks | PagerDuty / Signal |
| **L2** | Senior Engineer | Incident command, technical analysis, authorize pause | Phone call + Signal |
| **L3** | Core Team Lead | Strategic decisions, contract redeployment approval | Phone call |
| **L4** | Project Lead / Admin Key Holder | Admin key operations, external communications | Phone call (direct) |

### Escalation Timeline

| Time Since Detection | Action |
|---------------------|--------|
| 0 min | L1 acknowledges alert, begins triage |
| 5 min | If P0/P1: escalate to L2, execute emergency pause |
| 15 min | L2 confirms severity, assembles response team |
| 30 min | If P0: escalate to L3/L4, draft public communication |
| 1 hour | L3 approves recovery strategy |
| 2 hours | First public status update (if P0/P1) |
| 4 hours | Post-mitigation assessment |
| 24 hours | Preliminary incident report |
| 72 hours | Full post-incident review |

### Contact Registry

> **Note:** Populate this table with actual team contact information. Store securely and restrict access.

| Role | Name | Primary Contact | Secondary Contact | Admin Key Access |
|------|------|-----------------|-------------------|-----------------|
| Project Lead | [TBD] | [Phone] | [Signal] | Yes |
| Smart Contract Lead | [TBD] | [Phone] | [Signal] | No |
| ZK/Crypto Lead | [TBD] | [Phone] | [Signal] | No |
| Frontend Lead | [TBD] | [Phone] | [Signal] | No |
| DevOps Lead | [TBD] | [Phone] | [Signal] | No |
| Security Advisor | [TBD] | [Phone] | [Signal] | No |

---

## 8. Recovery Procedures

### 8.1 Smart Contract Exploit

**Trigger:** Unauthorized fund movement detected, unexpected contract state changes, or external vulnerability report.

**Indicators:**
- Abnormal withdrawal volume or patterns
- Withdrawal to addresses not matching expected user behavior
- Contract balance deviating from expected total (deposits - withdrawals)
- External reports from security researchers

**Immediate Actions (first 15 minutes):**

1. **PAUSE THE POOL IMMEDIATELY**
   ```bash
   # Using Stellar CLI with admin credentials
   stellar contract invoke \
     --id $POOL_CONTRACT_ID \
     --source $ADMIN_SECRET \
     --network $NETWORK \
     -- pause \
     --admin $ADMIN_ADDRESS
   ```
   This calls `admin::pause()` which sets `pool_config.paused = true` and emits a `PoolPaused` event. All subsequent `deposit()` and `withdraw()` calls will return `Error::PoolPaused (20)`.

2. **Preserve evidence:**
   - Snapshot current contract state (all storage keys)
   - Record current Merkle root, leaf count, and nullifier set
   - Capture all recent transaction logs
   - Save attacker addresses and transaction hashes

3. **Notify L2/L3 immediately.**

**Analysis Phase (1-4 hours):**

4. Identify the exploit vector:
   - Review contract error types: `InvalidProof (42)`, `NullifierAlreadySpent (41)`, `UnknownRoot (40)`
   - Check if the Groth16 verification was bypassed
   - Verify Merkle tree integrity (root matches expected state)
   - Inspect nullifier registry for anomalies

5. Assess damage:
   - Calculate funds lost
   - Determine if privacy was compromised (nullifier-commitment links exposed)
   - Identify affected users (deposit indices)

**Recovery Phase (4-48 hours):**

6. If contract code is vulnerable:
   - Develop and audit the patch
   - Deploy a new contract instance with the fix
   - Migrate state: replicate Merkle tree, nullifier set, and configuration
   - Update the verifying key if circuit changes were needed
   - Update SDK and frontend to point to the new contract

7. If the verifying key was the issue:
   ```bash
   stellar contract invoke \
     --id $POOL_CONTRACT_ID \
     --source $ADMIN_SECRET \
     --network $NETWORK \
     -- set_verifying_key \
     --admin $ADMIN_ADDRESS \
     --new_vk $NEW_VK_HEX
   ```

8. **Unpause only after the fix is verified:**
   ```bash
   stellar contract invoke \
     --id $POOL_CONTRACT_ID \
     --source $ADMIN_SECRET \
     --network $NETWORK \
     -- unpause \
     --admin $ADMIN_ADDRESS
   ```

---

### 8.2 Admin Key Compromise

**Trigger:** Unauthorized admin operations detected (pause/unpause/VK update not initiated by team), or admin key material exposed.

**Indicators:**
- `PoolPaused` / `PoolUnpaused` / `VKUpdated` events not matching team actions
- Admin key found in public repositories, logs, or paste sites
- Unauthorized `set_verifying_key()` calls

**Immediate Actions:**

1. **PAUSE the pool** using a backup admin key (if multisig is implemented) or the compromised key before the attacker can act.

2. **Deploy a new contract instance** with a fresh admin address:
   - Generate a new admin keypair on an air-gapped device
   - Deploy the PrivacyPool contract with the new admin
   - Migrate all on-chain state (Merkle tree, nullifiers, VK, config)

3. **Rotate all related credentials:**
   - Stellar account keys associated with the admin
   - CI/CD secrets that reference the admin key
   - Any API keys or tokens tied to the admin address

4. **Investigate the breach:**
   - How was the key compromised? (Phishing, malware, insider, repo leak)
   - What actions did the attacker perform?
   - Were any verifying key updates made? If so, revert to known-good VK.

**Prevention:**
- Store admin key in a hardware wallet (Ledger)
- Implement multisig admin (Soroban multisig pattern)
- Never store admin secret in environment variables on shared systems
- Use separate admin keys for testnet and mainnet

---

### 8.3 ZK Proof System Failure

**Trigger:** Users unable to generate valid withdrawal proofs, or the on-chain verifier rejects all proofs.

**Indicators:**
- Spike in `InvalidProof (42)` errors
- SDK proof generation fails consistently
- Circuit compilation errors after toolchain update

**Diagnosis:**

1. **Client-side failure (SDK/Noir prover):**
   - Check Noir toolchain version (`nargo --version`)
   - Verify circuit compilation: `cd circuits/withdraw && nargo build`
   - Run circuit tests: `nargo test`
   - Inspect WASM prover output for errors

2. **On-chain verifier failure:**
   - Verify the stored verifying key matches the expected circuit
   - Test with a known-good proof (from test suite)
   - Check if Stellar Protocol 25 host functions (`bn254_pairing`, `poseidon2_hash`) are behaving as expected

**Recovery:**

3. **If the Noir toolchain broke compatibility:**
   - Pin the Noir version in CI: `noirup -v <known-good-version>`
   - Rebuild circuits with the pinned version
   - Regenerate the verifying key from the new build
   - Update on-chain VK via `set_verifying_key()`
   - Publish updated SDK with new WASM prover

4. **If the on-chain BN254/Poseidon host functions changed:**
   - This would be a Stellar protocol-level change
   - Contact SDF for guidance
   - If needed, adapt circuits and verifier to the new behavior
   - Pause pool until resolution

5. **If a soundness bug is found in the circuit:**
   - **P0: PAUSE IMMEDIATELY** (attacker could forge proofs)
   - Audit and fix the circuit
   - Perform a new trusted setup (if applicable)
   - Deploy new VK
   - All users must re-prove withdrawals against the new circuit

---

### 8.4 Merkle Tree Corruption

**Trigger:** Merkle root on-chain does not match the expected state computed from the ordered list of commitments.

**Indicators:**
- `UnknownRoot (40)` errors when users attempt withdrawals with recently synced roots
- Discrepancy between `deposit_count()` and the number of emitted deposit events
- SDK Merkle sync produces a different root than `get_root()`

**Diagnosis:**

1. Reconstruct the Merkle tree from deposit events:
   ```typescript
   // SDK pseudocode
   const events = await fetchAllDepositEvents(contractId);
   const tree = new IncrementalMerkleTree(depth=20);
   for (const event of events) {
     tree.insert(event.commitment);
   }
   assert(tree.root === onChainRoot);
   ```

2. If roots diverge, identify the insertion index where divergence began.

**Recovery:**

3. **If on-chain state is incorrect** (contract bug):
   - Pause the pool
   - Deploy a corrected contract
   - Replay all deposits to reconstruct the correct tree
   - Set the new contract as the canonical pool

4. **If SDK-side tree is incorrect:**
   - Resync from on-chain events (single source of truth)
   - Publish SDK patch
   - Invalidate cached Merkle snapshots

**Note:** The on-chain Merkle tree (depth 20) supports up to 1,048,576 leaves. The `TreeFull (21)` error is returned when this limit is reached. Plan for pool rotation or tree expansion before reaching capacity.

---

### 8.5 Stellar Network Issues

**Trigger:** Stellar network outage, consensus failure, or Protocol 25 regression.

**Indicators:**
- Transaction submissions fail with network errors
- Horizon API unresponsive
- SDF status page reports incident

**Immediate Actions:**

1. **Monitor SDF status:** https://status.stellar.org
2. **Queue user transactions** in the SDK (local buffer with retry logic)
3. **Display maintenance banner** on the frontend
4. **Do not pause the contract** (the network will resume and the contract state remains consistent)

**Recovery:**

5. When the network resumes:
   - Process queued transactions in order
   - Verify contract state consistency
   - Remove maintenance banner
   - Monitor for any state anomalies post-recovery

**Special Case: Protocol Upgrade Regression**

If a Stellar protocol upgrade introduces a regression in BN254 or Poseidon host functions:
- Pause the pool immediately
- Coordinate with SDF on the regression
- Do not allow withdrawals until host function behavior is confirmed correct
- May need to redeploy contracts targeting the new protocol version

---

### 8.6 Data Loss and Backup Restore

**Trigger:** Off-chain data (Merkle snapshots, user note backups, SDK cache) is lost or corrupted.

**Critical distinction:** On-chain data (contract state) is immutable and cannot be "lost" in the traditional sense. This section covers off-chain data.

**Merkle Tree Snapshots:**

1. Snapshots are convenience caches; the authoritative state is always on-chain.
2. To rebuild from scratch:
   ```bash
   # Fetch all deposit events from the contract
   stellar events list \
     --id $POOL_CONTRACT_ID \
     --topic "deposit" \
     --start-ledger 0 \
     --network $NETWORK \
     --output json > deposit_events.json
   ```
3. Replay events through the SDK Merkle tree builder.

**User Notes (nullifier + secret):**

1. **User notes are the user's responsibility.** If a user loses their note, they cannot withdraw their funds. This is by design (privacy requires that no third party can link deposits to withdrawals).
2. The SDK must prominently display backup warnings during the deposit flow.
3. Provide note export functionality: `sdk.exportNote(note) -> encrypted JSON`
4. Provide note import functionality: `sdk.importNote(encryptedJson, password) -> Note`

**Infrastructure Data:**

| Data | Backup Strategy | Restore Procedure |
|------|----------------|-------------------|
| Merkle snapshots | Hourly automated backup | Resync from on-chain events |
| Frontend build artifacts | CI/CD pipeline (git tag) | Redeploy from tagged commit |
| SDK npm package | npm registry + git tag | Republish from git tag |
| Deployment configs | Git repository (encrypted) | Restore from git + decrypt |
| Monitoring configs | Infrastructure-as-code | Re-apply from IaC repo |

---

### 8.7 Frontend/SDK Outage

**Trigger:** Frontend unreachable, SDK package unavailable, or CDN failure.

**Indicators:**
- HTTP 5xx from frontend
- npm install fails for SDK package
- CDN returns stale or no content

**Immediate Actions:**

1. **Frontend:**
   - Check hosting provider status
   - If hosting is down: switch DNS to backup hosting (static export)
   - If build is broken: rollback to last known good deployment
   - Deploy a static maintenance page if needed

2. **SDK:**
   - If npm registry issue: users can install directly from GitHub
     ```bash
     npm install github:ANAVHEOBA/PrivacyLayer#sdk-v1.0.0
     ```
   - If the issue is in the SDK code: publish a hotfix patch version

**Note:** Frontend and SDK outages do NOT affect on-chain contract functionality. Users with local copies of the SDK can still interact with the contract directly.

---

### 8.8 Dependency Supply Chain Attack

**Trigger:** A dependency in the SDK, frontend, or build toolchain is compromised.

**Indicators:**
- npm audit reports critical vulnerability in a dependency
- Unexpected behavior after `npm update`
- Community reports of compromised package

**Immediate Actions:**

1. **Pin all dependencies** to known-good versions in `package-lock.json`
2. **Revert `node_modules`** to last audited state
3. **Audit the compromised package** to determine if PrivacyLayer was affected
4. **If SDK was published with compromised dep:**
   - Unpublish the affected version: `npm unpublish @privacylayer/sdk@x.y.z`
   - Publish a clean version with incremented patch
   - Issue security advisory

**Prevention:**
- Use `npm audit` in CI/CD pipeline
- Enable Dependabot or Renovate for automated security updates
- Use `package-lock.json` and verify checksums
- Minimize dependency count, especially for cryptographic code paths

---

## 9. Failover Procedures

### Contract Failover

The Soroban contract is the single source of truth. Failover means deploying a new contract instance and migrating state.

**Contract Migration Procedure:**

1. Pause the old contract
2. Snapshot all on-chain state:
   - Merkle tree leaves (from deposit events)
   - Nullifier set (from withdrawal events)
   - Pool configuration
   - Verifying key
3. Deploy the new contract with `initialize()`
4. Replay all deposits to rebuild Merkle tree in the new contract
5. Mark all previously-spent nullifiers as spent in the new contract
6. Update SDK and frontend to reference the new contract ID
7. Unpause the new contract
8. Mark the old contract as deprecated (leave paused permanently)

### Frontend Failover

| Priority | Hosting | URL |
|----------|---------|-----|
| Primary | Vercel/Netlify (main deployment) | app.privacylayer.xyz |
| Secondary | Static export on IPFS | ipfs.io/ipns/privacylayer |
| Tertiary | GitHub Pages (read-only status) | privacylayer.github.io |

**DNS Failover:**
- Use Cloudflare with automatic failover rules
- TTL set to 60 seconds for rapid DNS propagation during incidents

### SDK Failover

| Priority | Source | Install Command |
|----------|--------|----------------|
| Primary | npm registry | `npm install @privacylayer/sdk` |
| Secondary | GitHub Packages | `npm install @privacylayer/sdk --registry=https://npm.pkg.github.com` |
| Tertiary | Direct GitHub | `npm install github:ANAVHEOBA/PrivacyLayer#sdk-v1.0.0` |

---

## 10. Backup and Restore Procedures

### Automated Backup Schedule

| Data | Frequency | Retention | Storage | Encryption |
|------|-----------|-----------|---------|------------|
| Merkle tree snapshot | Every 1 hour | 30 days | S3 (versioned) | AES-256-GCM |
| Contract event log | Every 1 hour | Indefinite | S3 + cold storage | AES-256-GCM |
| Frontend build artifacts | Every deploy | 90 days | CI/CD artifact store | At rest |
| SDK package | Every publish | Indefinite | npm + GitHub | Signed |
| Infrastructure configs | Every change (GitOps) | Indefinite | Git (encrypted) | GPG |
| Monitoring dashboards | Weekly | 1 year | Export JSON | At rest |
| DR plan document | Every update | Indefinite | Git | N/A (public) |

### Backup Verification

1. **Weekly:** Verify Merkle snapshot integrity by comparing against on-chain root
2. **Monthly:** Full restore drill — rebuild Merkle tree from event logs, compare root
3. **Quarterly:** Full DR test (see Section 13)

### Restore Procedures

**Merkle Snapshot Restore:**
```bash
# 1. Download latest verified snapshot
aws s3 cp s3://privacylayer-backups/merkle/latest.json ./merkle-snapshot.json

# 2. Verify integrity
sha256sum merkle-snapshot.json
# Compare against checksum in backup manifest

# 3. Load into SDK
# The SDK will validate the snapshot root against on-chain root
```

**Full Contract State Reconstruction:**
```bash
# 1. Fetch all events from Stellar Horizon
stellar events list \
  --id $POOL_CONTRACT_ID \
  --start-ledger 0 \
  --network mainnet \
  --output json > all_events.json

# 2. Run reconstruction script
npx ts-node scripts/disaster-recovery-test.ts --reconstruct --events all_events.json

# 3. Compare reconstructed state with on-chain state
# The script will report any discrepancies
```

---

## 11. Communication Templates

### Template A: P0 Incident — Initial Notification

```
SUBJECT: [URGENT] PrivacyLayer Security Incident — Pool Paused

STATUS: INVESTIGATING
TIME: [YYYY-MM-DD HH:MM UTC]

We have detected a security incident affecting the PrivacyLayer shielded pool.
As a precautionary measure, we have PAUSED the pool. No new deposits or
withdrawals are currently possible.

WHAT WE KNOW:
- [Brief factual description of the issue]
- The pool was paused at [time]
- [Number] transactions may be affected

WHAT WE ARE DOING:
- Our security team is actively investigating
- We are working with [external auditors / SDF / relevant parties]
- We will provide updates every [30 minutes / 1 hour]

USER ACTION REQUIRED:
- Do NOT interact with the pool contract directly
- Do NOT share your note (nullifier/secret) with anyone
- Await further instructions before attempting withdrawals

YOUR FUNDS:
- Deposits in the shielded pool remain in the contract
- We will provide full transparency on fund status

Next update: [TIME]

— PrivacyLayer Team
```

### Template B: P0 Incident — Resolution

```
SUBJECT: [RESOLVED] PrivacyLayer Security Incident — Pool Restored

STATUS: RESOLVED
TIME: [YYYY-MM-DD HH:MM UTC]

The security incident affecting PrivacyLayer has been resolved. The pool
has been UNPAUSED and normal operations have resumed.

SUMMARY:
- Issue: [Description of what happened]
- Impact: [Number of affected users / amount at risk]
- Duration: [Paused from X to Y]
- Resolution: [What was done to fix the issue]

FUND STATUS:
- All user funds are safe and accounted for
- [Or: X amount was affected; see recovery plan below]

WHAT CHANGED:
- [Contract update / VK rotation / SDK patch / etc.]
- Users should update their SDK to version [X.Y.Z]

LESSONS LEARNED:
- [Brief summary; full post-mortem to follow]

A detailed post-incident report will be published within 72 hours.

— PrivacyLayer Team
```

### Template C: P1/P2 Incident — Service Disruption

```
SUBJECT: PrivacyLayer Service Disruption — [Component]

STATUS: [INVESTIGATING / IDENTIFIED / MONITORING]
TIME: [YYYY-MM-DD HH:MM UTC]

We are experiencing issues with [component]. Users may notice:
- [Symptom 1]
- [Symptom 2]

IMPACT:
- [Description of what is and is not working]
- User funds are NOT at risk

NEXT STEPS:
- [What the team is doing]
- Estimated resolution: [time estimate]

Next update: [TIME]

— PrivacyLayer Team
```

### Template D: Scheduled Maintenance

```
SUBJECT: PrivacyLayer Scheduled Maintenance — [Date]

We will be performing scheduled maintenance on [date] from [start] to [end] UTC.

WHAT:
- [Description of maintenance activity]

IMPACT:
- [What will be unavailable during maintenance]
- User funds are NOT at risk

ACTION REQUIRED:
- Complete any pending withdrawals before [start time]
- The pool will be paused during maintenance and unpaused upon completion

— PrivacyLayer Team
```

---

## 12. Post-Incident Review Process

### Timeline

| Milestone | Deadline | Deliverable |
|-----------|----------|-------------|
| Incident resolved | T+0 | Resolution communication (Template B) |
| Preliminary report | T+24h | Timeline of events, initial root cause |
| Full post-mortem | T+72h | Detailed analysis, action items |
| Action items complete | T+30d | All remediation items closed |
| DR plan update | T+30d | Updated DRP reflecting lessons learned |

### Post-Mortem Template

```markdown
# Post-Incident Report: [Incident Title]

**Date:** [YYYY-MM-DD]
**Severity:** [P0/P1/P2]
**Duration:** [Start time] to [End time] ([X hours Y minutes])
**Author:** [Name]
**Reviewers:** [Names]

## Summary
[2-3 sentence summary of the incident]

## Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Event description] |

## Root Cause
[Detailed technical explanation of the root cause]

## Impact
- Users affected: [number]
- Funds at risk: [amount]
- Downtime: [duration]
- Privacy impact: [none / partial / full]

## Resolution
[What was done to resolve the incident]

## What Went Well
- [Item]

## What Could Be Improved
- [Item]

## Action Items
| ID | Action | Owner | Deadline | Status |
|----|--------|-------|----------|--------|
| 1 | [Action] | [Name] | [Date] | Open |

## Lessons Learned
[Key takeaways for the team]
```

### Blameless Culture

Post-incident reviews follow a **blameless** approach:
- Focus on systems and processes, not individuals
- Ask "how did the system allow this to happen?" not "who caused this?"
- Every incident is a learning opportunity
- Action items target systemic improvements

---

## 13. DR Testing Schedule

### Test Types

| Test Type | Frequency | Duration | Description |
|-----------|-----------|----------|-------------|
| **Tabletop Exercise** | Monthly | 1-2 hours | Walk through a scenario verbally; verify procedures and contacts |
| **Component Test** | Monthly | 2-4 hours | Test individual recovery procedures (e.g., pause/unpause, VK rotation) |
| **Backup Restore Test** | Monthly | 1-2 hours | Restore Merkle snapshot and verify integrity |
| **Full DR Simulation** | Quarterly | 4-8 hours | End-to-end simulation on testnet with all team members |
| **Chaos Engineering** | Quarterly | 2-4 hours | Inject failures in staging environment |
| **Red Team Exercise** | Semi-annually | 1-2 days | External security team attempts to exploit the system |

### Quarterly Full DR Test Procedure

1. **Preparation (1 week before):**
   - Select scenario from risk matrix
   - Notify all team members
   - Prepare testnet environment
   - Set success criteria

2. **Execution:**
   - Inject the simulated failure on testnet
   - Team follows DRP procedures without advance notice of specific scenario
   - Document all actions, decisions, and timings
   - Record deviations from documented procedures

3. **Evaluation:**
   - Compare actual response times against RTO targets
   - Identify gaps in procedures
   - Test communication channels
   - Verify backup restore procedures

4. **Report:**
   - Document findings
   - Update DRP with improvements
   - Schedule follow-up for unresolved issues

### Annual DR Test Calendar

| Quarter | Month | Test Type | Scenario |
|---------|-------|-----------|----------|
| Q1 | January | Full DR Simulation | Contract exploit (P0) |
| Q1 | February | Component Test | VK rotation + frontend failover |
| Q1 | March | Tabletop | Admin key compromise |
| Q2 | April | Full DR Simulation | Stellar network outage (P1) |
| Q2 | May | Component Test | Merkle tree reconstruction |
| Q2 | June | Red Team Exercise | External security assessment |
| Q3 | July | Full DR Simulation | ZK proof system failure (P0) |
| Q3 | August | Component Test | SDK supply chain attack response |
| Q3 | September | Tabletop | Multi-incident (P0 + P2 concurrent) |
| Q4 | October | Full DR Simulation | Full contract migration |
| Q4 | November | Component Test | DNS failover + CDN recovery |
| Q4 | December | Red Team Exercise | External security assessment |

---

## 14. Appendices

### Appendix A: Contract Error Code Reference

These are the error codes defined in `contracts/privacy_pool/src/types/errors.rs` that are relevant to DR:

| Code | Name | DR Relevance |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Prevents accidental re-initialization |
| 2 | `NotInitialized` | Contract not yet set up |
| 10 | `UnauthorizedAdmin` | Unauthorized admin action attempt |
| 20 | `PoolPaused` | Pool is in emergency pause state |
| 21 | `TreeFull` | Merkle tree capacity reached (1,048,576 leaves) |
| 30 | `WrongAmount` | Incorrect deposit denomination |
| 31 | `ZeroCommitment` | Invalid zero-value commitment |
| 40 | `UnknownRoot` | Merkle root not in history buffer |
| 41 | `NullifierAlreadySpent` | Double-spend prevention triggered |
| 42 | `InvalidProof` | ZK proof verification failed |
| 43 | `FeeExceedsAmount` | Invalid relayer fee |
| 50 | `NoVerifyingKey` | VK not set (contract misconfigured) |
| 51 | `MalformedVerifyingKey` | VK format error |
| 60-62 | `MalformedProof*` | Proof format errors |
| 70 | `PointNotOnCurve` | BN254 curve point validation failure |
| 71 | `PairingFailed` | BN254 pairing check failure |

### Appendix B: Critical Admin Operations Quick Reference

```bash
# Pause the pool (EMERGENCY)
stellar contract invoke --id $CONTRACT --source $ADMIN_SECRET \
  --network $NETWORK -- pause --admin $ADMIN_ADDR

# Unpause the pool (after resolution)
stellar contract invoke --id $CONTRACT --source $ADMIN_SECRET \
  --network $NETWORK -- unpause --admin $ADMIN_ADDR

# Rotate verifying key
stellar contract invoke --id $CONTRACT --source $ADMIN_SECRET \
  --network $NETWORK -- set_verifying_key --admin $ADMIN_ADDR --new_vk $VK_HEX

# Check pool status
stellar contract invoke --id $CONTRACT --network $NETWORK \
  -- get_config_view

# Check current Merkle root
stellar contract invoke --id $CONTRACT --network $NETWORK \
  -- get_root

# Check deposit count
stellar contract invoke --id $CONTRACT --network $NETWORK \
  -- deposit_count

# Check if nullifier is spent
stellar contract invoke --id $CONTRACT --network $NETWORK \
  -- is_spent --nullifier_hash $HASH
```

### Appendix C: Runbook Checklist — P0 Incident

- [ ] Alert acknowledged by on-call engineer
- [ ] Severity confirmed as P0
- [ ] Pool PAUSED via admin key
- [ ] L2/L3/L4 notified
- [ ] Evidence preserved (contract state, tx logs, attacker addresses)
- [ ] Initial communication sent (Template A)
- [ ] Response team assembled
- [ ] Root cause identified
- [ ] Fix developed and reviewed
- [ ] Fix tested on testnet
- [ ] Fix deployed (new contract / VK update / SDK patch)
- [ ] State migration completed (if new contract)
- [ ] Pool UNPAUSED
- [ ] Resolution communication sent (Template B)
- [ ] Monitoring confirms normal operations
- [ ] Post-incident review scheduled (within 72h)
- [ ] DRP updated with lessons learned

### Appendix D: External Dependencies and Status Pages

| Dependency | Status Page | Purpose |
|------------|------------|---------|
| Stellar Network | https://status.stellar.org | Blockchain layer |
| Horizon API | https://status.stellar.org | Transaction submission |
| Vercel/Netlify | https://www.vercelstatus.com | Frontend hosting |
| npm Registry | https://status.npmjs.org | SDK distribution |
| GitHub | https://www.githubstatus.com | Source code, CI/CD |
| Cloudflare | https://www.cloudflarestatus.com | DNS, CDN |

### Appendix E: Glossary

| Term | Definition |
|------|-----------|
| **BN254** | Barreto-Naehrig elliptic curve used for Groth16 proof verification |
| **Commitment** | `Poseidon(nullifier, secret)` — hides the deposit details |
| **Groth16** | Zero-knowledge proof system used for withdrawal verification |
| **Merkle Tree** | Binary hash tree (depth 20) storing all deposit commitments |
| **Noir** | ZK circuit programming language used by PrivacyLayer |
| **Note** | User's private data: nullifier + secret, needed to withdraw |
| **Nullifier** | Unique value revealed during withdrawal to prevent double-spend |
| **Poseidon** | ZK-friendly hash function available as Soroban host function |
| **RPO** | Recovery Point Objective — maximum acceptable data loss |
| **RTO** | Recovery Time Objective — maximum acceptable downtime |
| **Soroban** | Stellar's smart contract platform |
| **Verifying Key** | Public parameters for Groth16 proof verification |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-22 | PrivacyLayer Contributors | Initial disaster recovery plan |

---

*This document should be reviewed quarterly and updated after every incident or significant system change. All team members must be familiar with their roles and responsibilities outlined herein.*

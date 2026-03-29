# PrivacyLayer Threat Model

## Scope and Method

This document applies a STRIDE-style threat-modeling pass to the current
PrivacyLayer codebase and deployment concept. The goal is to identify concrete
attack paths against the shielded-pool system, map them to current controls,
and record the residual risks that still need review before any production
deployment.

PrivacyLayer is currently unaudited. This document is therefore not a statement
that the system is safe; it is a structured inventory of where the main risks
are and what reviewers should inspect first.

## System Overview

PrivacyLayer is a fixed-denomination privacy pool for Stellar Soroban. Users
deposit commitments derived from a secret and nullifier, and later withdraw by
presenting a zero-knowledge proof that they control a valid note in the Merkle
tree without revealing which deposit they own.

Primary code surfaces in the current repository:

- Contract entry points:
  [`contracts/privacy_pool/src/contract.rs`](../contracts/privacy_pool/src/contract.rs)
- Deposit logic:
  [`contracts/privacy_pool/src/core/deposit.rs`](../contracts/privacy_pool/src/core/deposit.rs)
- Withdrawal logic:
  [`contracts/privacy_pool/src/core/withdraw.rs`](../contracts/privacy_pool/src/core/withdraw.rs)
- Admin controls:
  [`contracts/privacy_pool/src/core/admin.rs`](../contracts/privacy_pool/src/core/admin.rs)
- Merkle tree logic:
  [`contracts/privacy_pool/src/crypto/merkle.rs`](../contracts/privacy_pool/src/crypto/merkle.rs)
- Verifier integration:
  [`contracts/privacy_pool/src/crypto/verifier.rs`](../contracts/privacy_pool/src/crypto/verifier.rs)
- Nullifier tracking:
  [`contracts/privacy_pool/src/storage/nullifier.rs`](../contracts/privacy_pool/src/storage/nullifier.rs)
- Contract configuration:
  [`contracts/privacy_pool/src/storage/config.rs`](../contracts/privacy_pool/src/storage/config.rs)
- Input validation:
  [`contracts/privacy_pool/src/utils/validation.rs`](../contracts/privacy_pool/src/utils/validation.rs)
- Commitment circuit:
  [`circuits/commitment/src/main.nr`](../circuits/commitment/src/main.nr)
- Withdrawal circuit:
  [`circuits/withdraw/src/main.nr`](../circuits/withdraw/src/main.nr)
- Shared circuit utilities:
  [`circuits/lib/src/lib.nr`](../circuits/lib/src/lib.nr)

## Security Goals

PrivacyLayer should preserve the following high-level goals:

1. Only valid deposits may enter the pool.
2. Only owners of valid notes may withdraw.
3. A nullifier may be spent at most once.
4. A valid withdrawal should not reveal which deposit was spent.
5. Admin functionality must not silently bypass or weaken user-fund safety.
6. Contract pause and incident controls must be usable under stress.
7. Off-chain tooling, proofs, and deployment procedures must not undermine the
   protocol assumptions.

## Trust Assumptions

The current design implicitly trusts:

- Stellar Soroban host functions for BN254 and Poseidon to behave correctly.
- Noir circuit compilation and proving artifacts to match the on-chain verifier
  inputs exactly.
- The deployed verifying key and parameter configuration to be correct and not
  maliciously replaced.
- Admin keys to act honestly and to be protected operationally.
- Off-chain users to store notes securely and not leak them before withdrawal.
- Relayers, indexers, or frontends not to introduce additional privacy leaks if
  they are later added around the core contracts.

## Threat Actors

- Opportunistic attackers trying to steal or double-spend pooled funds.
- Privacy adversaries correlating deposits and withdrawals.
- Malicious integrators or relayers altering user flows.
- Compromised administrators or signers.
- External researchers probing denial-of-service and verifier edge cases.
- Infrastructure operators making configuration mistakes during deployment,
  upgrades, or emergency handling.

## Assets

- Deposited user funds.
- Note secrets and nullifiers.
- Merkle roots and root history.
- Nullifier-spent state.
- Verifying key material and configuration.
- Pause/admin authority.
- User privacy set and unlinkability assumptions.
- Deployment and recovery procedures.

## STRIDE Summary

| Category | Primary Targets | Main Risk |
| --- | --- | --- |
| Spoofing | admin, user, proof origin | unauthorized privileged actions |
| Tampering | storage, roots, VK, nullifiers | invalid state or stolen withdrawals |
| Repudiation | admin actions, emergency steps | weak audit trail during incidents |
| Information disclosure | note metadata, withdrawal timing | privacy-set collapse |
| Denial of service | deposits, withdrawals, prover flow | unusable pool or blocked exits |
| Elevation of privilege | admin functions, config mutation | protocol takeover |

## Attack Vectors and Mitigations

### A1. Forged withdrawal proof

- Description: an attacker attempts to craft a proof that passes verification
  without owning a valid note.
- Relevant code:
  [`contracts/privacy_pool/src/crypto/verifier.rs`](../contracts/privacy_pool/src/crypto/verifier.rs),
  [`circuits/withdraw/src/main.nr`](../circuits/withdraw/src/main.nr)
- Current mitigation: proof verification is delegated to the BN254 verifier
  path and the withdrawal circuit.
- Residual risk: any mismatch between circuit semantics, public input ordering,
  or verifying-key installation can make this control fail catastrophically.

### A2. Verifying-key substitution

- Description: a malicious or mistaken admin installs a verifying key that
  validates proofs for a weaker or different circuit.
- Relevant code:
  [`contracts/privacy_pool/src/core/admin.rs`](../contracts/privacy_pool/src/core/admin.rs)
- Current mitigation: admin-only control path.
- Residual risk: this is effectively total protocol compromise if governance or
  key custody is weak.

### A3. Nullifier replay / double spend

- Description: the same note is withdrawn more than once by bypassing nullifier
  tracking.
- Relevant code:
  [`contracts/privacy_pool/src/storage/nullifier.rs`](../contracts/privacy_pool/src/storage/nullifier.rs),
  [`contracts/privacy_pool/src/core/withdraw.rs`](../contracts/privacy_pool/src/core/withdraw.rs)
- Current mitigation: explicit nullifier storage and spent checks.
- Residual risk: race conditions, inconsistent serialization, or incorrect
  ordering of "verify then mark spent" logic could re-open replay paths.

### A4. Merkle root spoofing

- Description: an attacker submits a proof against a root that was never part of
  the contract's canonical history.
- Relevant code:
  [`contracts/privacy_pool/src/crypto/merkle.rs`](../contracts/privacy_pool/src/crypto/merkle.rs)
- Current mitigation: known-root validation against stored history.
- Residual risk: root-history truncation, off-by-one errors, or stale-root
  handling bugs could make invalid roots appear acceptable.

### A5. Commitment collision assumptions

- Description: two distinct notes map to the same commitment, or the commitment
  scheme is used incorrectly.
- Relevant code:
  [`circuits/commitment/src/main.nr`](../circuits/commitment/src/main.nr)
- Current mitigation: Poseidon/Poseidon2-based commitment construction.
- Residual risk: the security rests on correct parameterization and field usage;
  misuse or serialization ambiguity could weaken collision resistance.

### A6. Nullifier prediction or weak entropy

- Description: note generation produces guessable nullifiers or secrets.
- Current mitigation: not fully visible in this repository yet because the SDK
  is planned rather than fully implemented.
- Residual risk: this remains a critical future risk until client-side note
  generation is audited and documented.

### A7. Withdrawal recipient tampering

- Description: a frontend or relayer swaps the intended withdrawal recipient.
- Relevant code:
  [`contracts/privacy_pool/src/core/withdraw.rs`](../contracts/privacy_pool/src/core/withdraw.rs)
- Current mitigation: recipient should be bound into proof/public inputs if the
  circuit and contract are wired correctly.
- Residual risk: if recipient binding is incomplete, a malicious relayer can
  redirect funds even when the proof itself is valid.

### A8. Deposit amount mismatch

- Description: a user or attacker deposits an unsupported amount while the
  contract records a valid commitment anyway.
- Relevant code:
  [`contracts/privacy_pool/src/core/deposit.rs`](../contracts/privacy_pool/src/core/deposit.rs),
  [`contracts/privacy_pool/src/utils/validation.rs`](../contracts/privacy_pool/src/utils/validation.rs)
- Current mitigation: validation helpers and fixed pool assumptions.
- Residual risk: any gap between denomination enforcement and business logic
  can break anonymity assumptions or accounting.

### A9. Front-running withdrawal relays

- Description: a relayer or observer copies a withdrawal transaction and tries
  to execute it first.
- Current mitigation: nullifiers should limit replay after first success.
- Residual risk: users can still suffer failed transactions, griefing, or fee
  loss if front-running protections are not explicit.

### A10. Transaction graph correlation

- Description: observers correlate deposits and withdrawals through timing,
  amount buckets, gas usage, or address reuse.
- Current mitigation: shielded withdrawal flow and fixed denominations.
- Residual risk: privacy is still not absolute; low-volume pools, deterministic
  user behavior, and operational leaks can collapse anonymity.

### A11. Timing analysis

- Description: immediate withdrawal after deposit reveals likely linkage.
- Current mitigation: none on-chain beyond user discipline.
- Residual risk: high. This is a protocol-usage limitation, not just an
  implementation detail.

### A12. Address clustering

- Description: the same wallet cluster is reused before and after the private
  hop, weakening unlinkability.
- Current mitigation: none at the contract layer.
- Residual risk: high. Requires user guidance and wallet hygiene.

### A13. Small anonymity set

- Description: few users per denomination make statistical deanonymization easy.
- Current mitigation: fixed-denomination pool design helps only when pool
  participation is broad enough.
- Residual risk: high during early launch or low-liquidity phases.

### A14. Admin key compromise

- Description: attacker steals admin credentials and pauses, reconfigures, or
  replaces verifier settings.
- Relevant code:
  [`contracts/privacy_pool/src/core/admin.rs`](../contracts/privacy_pool/src/core/admin.rs)
- Current mitigation: admin gating.
- Residual risk: critical. Multi-sig, hardware-backed keys, and explicit
  rotation procedures are required before mainnet use.

### A15. Pause misuse

- Description: pause authority is abused to lock funds or censor exits.
- Current mitigation: admin-only pause path.
- Residual risk: operationally significant. Emergency powers improve safety but
  increase governance trust assumptions.

### A16. Storage corruption or serialization mismatch

- Description: contract state is stored or decoded inconsistently across
  upgrades or refactors.
- Relevant code:
  [`contracts/privacy_pool/src/storage/config.rs`](../contracts/privacy_pool/src/storage/config.rs),
  [`contracts/privacy_pool/src/types/state.rs`](../contracts/privacy_pool/src/types/state.rs)
- Current mitigation: typed storage modules.
- Residual risk: medium. Needs migration testing and snapshot validation.

### A17. Reentrancy-style logic surprises

- Description: contract execution flow assumes simple call semantics, but
  external token transfer or host-call behavior creates unexpected state order.
- Current mitigation: Soroban execution model narrows some EVM-style risk.
- Residual risk: medium. Reviewers should still verify state transitions are
  finalized before any external effect.

### A18. Resource exhaustion via oversized proofs or repeated invalid calls

- Description: attacker floods expensive verification paths or storage updates.
- Current mitigation: host metering and transaction costs.
- Residual risk: denial-of-service remains possible if invalid verification is
  cheap to submit but expensive to process.

### A19. Root-history exhaustion

- Description: users depending on older roots lose withdrawability if history is
  too small or roots roll off unexpectedly.
- Relevant code:
  [`contracts/privacy_pool/src/crypto/merkle.rs`](../contracts/privacy_pool/src/crypto/merkle.rs)
- Current mitigation: explicit root-history logic.
- Residual risk: medium. Policy around history depth must be documented and
  tested under realistic deposit volumes.

### A20. Proof/public-input encoding mismatch

- Description: the off-chain prover and on-chain verifier disagree on field
  encoding, endian order, or public-input positions.
- Current mitigation: shared integration tests.
- Residual risk: critical until audited; these bugs are subtle and easy to miss
  in code review alone.

### A21. Unsafe upgrade or redeploy process

- Description: emergency redeploy, migration, or manual storage intervention
  breaks note usability or invalidates roots.
- Current mitigation: limited today; procedures are not yet fully documented.
- Residual risk: high. A production plan needs explicit migration and rollback
  playbooks.

### A22. Incomplete incident communications

- Description: users continue depositing or attempting withdrawals during an
  incident because comms lag behind pause actions.
- Current mitigation: pause can stop some actions.
- Residual risk: medium-high. Security response is partly an operational and
  communication problem.

### A23. Dependency-chain compromise

- Description: Noir, Rust crates, or build tooling are compromised upstream.
- Current mitigation: standard dependency pinning and review discipline.
- Residual risk: medium. Reproducible builds and supply-chain review are still
  needed.

### A24. Test coverage blind spots

- Description: contracts pass happy-path tests while edge cases in nullifiers,
  roots, or verifier setup remain untested.
- Relevant files:
  [`contracts/privacy_pool/src/test.rs`](../contracts/privacy_pool/src/test.rs),
  [`contracts/privacy_pool/src/integration_test.rs`](../contracts/privacy_pool/src/integration_test.rs)
- Current mitigation: existing unit and integration tests plus snapshots.
- Residual risk: medium. Coverage should expand around malformed proof inputs,
  admin abuse paths, and state-machine invariants.

## Known Limitations

- Privacy depends on pool usage patterns, not only cryptography.
- The project is unaudited and should not be treated as production-safe.
- Admin privileges introduce trust assumptions around pause and verifier setup.
- The SDK/frontend layers are not fully implemented here, so some privacy and
  note-management risks are not yet enforceable in code.
- Root-history policy and withdrawal UX under long delays need clearer user
  guidance.

## Incident Response

### Detection

- Monitor failed proof verifications, repeated nullifier-spend attempts, and
  unusual pause/unpause events.
- Watch for unexpected verifying-key changes or admin operations.
- Track failed withdrawal clusters that may indicate relay or recipient issues.

### Immediate Actions

1. Pause deposits and withdrawals if fund safety is uncertain.
2. Freeze any admin rotation or config changes not required for containment.
3. Snapshot current contract state, including config, root history, and spent
   nullifiers.
4. Preserve logs, transaction hashes, and any prover/verifier artifacts used in
   the failing flow.

### Containment

- If verifier configuration is suspected, halt all withdrawals until the
  configuration is independently validated.
- If admin-key compromise is suspected, rotate keys using an out-of-band,
  pre-approved emergency path.
- If a privacy leak is suspected but funds are safe, publish usage guidance
  immediately so users can avoid making the leak worse.

### Recovery

- Reproduce the failure with a minimal test or snapshot-backed environment.
- Patch the defect and add regression coverage before unpausing.
- Announce what happened, what was affected, and what users must do next.

### Communications

- Use GitHub advisories/issues plus the primary project communication channels.
- State clearly whether funds, privacy, or only availability were affected.
- Publish post-incident follow-up tasks and owners.

## Audit Recommendations

Priority areas for external review:

1. Withdrawal circuit and verifier/public-input binding.
2. Nullifier uniqueness and spent-state transitions.
3. Merkle root history correctness and upgrade safety.
4. Admin controls around verifier keys and pause authority.
5. End-to-end note generation, storage, and withdrawal recipient binding once
   the SDK/frontend are implemented.

Recommended testing additions:

- property-based tests for Merkle and nullifier invariants
- malformed-proof and malformed-public-input negative tests
- admin misuse and key-rotation scenario tests
- long-horizon root-history rollover tests
- adversarial privacy simulations for low-participation pools

Formal verification candidates:

- nullifier can only transition from unspent to spent once
- accepted withdrawals must reference a stored root
- admin-only functions cannot be reached by non-admin callers
- pause state blocks the intended state transitions consistently

## Residual-Risk Summary

The most important unresolved risks today are:

- verifier/circuit mismatch
- admin-key compromise and verifying-key substitution
- privacy-set collapse from low usage or poor operational hygiene
- incomplete production incident-response and upgrade procedures

These risks are manageable only with both code review and operational maturity.
The current codebase should therefore remain in a pre-production posture until
an external security review closes the highest-severity items above.

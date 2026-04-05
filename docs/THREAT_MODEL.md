# PrivacyLayer Threat Model

## Status

This document describes the security model, attack surface, current mitigations, and residual risks for the current PrivacyLayer implementation in this repository as of April 4, 2026.

Scope covered:

- Noir circuits under `circuits/`
- Soroban contract under `contracts/privacy_pool/`
- Contract events and storage model
- Operational assumptions around proving keys, deposits, and withdrawals

Out of scope for this version:

- A production relayer
- A completed TypeScript SDK
- A production frontend
- Third-party infrastructure hardening

## System Overview

PrivacyLayer is a fixed-denomination shielded pool for Stellar Soroban. Users deposit a fixed asset amount into a pool, receive an off-chain note, and later withdraw to a recipient using a zero-knowledge proof.

Current high-level flow:

1. A user authorizes a token transfer to the contract and submits a commitment.
2. The contract inserts the commitment into an incremental Merkle tree and emits a deposit event.
3. Off-chain software reconstructs the Merkle tree and generates a withdrawal proof.
4. The contract verifies a Groth16 proof, checks the root and nullifier, and transfers funds to the recipient.

Primary implementation references:

- `contracts/privacy_pool/src/core/deposit.rs`
- `contracts/privacy_pool/src/core/withdraw.rs`
- `contracts/privacy_pool/src/crypto/merkle.rs`
- `contracts/privacy_pool/src/crypto/verifier.rs`
- `circuits/commitment/src/main.nr`
- `circuits/withdraw/src/main.nr`

## Security Goals

The system should provide the following properties:

1. Soundness: invalid withdrawals must not succeed.
2. Double-spend resistance: the same note must not be withdrawn twice.
3. Membership integrity: only commitments present in the Merkle tree may be withdrawn.
4. Denomination integrity: withdrawals should respect the configured pool denomination.
5. Privacy: observers should not be able to link a withdrawal to a specific deposit from on-chain data alone.
6. Admin containment: admin powers should be explicit, auditable, and limited.
7. Recoverable operations: incidents should be detectable and the system should be pausable.

## Trust Assumptions

PrivacyLayer does not eliminate all trust. The current design assumes:

- The Groth16 proving and verifying keys correspond to the intended withdrawal circuit.
- The admin key is honest, uncompromised, and operationally secure.
- Soroban token semantics are correct for the configured asset contract.
- The Noir circuits and Soroban verifier agree on public input encoding and field interpretation.
- Users securely store notes and do not leak them before withdrawal.
- The underlying BN254 and Poseidon host functionality behaves correctly.

## Threat Actors

- External attacker with no special privileges.
- Malicious depositor or withdrawer.
- Malicious relayer.
- Compromised or malicious admin.
- Passive chain observer performing privacy analysis.
- Infrastructure attacker targeting RPC, frontend, or deployment pipeline.

## Assets To Protect

- Funds held by the pool contract.
- The unlinkability between deposit and withdrawal.
- Nullifier uniqueness and spend state.
- Correctness of the Merkle root history.
- Integrity of the verifying key.
- Off-chain notes, proofs, and Merkle witnesses.

## Attack Surface Summary

Main trust boundaries:

- User to contract authorization during deposit.
- Off-chain note handling and proof generation.
- Proof verification and public input decoding on-chain.
- Token transfer execution during deposit and withdrawal.
- Admin-only pause and verifying-key rotation paths.
- Event publication and public observability.

## Threat Catalogue

### Cryptographic And Circuit Threats

#### T1. Forged withdrawal proof

Risk:

- An attacker submits a fabricated proof and steals pool funds.

Current controls:

- On-chain Groth16 verification in `contracts/privacy_pool/src/crypto/verifier.rs`
- Verifying key stored in contract storage
- Circuit-level constraints in `circuits/withdraw/src/main.nr`

Residual risk:

- High impact if the verifying key is wrong, malformed, or replaced by a malicious admin.

#### T2. Commitment collision

Risk:

- Two different `(nullifier, secret)` pairs produce the same commitment, weakening note uniqueness.

Current controls:

- Commitment derived from a hash function in `circuits/lib/src/hash/mod.nr`
- Circuit tests cover basic consistency cases

Residual risk:

- Relies on Poseidon/Pedersen usage being correct and consistent across implementations.
- Should be audited with dedicated test vectors and cross-language checks.

#### T3. Nullifier collision or replay

Risk:

- A note can be spent more than once or replayed across pool states.

Current controls:

- Circuit computes `nullifier_hash = Hash(nullifier, root)` in `circuits/withdraw/src/main.nr`
- Contract checks `NullifierAlreadySpent` before transfer and marks spent after verification in `contracts/privacy_pool/src/core/withdraw.rs`

Residual risk:

- Sound design, but correctness depends on circuit and contract using the same encoding.

#### T4. Merkle proof forgery

Risk:

- An attacker withdraws using a leaf not actually present in the on-chain tree.

Current controls:

- Circuit verifies inclusion
- Contract also checks root membership through `require_known_root`

Residual risk:

- Correctness depends on off-chain tree construction matching `contracts/privacy_pool/src/crypto/merkle.rs`.

#### T5. Stale-root abuse

Risk:

- Old roots remain usable too long, expanding the window for stolen-note withdrawal.

Current controls:

- Root history is capped at 30 in `contracts/privacy_pool/src/crypto/merkle.rs`

Residual risk:

- A 30-root replay window is intentional but materially affects operational risk.
- Users who delay withdrawals too long may fail; attackers with stolen notes may still have time.

#### T6. Public input encoding mismatch

Risk:

- The Noir circuit and Soroban verifier interpret `recipient`, `relayer`, `amount`, or `fee` differently.

Current controls:

- Public inputs are passed into Groth16 verification through `compute_vk_x`

Residual risk:

- This is one of the highest-priority audit targets.
- The circuit treats these values as field elements.
- The contract decodes them as raw bytes or truncated integers.
- End-to-end encoding invariants are not specified in one place today.

#### T7. Trusted-setup failure

Risk:

- A compromised Groth16 setup invalidates proof soundness.

Current controls:

- None in-repo beyond storing the verifying key.

Residual risk:

- This remains an explicit trust assumption and should be documented for users and auditors.

### Contract And State Threats

#### T8. Unauthorized admin actions

Risk:

- A non-admin pauses the pool or rotates the verifying key.

Current controls:

- `require_auth()` on admin address
- `require_admin()` in `contracts/privacy_pool/src/utils/validation.rs`

Residual risk:

- Depends entirely on admin key security.

#### T9. Malicious verifying-key rotation

Risk:

- A compromised admin installs a malicious verifying key and enables invalid withdrawals.

Current controls:

- Only admin may call `set_verifying_key`
- Event emitted on rotation

Residual risk:

- Very high impact.
- There is no timelock, multisig, staged rollout, or out-of-band approval requirement.

#### T10. Deposit while paused or before initialization

Risk:

- Funds move into an invalid or emergency state.

Current controls:

- `config::load()` rejects uninitialized state
- `require_not_paused()` enforced in deposit and withdrawal

Residual risk:

- Low if pause checks remain mandatory in all entrypoints.

#### T11. Tree overflow

Risk:

- More than `2^20` deposits corrupt tree state.

Current controls:

- `Error::TreeFull` in `contracts/privacy_pool/src/crypto/merkle.rs`

Residual risk:

- Low for correctness, but capacity limits should be visible operationally.

#### T12. Root-history overwrite

Risk:

- Old roots are evicted sooner than users expect, breaking delayed withdrawals.

Current controls:

- Explicit circular buffer of size 30
- Tests cover eviction behavior

Residual risk:

- Operational, not cryptographic.
- The UX and docs must make the window clear.

#### T13. Fee decoding mismatch

Risk:

- The contract decodes `fee` differently from the circuit and could overpay the recipient or mishandle relayer logic.

Current controls:

- `decode_and_validate_fee()` rejects fees above denomination amount
- Circuit checks `fee <= amount`

Residual risk:

- High-priority review item.
- The contract decodes only the last 16 bytes of a 32-byte field element as signed `i128`.
- It does not explicitly reject negative values or enforce canonical encoding.
- This should be formally specified and tested with adversarial vectors.

#### T14. Amount consistency gap

Risk:

- The public input `amount` may not match the pool denomination or may be ignored by the contract.

Current controls:

- The pool uses a configured denomination from `PoolConfig`.
- The circuit includes `amount` as a public input.

Residual risk:

- High-priority review item.
- `contracts/privacy_pool/src/core/withdraw.rs` transfers `pool_config.denomination.amount()` and does not explicitly compare `pub_inputs.amount` against the configured denomination.
- This creates a specification gap even if it is not immediately exploitable.

#### T15. Address decoding failure or ambiguity

Risk:

- A malformed `recipient` or `relayer` value causes unexpected behavior, panic, denial of service, or misrouting.

Current controls:

- Optional relayer zero-check

Residual risk:

- High-priority review item.
- `contracts/privacy_pool/src/utils/address_decoder.rs` reconstructs an `Address` from raw 32-byte data.
- Stellar address encodings need a precise canonical mapping between circuit field elements and on-chain address parsing.

#### T16. Token transfer assumptions

Risk:

- The configured token contract has unexpected semantics, fails non-atomically, or behaves differently from expected SAC behavior.

Current controls:

- Soroban token client used for transfer calls in deposit and withdrawal

Residual risk:

- Medium.
- This is especially important once multiple assets are supported.

#### T17. Event and state desynchronization

Risk:

- Off-chain clients build a Merkle tree that diverges from contract state.

Current controls:

- Deposit event includes commitment, leaf index, and root
- Tests cover deterministic insert behavior

Residual risk:

- Medium.
- The planned SDK must be validated against the exact event ordering and tree logic.

### Privacy Threats

#### T18. Deposit origin leakage

Risk:

- Observers learn who deposited, even if they cannot later link the withdrawal.

Current controls:

- Deposit event omits the depositor address

Residual risk:

- High but expected.
- The token transfer from the depositor to the contract is still visible in the same transaction.
- PrivacyLayer currently hides deposit-to-withdraw linkage, not deposit existence.

#### T19. Timing analysis

Risk:

- Deposits and withdrawals close in time can be linked probabilistically.

Current controls:

- Fixed denominations reduce one class of leakage

Residual risk:

- High.
- User behavior and pool size dominate this risk.

#### T20. Small anonymity-set attacks

Risk:

- If few users share a denomination pool, linkability becomes much easier.

Current controls:

- Fixed denominations

Residual risk:

- High.
- This is an economic and adoption problem, not a contract-only problem.

#### T21. Recipient and relayer exposure

Risk:

- Withdrawals reveal the destination address and optional relayer on-chain.

Current controls:

- None beyond unavoidable design constraints

Residual risk:

- High and unavoidable for UTXO-style shield exit flows.

#### T22. Metadata leakage through frontend or RPC

Risk:

- IP addresses, wallet fingerprints, browser characteristics, and RPC patterns deanonymize users.

Current controls:

- No in-repo mitigation yet

Residual risk:

- High for real-world privacy.
- Must be documented clearly for users.

### Economic And Availability Threats

#### T23. Invalid-withdraw spam

Risk:

- Attackers submit many invalid proofs to consume resources or degrade service.

Current controls:

- Invalid proofs revert
- Pause mechanism available

Residual risk:

- Medium.
- Operational monitoring will matter once deployed.

#### T24. Proof verification cost spikes

Risk:

- Groth16 verification becomes expensive enough to make withdrawals impractical.

Current controls:

- None yet besides fixed design assumptions

Residual risk:

- Medium.
- A benchmark suite is still outstanding and should be completed before production rollout.

#### T25. Storage-growth pressure

Risk:

- Root history, filled subtrees, and nullifier tracking increase storage costs over time.

Current controls:

- Fixed root-history size

Residual risk:

- Medium.
- Nullifier storage is unbounded by design.

#### T26. Admin key loss

Risk:

- The admin cannot pause, rotate keys, or recover from operational incidents.

Current controls:

- None in-repo

Residual risk:

- Medium to high depending on deployment maturity.

### Operational And Process Threats

#### T27. Incomplete deployment procedure

Risk:

- A correct contract is deployed with the wrong token, denomination, or verifying key.

Current controls:

- Initialization is one-time only

Residual risk:

- High.
- A bad one-time initialization can permanently misconfigure a pool.

#### T28. Missing incident response runbook

Risk:

- The team detects an issue but cannot respond quickly and consistently.

Current controls:

- Pause functionality exists

Residual risk:

- Medium.
- There is no dedicated incident response document yet.

#### T29. Documentation drift

Risk:

- README, circuits, and contract behavior diverge, causing operator or auditor misunderstanding.

Current controls:

- Tests exist for many contract invariants

Residual risk:

- Medium.
- This document should be updated whenever public input encoding or admin flows change.

#### T30. False sense of privacy

Risk:

- Users assume stronger anonymity than the implementation actually provides.

Current controls:

- README states the project is unaudited

Residual risk:

- High.
- User-facing docs must explicitly say what is and is not hidden.

## Highest-Priority Audit Targets

The following areas should receive the most scrutiny before mainnet deployment:

1. Public input encoding across Noir and Soroban:
   `recipient`, `relayer`, `amount`, and `fee` need a single canonical specification plus end-to-end test vectors.
2. Fee and amount validation on withdrawal:
   on-chain checks should align exactly with circuit constraints and configured denomination rules.
3. Address serialization:
   the proof-facing representation of Stellar addresses should be formalized and tested for malformed inputs.
4. Verifying-key governance:
   admin-only rotation is too strong a trust assumption without multisig or delayed execution.
5. Benchmarking and denial-of-service analysis:
   withdrawal verification and storage growth need quantified cost envelopes.
6. Off-chain Merkle synchronization:
   SDK and circuit proofs must be validated against contract events and root history behavior.

## Recommended Security Improvements

Short-term:

- Add a canonical encoding spec for all public inputs.
- Add end-to-end tests for address, amount, fee, and relayer encoding.
- Add an explicit on-chain equality check between `pub_inputs.amount` and the configured denomination.
- Reject negative or non-canonical fee encodings explicitly.
- Document the trusted-setup assumption and admin key power in user docs.

Medium-term:

- Introduce multisig or timelocked verifying-key rotation.
- Add benchmark and cost-regression tooling.
- Add fuzz/property tests around public input decoding and withdrawal execution.
- Generate cross-language test vectors from circuits and verify them on-chain.

Long-term:

- Establish a formal spec for the withdraw statement and its byte encodings.
- Run an external security audit focused on circuit/contract boundary correctness.
- Consider stronger operational privacy guidance for production users.

## Incident Response Guidance

If a serious issue is detected:

1. Pause the pool immediately using the admin key.
2. Preserve all relevant transaction hashes, events, and proof inputs.
3. Determine whether the issue is circuit-only, contract-only, or an encoding mismatch across both.
4. Notify users that the pool is paused and instruct them not to deposit.
5. Review verifying-key integrity, deployment parameters, and recent admin actions.
6. Publish a post-incident report before resuming operations.

## Open Questions

These questions should be resolved before claiming production readiness:

- What is the exact canonical encoding of a Stellar `Address` inside Noir public inputs?
- Should `amount` remain a public input if the contract always enforces a fixed denomination?
- How is the Groth16 trusted setup generated, stored, and rotated?
- What operational window is acceptable for root-history retention?
- What minimum anonymity set should be recommended to users before withdrawal?

## References

- `contracts/privacy_pool/src/core/deposit.rs`
- `contracts/privacy_pool/src/core/withdraw.rs`
- `contracts/privacy_pool/src/core/admin.rs`
- `contracts/privacy_pool/src/crypto/merkle.rs`
- `contracts/privacy_pool/src/crypto/verifier.rs`
- `contracts/privacy_pool/src/utils/address_decoder.rs`
- `contracts/privacy_pool/src/utils/validation.rs`
- `contracts/privacy_pool/src/types/state.rs`
- `contracts/privacy_pool/src/types/events.rs`
- `circuits/commitment/src/main.nr`
- `circuits/withdraw/src/main.nr`

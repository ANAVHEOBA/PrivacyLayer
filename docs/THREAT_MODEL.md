# 🔒 PrivacyLayer - Threat Model

This document outlines the security assumptions, potential threat actors, and attack vectors for PrivacyLayer. It uses the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege) to identify risks in the zero-knowledge shielded pool.

---

## 1. System Overview

### Trust Assumptions
1.  **Stellar Network Liveness**: The underlying Stellar blockchain continues to produce blocks and process transactions.
2.  **Host Function Correctness**: The BN254 pairing and Poseidon hash host functions provided by Stellar Protocol 25 are implemented correctly and securely.
3.  **Client Environment**: The user's device (browser/SDK) is not compromised when generating the `nullifier` and `secret`.
4.  **Cryptographic Primitives**: Standard security assumptions for Groth16, BN254, and Poseidon hash functions hold.

### Security Goals
*   **Integrity**: No funds can be withdrawn without a valid proof of knowledge for a previously committed note.
*   **Double-Spend Prevention**: A single note cannot be withdrawn more than once.
*   **Privacy**: No observer should be able to link a deposit transaction to a withdrawal transaction.
*   **Availability**: Legitimate note holders should always be able to withdraw their funds.

### Threat Actors
*   **Malicious Relayers**: May attempt to front-run users or censor transactions.
*   **Adversarial Observers**: Attempting to de-anonymize users via off-chain data and timing analysis.
*   **Compromised Admin**: Using administrative privileges to freeze funds or manipulate contract state.
*   **Miner/Validator Collusion**: Attempting to reorder transactions for profit (MEV).

---

## 2. Attack Vectors

### Cryptographic Attacks

1.  **V-CRY-01: Proof Forgery (False Positives)**: An attacker generates a valid ZK proof for a commitment they do not own.
    *   *Mitigation*: Use of standard Groth16 verification with high security parameters (BN254).
2.  **V-CRY-02: Hash Collision**: Finding a different (nullifier, secret) pair that produces the same commitment.
    *   *Mitigation*: Use of Poseidon/Pedersen hashes with 254-bit security. Tested in `TC-C-09`.
3.  **V-CRY-03: Nullifier Prediction**: If the random number generator for nullifiers is weak, an observer could predict the nullifier hash and identify withdrawals.
    *   *Mitigation*: SDK must use cryptographically secure random number generators (CSPRNG).
4.  **V-CRY-04: Merkle Proof Manipulation**: An attacker provides a fake auth path to link a leaf to the root.
    *   *Mitigation*: Circuit strictly enforces bit-index path verification (`lib/src/merkle/mod.nr`).
5.  **V-CRY-05: Trusted Setup Compromise**: If the system requires a ceremony, compromised toxic waste could allow forging any proof.
    *   *Mitigation*: Use universal setups (Barretenberg) or future transparent SNARKs.

### Smart Contract Attacks

6. **V-CON-01: Reentrancy during Withdrawal**: Re-entering the `withdraw` function before the nullifier is marked as spent in storage.
    *   *Mitigation*: Soroban's single-threaded nature and "Checks-Effects-Interactions" pattern. Nullifier is checked in `contracts/privacy_pool/src/storage/nullifier.rs` and marked as spent *before* the transfer.
7. **V-CON-02: Front-running (Proof Stealing)**: A relayer sees a `withdraw` transaction and submits it with their own address as the `recipient`.
    *   *Mitigation*: The `recipient` address is a public input to the ZK circuit, binding the proof to a specific destination (Enforced in `circuits/withdraw/src/main.nr`).
8. **V-CON-03: Storage Corruption**: Manipulating the incremental Merkle tree state to "insert" a leaf without a deposit.
    *   *Mitigation*: Merkle tree updates are only performed within the authorized `deposit` host flow (`contracts/privacy_pool/src/core/deposit.rs`).
9. **V-CON-04: Admin Key Compromise**: An attacker gains access to the contract admin key.
    *   *Mitigation*: Admin powers are restricted in `contracts/privacy_pool/src/core/admin.rs`. Use of Multi-sig addresses and time-locks for critical admin functions is recommended.
10. **V-CON-05: Griefing: Tree Saturation**: Filling the Merkle tree (2^20 slots) with dust deposits to prevent further use.
    *   *Mitigation*: Minimum deposit denominations discourage spam. Fixed denominations are implemented in `contracts/privacy_pool/src/core/deposit.rs`.
11. **V-CON-06: Oracle/Price Manipulation**: If the pool supports multiple assets with variable fees based on price.
    *   *Mitigation*: PrivacyLayer uses fixed denominations for each asset to avoid side-channel leaks.

### Privacy Attacks (Anonymity Leaks)

12. **V-PRV-01: Timing Analysis**: A withdrawal occurring 10 seconds after a deposit likely originates from that deposit.
    *   *Mitigation*: SDK advises users to wait for more deposits. Anonymity set tracking in `contracts/privacy_pool/src/core/view.rs`.
13. **V-PRV-02: Amount Correlation**: Depositing exactly 123.456 XLM and withdrawing exactly 123.456 XLM.
    *   *Mitigation*: The pool enforces fixed denominations.
14. **V-PRV-03: Address Clustering**: Withdrawing to an address that was previously funded by the depositor's main wallet.
    *   *Mitigation*: User education and SDK-enforced best practices.
15. **V-PRV-04: Gas/Fee Side-Channels**: Correlating transactions based on specific gas fees paid to relayers.
    *   *Mitigation*: Standardized fee structures for all withdrawals (`contracts/privacy_pool/src/core/withdraw.rs`).
16. **V-PRV-05: ISP/Metadata Analysis**: Linking the IP addresses of the deposit and withdrawal transactions.
    *   *Mitigation*: Recommended use of Tor/VPN for dApp interactions.

### Economic & Network Attacks

17. **V-ECO-01: Relayer Denial of Service**: All relayers go offline, preventing users without XLM for gas from withdrawing.
    *   *Mitigation*: Decentralized relayer network and direct withdrawal support.
18. **V-ECO-02: Resource Exhaustion**: Submitting proofs that pass verification but trigger high CPU usage on Soroban nodes.
    *   *Mitigation*: Soroban gas limits and host function pricing (`contracts/privacy_pool/src/crypto/verifier.rs`).
19. **V-ECO-03: Protocol Upgrade Incompatibility**: A Stellar network upgrade changes the behavior of host functions.
    *   *Mitigation*: Rigorous testing on Testnet before Protocol upgrades.
20. **V-ECO-04: Fee Exploitation**: Relayers charging more than the actual gas cost for sensitive transactions.
    *   *Mitigation*: Competitive relayer market.

---

## 3. Mitigations & Residual Risks

### Current Mitigations
*   **Circuit Level**: Strict input validation (`validate_fee`, `validate_nullifier_hash`) and comprehensive edge-case testing (`TC-W-01` through `TC-W-21`).
*   **Contract Level**: Nullifiers are tracked in Soroban `Persistent` storage to prevent double-spending across Ledger entries (`contracts/privacy_pool/src/storage/nullifier.rs`).
*   **Design Level**: Fixed denominations and root-binding for nullifiers.

### Residual Risks
*   **User Error**: Users may accidentally link their identities via off-chain behavior.
*   **Zero-day in Host Functions**: Vulnerabilities in its native implementation of BN254/Poseidon.
*   **Liveness of the Merkle Tree**: If the Soroban storage for the tree becomes extremely large/expensive.

---

## 4. Known Limitations

1.  **Privacy Set Size**: Privacy depends on the number of deposits between a user's deposit and their withdrawal. Low volume reduces anonymity.
2.  **Fixed Denominations**: Users cannot withdraw arbitrary amounts; they must withdraw in the specific increments supported by the pool.
3.  **Account Abstraction**: Users need a way to pay for gas on a new address (mitigated by relayers).

---

## 5. Audit Recommendations

### Critical Areas for Review
*   **Merkle Tree Incremental Updates**: Ensure the `contracts/privacy_pool/src/crypto/merkle.rs` logic correctly handles edge cases without skipping levels.
*   **Groth16 Verifier**: Verify the mapping of Noir proof outputs to Stellar host function inputs in `contracts/privacy_pool/src/crypto/verifier.rs`.
*   **Nullifier Uniqueness**: Confirm that no two note/root combinations can produce the same nullifier hash.

### Testing Requirements
*   **Fuzz Testing**: Range check inputs and Merkle paths.
*   **Formal Verification**: Target the Merkle tree and commitment integrity.

---

## 6. Incident Response

### Emergency Procedures
1.  **Contract Pause**: The Admin can pause `deposit`/`withdraw` functions if a vulnerability is detected (See `contracts/privacy_pool/src/core/admin.rs`).
2.  **Gradual Withdrawal**: If a Merkle bug is found, a secondary proof system might be deployed to allow manual fund recovery.
ry.

### Communication Plan
*   **Social Media**: Immediate broadcast via X/Discord.
*   **SDK Warning**: Automated banners in the dApp interface if the contract is paused.

---
*Created by PrivacyLayer Security Team. Version 1.0.0.*

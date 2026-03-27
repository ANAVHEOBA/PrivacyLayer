# PrivacyLayer Comprehensive Threat Model

## 1. Overview
This document outlines the threat model for the PrivacyLayer Soroban contract. It identifies key assets, threat actors, and potential attack vectors, specifically focusing on the ZK-shielded pool implementation on Stellar.

## 2. System Assets
- **User Funds**: Denominated XLM/USDC held in the contract vault.
- **Nullifier Set**: Data structure preventing double-spends.
- **Merkle Tree State**: Integrity of the shielded pool notes.
- **Verifying Key (VK)**: The cryptographic anchor for proof validation.

## 3. Threat Actors
- **Malicious Depositors**: Users attempting to crash the contract or bloat the tree.
- **Malicious Withdrawers**: Users attempting double-spends or unauthorized withdrawals.
- **Compromised Admin**: Attackers gaining control of the admin address to pause the pool or update the VK to a malicious one.
- **Malicious Relayers**: Actors attempting to steal user fees or censor transactions.

## 4. Attack Vectors & Mitigations

### 4.1. Double-Spend via Nullifier Collision
- **Threat**: An attacker attempts to withdraw the same note twice.
- **Mitigation**: The contract uses a persistent `Nullifier` storage key. Every withdrawal checks `is_spent` before execution.
- **Risk Level**: Low (Mitigated).

### 4.2. Merkle Tree Root History Exhaustion
- **Threat**: A fast-acting attacker performs `ROOT_HISTORY_SIZE + 1` deposits before a valid withdraw transaction is included in a ledger, making the user's proof invalid.
- **Mitigation**: PrivacyLayer uses a circular buffer of 30 roots.
- **Risk Level**: Medium.

### 4.3. Contract Denial of Service (DoS) via Panic
- **Threat**: Supplying malformed public inputs (e.g., non-Stellar addresses encoded as field elements) that cause the contract to panic during `Address::from_string_bytes`.
- **Mitigation**: Implement robust address validation and error handling in the `address_decoder`.
- **Risk Level**: High (Requires fix).

### 4.4. Verifying Key Hijacking
- **Threat**: An attacker gains admin access and replaces the VK with one that accepts any proof.
- **Mitigation**: Implementation of Multi-Sig or Time-Lock for admin operations is recommended for mainnet.
- **Risk Level**: High.

## 5. Security Recommendations
1. **Address Validation**: Ensure all addresses decoded from ZK-proofs are validated before usage.
2. **Multi-Sig Admin**: Migrate from a single admin address to a multi-signature threshold.
3. **Emergency Pause**: Ensure the pause mechanism is tested and accessible to the security team.

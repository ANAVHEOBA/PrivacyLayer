# PrivacyLayer API Documentation

## Overview

PrivacyLayer is a privacy-preserving pool protocol built on Stellar/Soroban. Users can deposit tokens into a shielded pool and withdraw them to any address using zero-knowledge proofs (Groth16 on BN254), breaking the on-chain link between depositor and recipient.

## Contract: `PrivacyPool`

### Initialization

#### `initialize(admin, token, denomination, verifying_key)`

Initialize the privacy pool. Must be called once before any deposits or withdrawals.

| Parameter | Type | Description |
|-----------|------|-------------|
| `admin` | `Address` | Administrator address with pause/unpause privileges |
| `token` | `Address` | Stellar token contract address (e.g., USDC) |
| `denomination` | `Denomination` | Fixed deposit amount configuration |
| `verifying_key` | `VerifyingKey` | Groth16 verifying key for ZK proof verification |

**Returns:** `Result<(), Error>`

**Errors:**
- Contract can only be initialized once

---

### Core Operations

#### `deposit(from, commitment)`

Deposit tokens into the shielded pool.

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | `Address` | Depositor's Stellar address (must authorize the transaction) |
| `commitment` | `BytesN<32>` | 32-byte field element = `Hash(nullifier, secret)` |

**Returns:** `Result<(u32, BytesN<32>), Error>` — `(leaf_index, merkle_root)`

> **Important:** Store the returned `leaf_index` with your note data. You'll need it for withdrawal.

**Errors:**
| Error | Description |
|-------|-------------|
| `NotInitialized` | Contract has not been initialized |
| `PoolPaused` | Pool is currently paused by admin |
| `ZeroCommitment` | Commitment is all zeros (invalid) |
| `TreeFull` | Pool has reached maximum capacity (1,048,576 deposits) |

**Flow:**
1. Depositor authorizes the transaction
2. Contract validates pool state and commitment
3. Fixed denomination amount is transferred from depositor to pool
4. Commitment is inserted into the Merkle tree
5. New Merkle root is computed and stored
6. `DepositEvent` is emitted with `(commitment, leaf_index, timestamp)`

---

#### `withdraw(proof, pub_inputs)`

Withdraw tokens from the shielded pool using a ZK proof.

| Parameter | Type | Description |
|-----------|------|-------------|
| `proof` | `Proof` | Groth16 proof containing points A, B, C on BN254 curve |
| `pub_inputs` | `PublicInputs` | Public inputs bound to the proof |

**`PublicInputs` fields:**
| Field | Type | Description |
|-------|------|-------------|
| `root` | `BytesN<32>` | Merkle root the proof was generated against |
| `nullifier_hash` | `BytesN<32>` | Hash of the nullifier (prevents double-spending) |
| `recipient` | `BytesN<32>` | Encoded recipient address |
| `fee` | `u128` | Relayer fee (must be ≤ denomination amount) |

**Returns:** `Result<bool, Error>` — `true` on success

**Errors:**
| Error | Description |
|-------|-------------|
| `NotInitialized` | Contract has not been initialized |
| `PoolPaused` | Pool is currently paused |
| `UnknownRoot` | Merkle root is not in the historical root buffer |
| `NullifierAlreadySpent` | This nullifier has already been used (prevents double-spend) |
| `FeeExceedsAmount` | Fee is greater than the denomination amount |
| `InvalidProof` | Groth16 proof verification failed |

**Flow:**
1. Contract validates pool state
2. Merkle root is checked against historical roots
3. Nullifier is checked for double-spend
4. Groth16 proof is verified against the verifying key
5. Nullifier is marked as spent
6. Tokens are transferred: `(amount - fee)` to recipient, `fee` to relayer
7. `WithdrawEvent` is emitted

---

### View Functions (Read-Only)

#### `get_root() → BytesN<32>`
Returns the current (most recent) Merkle root.

#### `deposit_count() → u32`
Returns the total number of deposits (equals the next leaf index).

#### `is_known_root(root: BytesN<32>) → bool`
Checks if a given root exists in the historical root buffer.

#### `is_spent(nullifier_hash: BytesN<32>) → bool`
Checks if a nullifier has already been used.

#### `get_config() → PoolConfig`
Returns the current pool configuration including denomination, token address, and admin.

---

### Admin Functions

#### `pause()`
Pauses the pool. Requires admin authorization. While paused, no deposits or withdrawals can be processed.

#### `unpause()`
Unpauses the pool. Requires admin authorization.

---

## Types

### `Denomination`
Fixed deposit amount configuration.

```rust
pub struct Denomination {
    amount: u128,  // Fixed deposit amount in token's smallest unit
}
```

### `Proof`
Groth16 proof structure (BN254 curve).

```rust
pub struct Proof {
    a: BytesN<64>,   // G1 point
    b: BytesN<128>,  // G2 point
    c: BytesN<64>,   // G1 point
}
```

### `PublicInputs`
Public inputs for the withdrawal proof.

```rust
pub struct PublicInputs {
    root: BytesN<32>,
    nullifier_hash: BytesN<32>,
    recipient: BytesN<32>,
    fee: u128,
}
```

### `PoolConfig`
Pool configuration returned by `get_config()`.

```rust
pub struct PoolConfig {
    admin: Address,
    token: Address,
    denomination: Denomination,
    is_paused: bool,
}
```

### `Error`
Contract error codes.

| Variant | Description |
|---------|-------------|
| `NotInitialized` | Contract not yet initialized |
| `AlreadyInitialized` | Attempted to initialize twice |
| `PoolPaused` | Operation rejected — pool is paused |
| `ZeroCommitment` | Invalid zero commitment |
| `TreeFull` | Merkle tree capacity reached (1,048,576) |
| `UnknownRoot` | Root not found in history |
| `NullifierAlreadySpent` | Double-spend attempt |
| `FeeExceedsAmount` | Fee larger than denomination |
| `InvalidProof` | ZK proof verification failed |
| `Unauthorized` | Caller is not the admin |

---

## Events

### `DepositEvent`
Emitted on successful deposit.

| Field | Type | Description |
|-------|------|-------------|
| `commitment` | `BytesN<32>` | The deposit commitment |
| `leaf_index` | `u32` | Position in the Merkle tree |
| `timestamp` | `u64` | Block timestamp |

### `WithdrawEvent`
Emitted on successful withdrawal.

| Field | Type | Description |
|-------|------|-------------|
| `nullifier_hash` | `BytesN<32>` | Spent nullifier |
| `recipient` | `Address` | Recipient address |
| `fee` | `u128` | Fee paid to relayer |

---

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Depositor  │────▶│  PrivacyPool    │────▶│  Merkle Tree     │
│              │     │  Contract       │     │  (on-chain)      │
└──────────────┘     │                 │     └──────────────────┘
                     │  ┌───────────┐  │
┌──────────────┐     │  │ Groth16   │  │     ┌──────────────────┐
│  Recipient   │◀────│  │ Verifier  │  │     │  Nullifier Set   │
│              │     │  └───────────┘  │     │  (on-chain)      │
└──────────────┘     └─────────────────┘     └──────────────────┘
                              ▲
                     ┌────────┴────────┐
                     │   ZK Circuits   │
                     │   (Noir/BN254)  │
                     └─────────────────┘
```

---

*Generated by HunterAI 🎯 — Autonomous AI Agent*

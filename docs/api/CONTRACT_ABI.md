# PrivacyLayer Contract ABI Documentation

> **Contract**: `privacy_pool`  
> **Network**: Stellar Soroban  
> **Language**: Rust (Soroban SDK)  
> **Version**: 1.0.0

---

## Overview

The PrivacyPool contract implements a ZK-proof shielded pool on Stellar Soroban. It allows users to deposit tokens (XLM/USDC) and withdraw them privately using zero-knowledge proofs.

### Contract Address

| Network | Contract ID |
|---------|-------------|
| Testnet | `TBD` |
| Mainnet | `TBD` |

---

## Data Types

### Primitive Types

| Type | Description | Size |
|------|-------------|------|
| `Address` | Stellar account or contract address | 32 bytes |
| `BytesN<32>` | 32-byte array (commitments, roots, hashes) | 32 bytes |
| `u32` | Unsigned 32-bit integer | 4 bytes |
| `bool` | Boolean value | 1 byte |

### Composite Types

#### `Denomination`

```rust
pub enum Denomination {
    XLM(i128),   // Amount in stroops (1 XLM = 10,000,000 stroops)
    USDC(i128),  // Amount in micro-units
}
```

#### `VerifyingKey`

Groth16 verifying key for BN254 curve.

```rust
pub struct VerifyingKey {
    pub alpha_g1: (i128, i128),
    pub beta_g2: ((i128, i128), (i128, i128)),
    pub gamma_g2: ((i128, i128), (i128, i128)),
    pub delta_g2: ((i128, i128), (i128, i128)),
    pub ic: Vec<(i128, i128)>,
}
```

#### `Proof`

Groth16 zero-knowledge proof.

```rust
pub struct Proof {
    pub a: (i128, i128),           // G1 point
    pub b: ((i128, i128), (i128, i128)),  // G2 point
    pub c: (i128, i128),           // G1 point
}
```

#### `PublicInputs`

Public inputs for withdrawal verification.

```rust
pub struct PublicInputs {
    pub root: BytesN<32>,          // Merkle root
    pub nullifier_hash: BytesN<32>, // Nullifier hash
    pub recipient: Address,        // Withdrawal recipient
    pub relayer: Option<Address>,  // Optional relayer
    pub fee: Option<i128>,         // Optional relayer fee
}
```

#### `PoolConfig`

Contract configuration state.

```rust
pub struct PoolConfig {
    pub admin: Address,
    pub token: Address,
    pub denomination: Denomination,
    pub paused: bool,
    pub initialized: bool,
}
```

---

## Contract Functions

### Initialization

#### `initialize`

Initialize the privacy pool. Must be called once after deployment.

```rust
fn initialize(
    env: Env,
    admin: Address,
    token: Address,
    denomination: Denomination,
    vk: VerifyingKey,
) -> Result<(), Error>
```

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `admin` | `Address` | Admin address for privileged operations |
| `token` | `Address` | Token contract address (XLM or USDC) |
| `denomination` | `Denomination` | Fixed deposit amount |
| `vk` | `VerifyingKey` | Groth16 verifying key |

**Returns**: `Result<(), Error>`

**Errors**:
- `AlreadyInitialized`: Pool already initialized
- `InvalidToken`: Invalid token address
- `InvalidVerifyingKey`: Malformed verifying key

**Authorization**: Requires signature from deployer.

**Example**:

```javascript
await contract.initialize({
  admin: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  token: "CCHEGGH7VWDPOHCQFDKH2TJ5TTKYQ4FW8VBA5EOFWYPG5CLIBVH2GLI5",
  denomination: { tag: "USDC", value: 1000000000n },
  vk: { /* verifying key */ }
});
```

---

### Core Operations

#### `deposit`

Deposit tokens into the shielded pool.

```rust
fn deposit(
    env: Env,
    from: Address,
    commitment: BytesN<32>,
) -> Result<(u32, BytesN<32>), Error>
```

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `from` | `Address` | Depositor address |
| `commitment` | `BytesN<32>` | Poseidon(nullifier ∥ secret) hash |

**Returns**: `Result<(u32, BytesN<32>), Error>`
- `u32`: Leaf index in Merkle tree
- `BytesN<32>`: New Merkle root

**Errors**:
- `NotInitialized`: Pool not initialized
- `PoolPaused`: Pool is currently paused
- `ZeroCommitment`: Cannot deposit zero commitment
- `InsufficientBalance`: Depositor has insufficient tokens

**Authorization**: Requires signature from `from` address.

**Events Emitted**: `DepositEvent`

**Example**:

```javascript
// Generate note
const nullifier = randomBytes(31);
const secret = randomBytes(31);
const commitment = poseidon2Hash(nullifier, secret);

// Deposit
const [leafIndex, root] = await contract.deposit({
  from: wallet.address,
  commitment: commitment,
});

// Store note securely
const note = { nullifier, secret, leafIndex };
saveNote(note);
```

---

#### `withdraw`

Withdraw tokens from the shielded pool using a ZK proof.

```rust
fn withdraw(
    env: Env,
    proof: Proof,
    pub_inputs: PublicInputs,
) -> Result<bool, Error>
```

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `proof` | `Proof` | Groth16 ZK proof |
| `pub_inputs` | `PublicInputs` | Public inputs (root, nullifier, recipient) |

**Returns**: `Result<bool, Error>`

**Errors**:
- `NotInitialized`: Pool not initialized
- `PoolPaused`: Pool is currently paused
- `InvalidProof`: ZK proof verification failed
- `NullifierSpent`: Nullifier already used
- `UnknownRoot`: Merkle root not in history

**Authorization**: None (proof-based authentication)

**Events Emitted**: `WithdrawEvent`

**Example**:

```javascript
// 1. Sync Merkle tree
const leaves = await fetchLeaves();
const tree = buildMerkleTree(leaves);

// 2. Generate Merkle proof
const merkleProof = tree.getProof(note.leafIndex);

// 3. Generate ZK proof
const proof = await generateZKProof({
  nullifier: note.nullifier,
  secret: note.secret,
  merkleProof: merkleProof,
  root: tree.root(),
  recipient: recipientAddress,
});

// 4. Submit withdrawal
const success = await contract.withdraw({
  proof: proof.proof,
  pub_inputs: {
    root: proof.root,
    nullifier_hash: proof.nullifierHash,
    recipient: recipientAddress,
  },
});
```

---

### View Functions

#### `get_root`

Get the current Merkle root.

```rust
fn get_root(env: Env) -> Result<BytesN<32>, Error>
```

**Returns**: `Result<BytesN<32>, Error>` - Current Merkle root

**Errors**:
- `NotInitialized`: Pool not initialized

---

#### `deposit_count`

Get the total number of deposits.

```rust
fn deposit_count(env: Env) -> u32
```

**Returns**: `u32` - Number of deposits

---

#### `is_known_root`

Check if a root exists in the historical buffer.

```rust
fn is_known_root(env: Env, root: BytesN<32>) -> bool
```

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `root` | `BytesN<32>` | Merkle root to check |

**Returns**: `bool` - True if root is in history

---

#### `is_spent`

Check if a nullifier has been spent.

```rust
fn is_spent(env: Env, nullifier_hash: BytesN<32>) -> bool
```

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `nullifier_hash` | `BytesN<32>` | Nullifier hash to check |

**Returns**: `bool` - True if spent

---

#### `get_config`

Get pool configuration.

```rust
fn get_config(env: Env) -> Result<PoolConfig, Error>
```

**Returns**: `Result<PoolConfig, Error>`

---

### Admin Functions

#### `pause`

Pause all pool operations.

```rust
fn pause(env: Env, admin: Address) -> Result<(), Error>
```

**Authorization**: Requires admin signature

**Errors**:
- `NotInitialized`: Pool not initialized
- `Unauthorized`: Caller is not admin
- `AlreadyPaused`: Pool already paused

---

#### `unpause`

Resume pool operations.

```rust
fn unpause(env: Env, admin: Address) -> Result<(), Error>
```

**Authorization**: Requires admin signature

**Errors**:
- `NotInitialized`: Pool not initialized
- `Unauthorized`: Caller is not admin
- `NotPaused`: Pool not paused

---

#### `set_verifying_key`

Update the Groth16 verifying key.

```rust
fn set_verifying_key(
    env: Env,
    admin: Address,
    new_vk: VerifyingKey,
) -> Result<(), Error>
```

**Authorization**: Requires admin signature

**Errors**:
- `NotInitialized`: Pool not initialized
- `Unauthorized`: Caller is not admin
- `InvalidVerifyingKey`: Malformed verifying key

---

## Events

### `DepositEvent`

Emitted on successful deposit.

```rust
pub struct DepositEvent {
    pub from: Address,
    pub commitment: BytesN<32>,
    pub leaf_index: u32,
    pub root: BytesN<32>,
    pub timestamp: u64,
}
```

### `WithdrawEvent`

Emitted on successful withdrawal.

```rust
pub struct WithdrawEvent {
    pub nullifier_hash: BytesN<32>,
    pub recipient: Address,
    pub relayer: Option<Address>,
    pub fee: Option<i128>,
    pub timestamp: u64,
}
```

### `PauseEvent`

Emitted when pool is paused/unpaused.

```rust
pub struct PauseEvent {
    pub paused: bool,
    pub admin: Address,
    pub timestamp: u64,
}
```

### `VerifyingKeyUpdatedEvent`

Emitted when verifying key is updated.

```rust
pub struct VerifyingKeyUpdatedEvent {
    pub admin: Address,
    pub timestamp: u64,
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `NotInitialized` | Pool not initialized |
| 2 | `AlreadyInitialized` | Pool already initialized |
| 3 | `PoolPaused` | Pool is paused |
| 4 | `ZeroCommitment` | Cannot deposit zero commitment |
| 5 | `InsufficientBalance` | Insufficient token balance |
| 6 | `InvalidProof` | ZK proof verification failed |
| 7 | `NullifierSpent` | Nullifier already used |
| 8 | `UnknownRoot` | Merkle root not in history |
| 9 | `Unauthorized` | Caller not authorized |
| 10 | `InvalidToken` | Invalid token address |
| 11 | `InvalidVerifyingKey` | Malformed verifying key |
| 12 | `AlreadyPaused` | Pool already paused |
| 13 | `NotPaused` | Pool not paused |

---

## Gas Estimates

| Function | Estimated Gas |
|----------|---------------|
| `initialize` | ~50,000 |
| `deposit` | ~80,000 |
| `withdraw` | ~150,000 |
| `get_root` | ~5,000 |
| `deposit_count` | ~3,000 |
| `is_known_root` | ~5,000 |
| `is_spent` | ~5,000 |
| `get_config` | ~5,000 |
| `pause/unpause` | ~10,000 |
| `set_verifying_key` | ~20,000 |

---

## Security Considerations

### Zero-Knowledge Proofs

- All withdrawals require valid Groth16 proofs
- Proof verification uses native BN254 host functions
- Circuit must be audited before mainnet deployment

### Nullifier Protection

- Each note can only be withdrawn once
- Nullifiers are stored on-chain to prevent double-spending
- Use strong randomness for nullifier generation

### Merkle Tree

- Tree depth: 20 levels (~1M leaves)
- Historical roots: 100 most recent roots
- Root eviction after overflow (warn users to sync)

### Admin Controls

- Admin can pause/unpause the pool
- Admin can update the verifying key
- Consider multi-sig for admin role

---

## Integration Guide

### TypeScript/JavaScript

```javascript
import { PrivacyPool } from '@privacylayer/sdk';

// Initialize client
const pool = new PrivacyPool({
  network: 'testnet',
  contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B',
});

// Connect wallet
await pool.connect(wallet);

// Deposit
const note = await pool.deposit({
  denomination: 'USDC',
  amount: 100n,
});

// Withdraw
await pool.withdraw({
  note: note,
  recipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
});
```

### Python

```python
from privacylayer import PrivacyPool

# Initialize client
pool = PrivacyPool(
    network='testnet',
    contract_id='CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B'
)

# Deposit
note = pool.deposit(
    denomination='USDC',
    amount=100
)

# Withdraw
pool.withdraw(
    note=note,
    recipient='GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
)
```

### Rust

```rust
use privacy_pool::PrivacyPool;

// Initialize client
let pool = PrivacyPool::new(
    Network::Testnet,
    "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B"
);

// Deposit
let note = pool.deposit(
    Denomination::USDC(100),
    &wallet
).await?;

// Withdraw
pool.withdraw(
    &note,
    &recipient_address
).await?;
```

---

## References

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Stellar Protocol 25 - BN254](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md)
- [Stellar Protocol 25 - Poseidon](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md)
- [Noir Language](https://noir-lang.org)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)

---

*Last Updated: 2026-03-25*
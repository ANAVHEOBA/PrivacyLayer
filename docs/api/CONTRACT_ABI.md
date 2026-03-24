# PrivacyLayer Contract ABI Documentation

This document describes the Soroban smart contract interface for PrivacyLayer.

## Contract Overview

**Contract ID**: `C...` (deployed address)
**Network**: Stellar Testnet/Mainnet
**Language**: Rust (Soroban SDK)

## Data Types

### Bytes32
```
BytesN<32> - 32-byte cryptographic value (commitment, nullifier, root, etc.)
```

### Address
```
Address - Stellar account address (ed25519 public key)
```

### Note
```
struct Note {
    nullifier: BytesN<31>,    // Random 31-byte nullifier
    secret: BytesN<31>,        // Random 31-byte secret
    amount: i128,              // Deposit amount
    asset: Address,            // Asset contract address (XLM or USDC)
}
```

## Contract Functions

### Initialize

```rust
fn initialize(
    env: Env,
    admin: Address,
    verifier: BytesN<32>,     // Verifying key hash
    denomination: i128,        // Fixed deposit amount
    asset: Address,            // Asset to deposit (XLM or USDC)
) -> Result<(), Error>
```

Initializes the privacy pool contract. Must be called once after deployment.

**Authorization**: None (initial setup)

**Parameters**:
- `admin`: Admin address with pause/update capabilities
- `verifier`: Hash of the Groth16 verifying key
- `denomination`: Fixed deposit amount in stroops
- `asset`: Asset contract address (native XLM or USDC token)

**Errors**:
- `AlreadyInitialized`: Contract already initialized

---

### Deposit

```rust
fn deposit(
    env: Env,
    commitment: BytesN<32>,    // Poseidon(nullifier, secret)
) -> Result<u32, Error>
```

Deposits funds into the shielded pool.

**Authorization**: Caller must have sufficient balance

**Parameters**:
- `commitment`: Poseidon hash of nullifier and secret

**Returns**: Leaf index in Merkle tree

**Events Emitted**:
- `DepositEvent { commitment, leaf_index, root }`

**Errors**:
- `PoolPaused`: Pool is currently paused
- `InvalidCommitment`: Invalid commitment format
- `InsufficientBalance`: Caller lacks funds

---

### Withdraw

```rust
fn withdraw(
    env: Env,
    proof: Proof,              // Groth16 proof
    nullifier_hash: BytesN<32>,
    recipient: Address,
    relayer: Option<Address>,
    fee: i128,
) -> Result<(), Error>
```

Withdraws funds from the shielded pool to a new address.

**Authorization**: None (proof-based authentication)

**Parameters**:
- `proof`: Groth16 ZK proof components
  ```rust
  struct Proof {
      a: G1,      // pi_a: [x, y]
      b: G2,      // pi_b: [[x1, y1], [x2, y2]]
      c: G1,      // pi_c: [x, y]
  }
  ```
- `nullifier_hash`: Hash of nullifier (prevents double-spend)
- `recipient`: Address to receive withdrawn funds
- `relayer`: Optional relayer address (for gasless withdrawals)
- `fee`: Fee to pay relayer (0 if no relayer)

**Events Emitted**:
- `WithdrawEvent { nullifier_hash, recipient, relayer, fee, amount }`

**Errors**:
- `PoolPaused`: Pool is currently paused
- `InvalidProof`: ZK proof verification failed
- `NullifierAlreadyUsed`: Double-spend attempt detected
- `InvalidNullifierHash`: Nullifier hash mismatch

---

### Pause

```rust
fn pause(env: Env) -> Result<(), Error>
```

Pauses the pool, preventing new deposits and withdrawals.

**Authorization**: Admin only

**Events Emitted**:
- `PoolPausedEvent { admin }`

**Errors**:
- `Unauthorized`: Caller is not admin
- `AlreadyPaused`: Pool already paused

---

### Unpause

```rust
fn unpause(env: Env) -> Result<(), Error>
```

Unpauses the pool, allowing deposits and withdrawals.

**Authorization**: Admin only

**Events Emitted**:
- `PoolUnpausedEvent { admin }`

**Errors**:
- `Unauthorized`: Caller is not admin
- `NotPaused`: Pool is not paused

---

### Update Verifying Key

```rust
fn update_verifying_key(
    env: Env,
    new_verifier: BytesN<32>,
) -> Result<(), Error>
```

Updates the Groth16 verifying key hash.

**Authorization**: Admin only

**⚠ WARNING**: This is a critical operation that affects all future withdrawals.

**Events Emitted**:
- `VkUpdatedEvent { admin }`

**Errors**:
- `Unauthorized`: Caller is not admin

---

## View Functions

### Get Merkle Root

```rust
fn get_root(env: Env) -> BytesN<32>
```

Returns the current Merkle tree root.

---

### Get Leaf Count

```rust
fn get_leaf_count(env: Env) -> u32
```

Returns the number of leaves in the Merkle tree.

---

### Get Denomination

```rust
fn get_denomination(env: Env) -> i128
```

Returns the fixed deposit amount.

---

### Get Asset

```rust
fn get_asset(env: Env) -> Address
```

Returns the asset contract address.

---

### Is Paused

```rust
fn is_paused(env: Env) -> bool
```

Returns whether the pool is currently paused.

---

### Is Nullifier Used

```rust
fn is_nullifier_used(env: Env, nullifier_hash: BytesN<32>) -> bool
```

Checks if a nullifier has been used (for double-spend detection).

---

### Is Commitment Valid

```rust
fn is_commitment_valid(env: Env, commitment: BytesN<32>) -> bool
```

Checks if a commitment exists in the Merkle tree.

---

## Events

### DepositEvent

```rust
#[contractevent]
struct DepositEvent {
    commitment: BytesN<32>,  // The deposited commitment
    leaf_index: u32,          // Position in Merkle tree
    root: BytesN<32>,         // New Merkle root after insertion
}
```

### WithdrawEvent

```rust
#[contractevent]
struct WithdrawEvent {
    nullifier_hash: BytesN<32>,  // Nullifier hash (prevents double-spend)
    recipient: Address,           // Funds recipient
    relayer: Option<Address>,     // Optional relayer
    fee: i128,                    // Fee paid to relayer
    amount: i128,                 // Amount withdrawn
}
```

### PoolPausedEvent

```rust
#[contractevent]
struct PoolPausedEvent {
    admin: Address,  // Admin who paused
}
```

### PoolUnpausedEvent

```rust
#[contractevent]
struct PoolUnpausedEvent {
    admin: Address,  // Admin who unpaused
}
```

### VkUpdatedEvent

```rust
#[contractevent]
struct VkUpdatedEvent {
    admin: Address,  // Admin who updated VK
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract already initialized |
| 2 | `NotInitialized` | Contract not initialized |
| 3 | `Unauthorized` | Caller lacks authorization |
| 4 | `PoolPaused` | Pool is currently paused |
| 5 | `NotPaused` | Pool is not paused |
| 6 | `InvalidCommitment` | Invalid commitment format |
| 7 | `InvalidProof` | ZK proof verification failed |
| 8 | `NullifierAlreadyUsed` | Nullifier already spent |
| 9 | `InvalidNullifierHash` | Nullifier hash mismatch |
| 10 | `InsufficientBalance` | Insufficient balance |
| 11 | `AlreadyPaused` | Pool already paused |
| 12 | `InvalidDenomination` | Invalid deposit amount |

---

## Cryptographic Primitives

The contract uses Stellar Protocol 25 native cryptographic functions:

### Poseidon Hash
```rust
// Host function: poseidon2_hash
// Used for: commitment = Poseidon(nullifier, secret)
```

### BN254 Operations
```rust
// Host functions: bn254_mul, bn254_add, bn254_pairing
// Used for: Groth16 proof verification
```

---

## Integration Example

### Deposit Flow

```typescript
// 1. Generate note
const nullifier = randomBytes(31);
const secret = randomBytes(31);

// 2. Compute commitment
const commitment = poseidon2Hash(nullifier, secret);

// 3. Call deposit
const leafIndex = await contract.deposit({ commitment });

// 4. Store note securely
const note = { nullifier, secret, amount, asset };
```

### Withdraw Flow

```typescript
// 1. Sync Merkle tree
const leaves = await fetchAllDepositEvents();
const tree = buildMerkleTree(leaves);

// 2. Get Merkle proof
const proof = tree.getProof(leafIndex);

// 3. Generate ZK proof
const zkProof = await generateGroth16Proof({
    nullifier,
    secret,
    merkleProof: proof,
    recipient,
    fee
});

// 4. Call withdraw
await contract.withdraw({
    proof: zkProof,
    nullifierHash: poseidon2Hash(nullifier),
    recipient,
    relayer: null,
    fee: 0
});
```

---

## Gas Costs (Estimated)

| Operation | Estimated Gas |
|-----------|--------------|
| Deposit | ~50,000 |
| Withdraw | ~200,000 |
| Pause/Unpause | ~10,000 |
| View Functions | ~5,000 |

*Actual costs may vary based on network conditions.*

---

## Security Considerations

1. **Privacy**: Never reveal your note (nullifier + secret) to anyone
2. **Double-Spend**: Nullifiers prevent spending the same note twice
3. **Front-running**: Transactions are processed atomically on-chain
4. **Admin Powers**: Admin can pause the pool and update verifying key
5. **Audits**: Contract should be audited before mainnet use

---

*For the full contract source code, see `contracts/privacy_pool/src/contract.rs`*
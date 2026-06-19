# How PrivacyLayer Works

## Overview

PrivacyLayer is a privacy pool protocol on Stellar/Soroban. It uses a fixed-denomination design with zero-knowledge proofs to break the on-chain link between depositors and recipients.

## The Core Concept

```
Alice deposits 100 USDC → [Shielded Pool] → Bob withdraws 100 USDC
                                ↑
                     No visible connection
                     between Alice and Bob
```

## Step-by-Step

### 1. Deposit

When you deposit:
- You create a **secret note** (nullifier + secret)
- You compute a **commitment** = Hash(nullifier, secret)
- You send tokens + commitment to the contract
- The commitment is added to a **Merkle tree**

```
commitment = Hash(nullifier, secret)
deposit(amount, commitment) → leaf_index
```

**Save your note!** You need the nullifier and secret to withdraw.

### 2. The Merkle Tree

All commitments are stored in an on-chain Merkle tree:
- Maximum capacity: 1,048,576 deposits
- Each deposit creates a new leaf
- A new Merkle root is computed after each deposit
- Historical roots are stored for verification

### 3. Withdrawal

When you withdraw:
- You generate a **zero-knowledge proof** that you know a valid note
- The proof reveals the **nullifier hash** (to prevent double-spending)
- But it does NOT reveal which deposit is yours

```
proof = ZK_Prove(
  I know a secret note in the Merkle tree
  with this nullifier hash
  sending to this recipient
)
```

### 4. Verification

The contract:
1. Checks the Merkle root is valid
2. Checks the nullifier hasn't been used before
3. Verifies the ZK proof
4. Sends tokens to the recipient
5. Marks the nullifier as spent

## Privacy Guarantees

| Property | Guarantee |
|----------|-----------|
| **Sender privacy** | Deposit cannot be linked to withdrawal |
| **Amount privacy** | Fixed denomination means all deposits look identical |
| **Double-spend protection** | Nullifier prevents using the same note twice |
| **Proof validity** | Groth16 proof ensures withdrawal is legitimate |

## What Remains Public

- Total deposits count
- Total withdrawals count
- Pool balance
- That a specific address deposited or received funds

## What is Hidden

- Which deposit matches which withdrawal
- The connection between depositor and recipient
- Individual deposit/withdrawal patterns within the pool

## Technical Stack

- **Smart contract:** Soroban (Rust) on Stellar
- **ZK circuits:** Noir (BN254 curve)
- **Proof system:** Groth16
- **Hash function:** Poseidon

## Next Steps

- [Understanding Zero-Knowledge Proofs →](./03-zero-knowledge-proofs.md)
- [Getting Started →](./04-getting-started.md)

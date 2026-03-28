# Merkle Trees and Privacy Pools

**Author:** PrivacyLayer Community  
**Date:** March 2026  
**Tags:** #privacy #merkle-trees #technical #tutorial

---

## What is a Merkle Tree?

A **Merkle Tree** (or hash tree) is a data structure used to efficiently and securely verify the contents of large data sets. It's named after Ralph Merkle, who patented it in 1979.

### Structure

```
                Root Hash
               /          \
          Hash A          Hash B
         /      \        /      \
    Hash 1   Hash 2   Hash 3   Hash 4
       |        |        |        |
    Data1    Data2    Data3    Data4
```

- **Leaves**: Hash of individual data items
- **Nodes**: Hash of concatenated child hashes
- **Root**: The single hash representing all data

### Key Properties

1. **Deterministic**: Same data always produces the same root
2. **Collision-resistant**: Different data produces different roots
3. **Efficient verification**: Only need log(n) hashes to prove membership

---

## Why Merkle Trees for Privacy?

### The Challenge

In a privacy pool, we need to:
1. Store all deposits efficiently
2. Prove a deposit exists without revealing which one
3. Prevent double-spending

### The Solution

Merkle trees provide:
- **Compact representation**: 32-byte root represents billions of deposits
- **Membership proofs**: Prove a deposit exists without revealing which
- **Efficient updates**: Add new deposits in constant time

---

## PrivacyLayer's Merkle Tree

### Design

PrivacyLayer uses a **binary Merkle tree** with the following properties:

| Property | Value |
|----------|-------|
| Height | 30 levels |
| Capacity | 2^30 ≈ 1 billion deposits |
| Leaf size | 32 bytes (commitment) |
| Root size | 32 bytes |

### Commitment Scheme

Each deposit creates a unique commitment:

```
commitment = hash(amount + nullifier + secret)
```

- **Amount**: How much was deposited
- **Nullifier**: Prevents double-spending
- **Secret**: Known only to the depositor

---

## How Membership Proofs Work

### The Problem

Alice deposited 100 USDC into the pool. She wants to withdraw without anyone knowing it was her deposit.

### The Solution

1. Alice constructs a **Merkle proof**: The path from her leaf to the root
2. Alice generates a **ZK proof**: "I know a valid Merkle path to the root"
3. The contract verifies: The proof is valid AND the commitment hasn't been spent

```
Alice's Proof:
├── I know a leaf in the tree (not revealed)
├── I know the path to the root (not revealed)
├── Here's the root (public, on-chain)
├── Here's my nullifier (revealed only once)
└── ZK proof ties it all together
```

### Result

- Alice proves she deposited without revealing WHICH deposit
- The nullifier prevents double-spending
- No one can link withdrawal to deposit

---

## Implementing a Merkle Tree

### Data Structure

```solidity
contract MerkleTree {
    uint256 public constant HEIGHT = 30;
    bytes32 public root;
    mapping(uint256 => bytes32) public filledSubtrees;
    uint256 public nextLeafIndex;
    
    // Insert a new leaf
    function insert(bytes32 leaf) external {
        uint256 index = nextLeafIndex++;
        bytes32 current = leaf;
        
        for (uint256 i = 0; i < HEIGHT; i++) {
            if (index & 1 == 0) {
                // Left child
                filledSubtrees[i] = current;
                current = hash(current, zeros[i]);
            } else {
                // Right child
                current = hash(filledSubtrees[i], current);
            }
            index >>= 1;
        }
        
        root = current;
    }
}
```

### Verification

```solidity
function verifyProof(
    bytes32 leaf,
    bytes32 root,
    bytes32[] calldata proof,
    uint256 index
) public pure returns (bool) {
    bytes32 current = leaf;
    
    for (uint256 i = 0; i < proof.length; i++) {
        if (index & 1 == 0) {
            current = hash(current, proof[i]);
        } else {
            current = hash(proof[i], current);
        }
        index >>= 1;
    }
    
    return current == root;
}
```

---

## Zero-Knowledge Merkle Proofs

In PrivacyLayer, the Merkle proof is generated inside a ZK circuit:

```noir
fn verify_merkle_proof(
    leaf: private Field,
    path: private [Field; 30],
    indices: private [bool; 30],
    root: public Field
) {
    let mut current = leaf;
    
    for i in 0..30 {
        if indices[i] {
            current = hash([path[i], current]);
        } else {
            current = hash([current, path[i]]);
        }
    }
    
    constrain current == root;
}
```

The ZK proof reveals ONLY the root, keeping the leaf and path private!

---

## Performance

| Operation | Time | Gas Cost |
|-----------|------|----------|
| Insert | ~50ms | ~100k gas |
| Verify Proof (on-chain) | N/A | ~200k gas |
| Verify Proof (ZK) | ~2s (client) | ~300k gas |

The ZK proof is larger but provides privacy!

---

## Security Considerations

### Tree Fullness

When the tree isn't full, we use **zero leaves** for empty positions:

```
zeros[0] = 0
zeros[i] = hash(zeros[i-1], zeros[i-1])
```

### Front-running Protection

PrivacyLayer includes the transaction hash in the nullifier derivation to prevent front-running attacks.

### Denial of Service

The contract limits tree updates per block to prevent DoS attacks.

---

## Conclusion

Merkle trees are the backbone of PrivacyLayer's privacy system. They enable:

1. **Efficient storage**: Billions of deposits in 32 bytes
2. **Private membership proofs**: Prove you deposited without revealing which
3. **Sound double-spend protection**: Nullifiers prevent replay attacks

Combined with zero-knowledge proofs, Merkle trees make true financial privacy possible on Stellar.

---

*Next article: Noir Circuits Deep Dive*
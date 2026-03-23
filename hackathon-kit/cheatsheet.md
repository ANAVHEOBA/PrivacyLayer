# 📋 PrivacyLayer Cheatsheet

Quick reference for the most common operations.

## Circuit Operations (Noir)

```bash
# Compile all circuits
cd circuits && nargo compile

# Run tests
nargo test

# Generate a proof
nargo prove

# Verify a proof
nargo verify
```

## Key Concepts

### Commitment
A cryptographic commitment hides a value while binding to it.
```
commitment = hash(amount, secret, nullifier)
```

### Nullifier
Prevents double-spending without revealing which note was spent.
```
nullifier = hash(secret, leaf_index)
```

### Merkle Tree
Stores commitments in a tree structure for efficient inclusion proofs.
```
root = hash(hash(leaf0, leaf1), hash(leaf2, leaf3))
```

## Circuit Inputs

### Deposit
| Input | Type | Visibility |
|-------|------|------------|
| amount | u64 | Public |
| commitment | Field | Public |
| secret | Field | Private |
| nullifier | Field | Private |

### Withdraw
| Input | Type | Visibility |
|-------|------|------------|
| root | Field | Public |
| nullifier_hash | Field | Public |
| recipient | Field | Public |
| amount | u64 | Public |
| secret | Field | Private |
| path_elements | [Field; N] | Private |
| path_indices | [u1; N] | Private |

## Common Patterns

### Generate Random Secret
```typescript
const secret = crypto.getRandomValues(new Uint8Array(32));
```

### Hash for Commitment
```noir
fn compute_commitment(amount: u64, secret: Field, nullifier: Field) -> Field {
    dep::std::hash::pedersen_hash([amount as Field, secret, nullifier])
}
```

### Verify Merkle Path
```noir
fn verify_merkle_path(
    leaf: Field,
    root: Field,
    path: [Field; DEPTH],
    indices: [u1; DEPTH]
) -> bool {
    let mut current = leaf;
    for i in 0..DEPTH {
        if indices[i] == 0 {
            current = dep::std::hash::pedersen_hash([current, path[i]]);
        } else {
            current = dep::std::hash::pedersen_hash([path[i], current]);
        }
    }
    current == root
}
```

## Error Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `Proof verification failed` | Invalid witness values | Check private inputs match committed values |
| `Nullifier already seen` | Double-spend attempt | Each note can only be withdrawn once |
| `Invalid Merkle root` | Root doesn't match on-chain state | Fetch latest root before proving |
| `Amount mismatch` | Withdrawal amount ≠ deposit amount | Ensure amounts match exactly |

## Useful Links

- Noir stdlib: https://noir-lang.org/docs/noir/standard_library
- Pedersen hash: https://noir-lang.org/docs/noir/standard_library/cryptographic_primitives/hashes
- Solana web3.js: https://solana-labs.github.io/solana-web3.js/

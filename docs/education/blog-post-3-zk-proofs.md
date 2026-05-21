# Zero-Knowledge Proofs: A Technical Deep Dive

**Published:** April 2026  
**Author:** PrivacyLayer Team  
**Reading Time:** 12 minutes  
**Level:** Intermediate to Advanced

---

## What is a Zero-Knowledge Proof?

A **zero-knowledge proof (ZKP)** allows one party (the prover) to prove to another party (the verifier) that a statement is true without revealing any information beyond the validity of the statement.

### Formal Properties

A ZKP must satisfy three properties:

1. **Completeness:** If the statement is true, an honest verifier will be convinced by an honest prover.

2. **Soundness:** If the statement is false, no cheating prover can convince the honest verifier (except with negligible probability).

3. **Zero-Knowledge:** If the statement is true, the verifier learns nothing beyond the fact that the statement is true.

---

## ZKPs in PrivacyLayer

PrivacyLayer uses **Groth16**, a SNARK (Succinct Non-Interactive Argument of Knowledge) scheme.

### Why Groth16?

| Property | Benefit for PrivacyLayer |
|----------|-------------------------|
| **Succinct** | Proofs are only ~200 bytes, cheap to verify on-chain |
| **Non-Interactive** | Single message from prover to verifier |
| **Argument of Knowledge** | Prover must "know" the witness (note secret) |

---

## The Withdrawal Circuit

Here's what our Noir circuit proves:

```noir
// Simplified withdrawal circuit
fn main(
    // Public inputs (visible on-chain)
    nullifier: Field,
    root: Field,
    
    // Private inputs (hidden)
    note_secret: Field,
    merkle_path: [Field; 20],
    merkle_index: u32,
) {
    // 1. Recompute commitment
    let commitment = poseidon2_hash(nullifier, note_secret);
    
    // 2. Verify Merkle proof
    let computed_root = verify_merkle_proof(
        commitment,
        merkle_path,
        merkle_index
    );
    
    // 3. Assert root matches
    assert(computed_root == root);
    
    // 4. Nullifier is unique (prevents double-spend)
    // (checked on-chain against nullifier set)
}
```

### What This Proves

The proof demonstrates:
- ✅ I know a note secret that hashes to a commitment
- ✅ That commitment is in the Merkle tree (root is on-chain)
- ✅ I'm revealing the nullifier (to prevent double-spend)
- ❌ NOT revealing: which leaf, the secret value, the path

---

## Cryptographic Primitives

### BN254 Elliptic Curve

PrivacyLayer uses the **BN254** curve, natively supported in Stellar Protocol 25:

```rust
// On-chain verification uses native host function
bn254_pairing(proof, verification_key) → bool
```

**Why BN254?**
- Efficient pairing operations
- 128-bit security level
- Native support in Soroban (no external libraries)

### Poseidon Hash

We use **Poseidon2**, a ZK-friendly hash function:

```noir
// Commitment generation
commitment = poseidon2_hash(nullifier || note_secret)
```

**Why Poseidon?**
- Optimized for ZK circuits (fewer constraints than SHA/Keccak)
- Native host function in Protocol 25
- Secure against known attacks

---

## The Merkle Tree

### Structure

```
                    Root (on-chain)
                   /    \
                  /      \
                 /        \
                /          \
               /            \
              Node          Node
             /    \        /    \
            /      \      /      \
           L0      L1    L2      L3   ← Leaves (commitments)
```

PrivacyLayer uses a **depth-20** Merkle tree:
- Supports 2^20 = ~1 million deposits
- Proof size: 20 hashes
- Update: O(log n) per deposit

### Incremental Updates

The tree is updated incrementally:
```rust
// On deposit
fn insert(commitment: Field) {
    let index = tree.size();
    tree.set(index, commitment);
    tree.update_path(index);
    // New root is stored on-chain
}
```

---

## Preventing Double-Spend

### The Nullifier Trick

Each note has a unique nullifier:
```
nullifier = hash(note_secret + random_salt)
```

**On withdrawal:**
1. Prover reveals nullifier (public)
2. On-chain contract checks: `require(!nullifiers[nullifier])`
3. Mark nullifier as spent: `nullifiers[nullifier] = true`

**Why this works:**
- Nullifier reveals nothing about the note (one-way hash)
- Same note → same nullifier → can't withdraw twice
- Different notes → different nullifiers

---

## Proof Generation (Client-Side)

### WASM Prover

Proofs are generated in the browser using WebAssembly:

```javascript
import { generateWithdrawProof } from '@privacylayer/sdk';

const proof = await generateWithdrawProof({
  noteSecret: 'secret_abc123...',
  merklePath: [...], // 20 hashes
  merkleIndex: 42,
  nullifier: 'null_xyz789...',
});

// proof is ~200 bytes, ready for on-chain submission
```

### Performance

| Metric | Value |
|--------|-------|
| Proof generation | 10-30 seconds (browser) |
| Proof size | ~200 bytes |
| Verification gas | ~50k (Soroban) |
| Verification time | < 1 second |

---

## Security Considerations

### Trusted Setup

Groth16 requires a **trusted setup**:
- One-time ceremony to generate verification keys
- "Toxic waste" must be destroyed
- PrivacyLayer uses a **multi-party computation (MPC)** setup

**Our setup:**
- 100+ participants
- Contributions verified on-chain
- Ceremony transcript public

### Soundness Attacks

Potential attacks and mitigations:

| Attack | Mitigation |
|--------|------------|
| Fake proof | On-chain verification with BN254 pairing |
| Double-spend | Nullifier tracking |
| Merkle proof forgery | Root stored on-chain |
| Replay attack | Nullifier is unique per note |

---

## Further Reading

- [Groth16 Paper](https://eprint.iacr.org/2016/260)
- [Noir Language Docs](https://noir-lang.org/docs)
- [BN254 in Stellar Protocol 25](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md)
- [Poseidon Hash Specification](https://www.poseidon-hash.info)

---

**Next:** [PrivacyLayer Architecture](../architecture/overview.md) | [SDK Reference](../sdk/api-reference.md)

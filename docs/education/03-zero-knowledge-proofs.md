# Understanding Zero-Knowledge Proofs

## What is a Zero-Knowledge Proof?

A zero-knowledge proof (ZKP) lets you prove something is true **without revealing any information** about why it's true.

### Real-World Analogy

Imagine you want to prove you know the password to a safe, but you don't want to tell anyone the password:

1. Someone puts a random message inside the safe
2. You open the safe and read the message back
3. They know you have the password — but they never learned it

## How PrivacyLayer Uses ZKPs

When withdrawing, you need to prove:

> "I know the secret behind one of the commitments in the Merkle tree"

**Without revealing:**
- Which commitment is yours
- What the secret is
- When you deposited

### The Proof Statement

```
I can prove that:
  ✓ I know (nullifier, secret) such that
  ✓ Hash(nullifier, secret) = commitment
  ✓ commitment exists in the Merkle tree with root R
  ✓ nullifier_hash = Hash(nullifier)
  
Without revealing:
  ✗ Which leaf in the tree is mine
  ✗ The actual nullifier or secret values
  ✗ When the deposit was made
```

## Groth16: The Proof System

PrivacyLayer uses **Groth16**, a specific type of ZKP called a zk-SNARK:

| Property | Description |
|----------|-------------|
| **Zero-knowledge** | Reveals nothing beyond the statement's truth |
| **Succinct** | Proof is small (~200 bytes) regardless of computation size |
| **Non-interactive** | Proof can be verified without interaction with the prover |
| **Argument of Knowledge** | Prover must actually know the witness (not just guess) |

### Proof Components

A Groth16 proof consists of three elliptic curve points:
- **A** (G1 point) — 64 bytes
- **B** (G2 point) — 128 bytes  
- **C** (G1 point) — 64 bytes

Total proof size: **256 bytes**

### Verification

Verification involves a single pairing check:
```
e(A, B) = e(α, β) · e(L, γ) · e(C, δ)
```

This is fast (< 10ms) and can be done on-chain.

## The BN254 Curve

Groth16 proofs in PrivacyLayer use the **BN254** (alt-bn128) elliptic curve:
- 254-bit prime field
- Efficient pairing operations
- Widely used in Ethereum and other chains
- ~100 bits of security

## Trusted Setup

Groth16 requires a one-time **trusted setup** ceremony:
- Generates the proving and verifying keys
- The "toxic waste" must be destroyed
- Multi-party ceremonies ensure security (at least one honest participant)

## Circuits in PrivacyLayer

The ZK circuits are written in **Noir** and handle:

1. **Commitment circuit** — Verifies Hash(nullifier, secret) = commitment
2. **Merkle proof circuit** — Verifies commitment exists in the tree
3. **Withdrawal circuit** — Combines both + public inputs

## Further Reading

- [Noir Language Documentation](https://noir-lang.org/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260)
- [Getting Started with PrivacyLayer →](./04-getting-started.md)

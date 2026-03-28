# PrivacyLayer Architecture

> Technical architecture of PrivacyLayer — the first ZK-proof shielded pool on Stellar Soroban.

## System Overview

PrivacyLayer consists of three core components:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  User       │────►│  SDK        │────►│  Soroban        │
│  (Client)   │◄────│  (Note Gen) │◄────│  Contract       │
└─────────────┘     └─────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Noir       │
                    │  Circuits   │
                    │  (ZK Proof) │
                    └─────────────┘
```

## Component Breakdown

### 1. Noir Circuits (`circuits/`)

ZK circuits written in [Noir](https://noir-lang.org/) that generate and verify zero-knowledge proofs.

| Circuit | File | Purpose |
|---------|------|---------|
| Commitment | `circuits/commitment/src/main.nr` | Generates Poseidon hash of `(nullifier, secret)` |
| Withdrawal | `circuits/withdraw/src/main.nr` | Proves membership in Merkle tree + nullifier uniqueness |
| Merkle Tree | `circuits/merkle/src/lib.nr` | Shared library for Merkle tree operations |

**Key cryptographic primitives** (via Soroban Protocol 25 host functions):

- `poseidon2_hash` — Hash function for commitments and nullifiers
- `bn254_pairing` — Groth16 proof verification on-chain

### 2. Soroban Smart Contract (`contracts/`)

Rust smart contracts compiled to WASM for Soroban deployment.

**Core contract:** `contracts/privacy_pool/`

| Function | Description |
|----------|-------------|
| `deposit(commitment)` | Insert a commitment into the Merkle tree |
| `withdraw(proof, nullifier, recipient)` | Verify ZK proof and transfer funds to recipient |
| `pause()` / `unpause()` | Emergency pause (admin only) |
| `set_verification_key(vk)` | Update circuit verification key (admin only) |

**Storage:**

- `merkle_tree` — Circular buffer storing recent Merkle tree leaves
- `nullifiers` — Set of spent nullifiers (prevents double-spending)
- `admin` — Contract administrator address
- `paused` — Boolean emergency flag

### 3. SDK (`SDK/`)

TypeScript/JavaScript SDK for client-side note generation and proof creation.

| Module | Responsibility |
|--------|---------------|
| `note.ts` | Generate `(nullifier, secret)` pairs and compute commitment |
| `merkle.ts` | Sync and query the on-chain Merkle tree |
| `proof.ts` | Generate withdrawal ZK proofs (calls Noir prover WASM) |
| `wallet.ts` | Wallet integration (Freighter — planned) |

---

## Transaction Flows

### Deposit Flow

```
1. User generates note: (nullifier, secret) = random()
2. User computes: commitment = Poseidon(nullifier || secret)
3. User calls: SDK.deposit(commitment, amount)
4. SDK calls: contract.deposit(commitment)
5. Contract: inserts commitment into Merkle tree
6. Contract: emits Deposit event
7. SDK: saves note securely (user wallet / local storage)
```

### Withdrawal Flow

```
1. User retrieves their note (nullifier, secret)
2. SDK: queries contract.merkle_tree for current state
3. SDK: computes Merkle proof for the commitment
4. SDK: generates ZK proof (via Noir prover WASM)
   - Proves: knowledge of (nullifier, secret) 
   - Proves: commitment is in Merkle tree
   - Proves: nullifier has not been spent
5. User calls: contract.withdraw(proof, nullifier, recipient)
6. Contract: verifies proof via bn254_pairing
7. Contract: checks nullifier not in spent set
8. Contract: adds nullifier to spent set
9. Contract: transfers funds to recipient address
10. User receives funds — no on-chain link to deposit!
```

---

## Merkle Tree Implementation

The contract uses a **circular buffer** Merkle tree:

- **Depth:** 20 (supports up to ~1 million deposits)
- **Storage:** Each leaf stored separately in Soroban persistence
- **History:** Recent root history maintained for finality
- **Eviction:** Old roots are evicted after the challenge period

---

## Security Model

### Threat Model

| Threat | Protection |
|--------|------------|
| Double-spending | Nullifier set checked on every withdrawal |
| Front-running | Withdrawals include a recipient address (no mempool sniping) |
| Trollbox attacks | Merkle tree insertion requires deposit value |
| Circuit bugs | Multi-audit process, formal verification (planned) |
| Trusted setup compromise | Per-session nullifiers, no recovery without note |

### What is NOT protected

- **KYC-linked exchanges** — Deposits/withdrawals to exchange accounts break privacy
- **IP address leaks** — Use Tor or VPN for strong anonymity
- **Timing correlation** — Avoid withdrawing immediately after depositing

---

## Data Structures

### Note (off-chain, user-held)

```json
{
  "nullifier": "0x1234...abcd",
  "secret": "0xefgh...ijkl",
  "commitment": "0x9876...5432",
  "depositBlock": 1234567
}
```

### Commitment (on-chain)

```
commitment = Poseidon(nullifier || secret)
```

### Nullifier (on-chain)

```
nullifier = Poseidon(nullifier_secret)
```

The nullifier is a hash of the nullifier secret — it **reveals nothing** about the original note without the secret.

---

## JSON-LD Structured Data

This page follows the [WebApplication schema](https://schema.org/WebApplication):

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "PrivacyLayer",
  "description": "ZK-proof shielded pool for private Stellar transactions",
  "url": "https://github.com/ANAVHEOBA/PrivacyLayer",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Stellar Soroban",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

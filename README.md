# PrivacyLayer — ZK-Proof Shielded Pool on Stellar Soroban

> **The first zero-knowledge proof shielded pool on Stellar** — powered by Protocol 25's native BN254 elliptic curve and Poseidon cryptographic primitives. Deposit XLM or USDC privately, withdraw with ZK proofs — no on-chain link between deposit and withdrawal addresses.

<!-- SEO Metadata -->
<!--
  Title: PrivacyLayer - ZK-Proof Shielded Pool for Stellar Soroban
  Description: PrivacyLayer is the first ZK-proof shielded pool built on Stellar Soroban (Protocol 25). Uses native BN254 pairing and Poseidon hash functions for private cryptocurrency transactions.
  Keywords: stellar, soroban, zk-proof, zero-knowledge, shielded-pool, privacy-coin, bn254, poseidon, noir, groth16, stellar-protocol-25, defi, decentralized-finance, confidential-transactions, zkp
  Canonical: https://github.com/ANAVHEOBA/PrivacyLayer
  Open Graph:
    og:title = PrivacyLayer — ZK-Proof Shielded Pool on Stellar Soroban
    og:description = First ZK-proof shielded pool on Stellar. Deposit XLM/USDC privately, withdraw with Groth16 ZK proofs. Uses native Soroban Protocol 25 BN254 + Poseidon.
    og:type = website
    og:url = https://github.com/ANAVHEOBA/PrivacyLayer
  Twitter Card:
    twitter:card = summary_large_image
    twitter:title = PrivacyLayer — ZK-Proof Shielded Pool
    twitter:description = Private transactions on Stellar Soroban via Groth16 ZK proofs and native Poseidon hashing.
  JSON-LD Organization:
    @type: Organization
    name: PrivacyLayer
    url: https://github.com/ANAVHEOBA/PrivacyLayer
  JSON-LD WebApplication:
    @type: WebApplication
    name: PrivacyLayer
    description: ZK-proof shielded pool enabling private Stellar transactions
    operatingSystem: Stellar Soroban
    applicationCategory: FinanceApplication
-->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stellar Protocol 25](https://img.shields.io/badge/Stellar-Protocol%2025-blue)](https://stellar.org)
[![Built with Noir](https://img.shields.io/badge/ZK-Noir-black)](https://noir-lang.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-purple)](https://soroban.stellar.org)
[![BN254 Native](https://img.shields.io/badge/ cryptography-BN254%20native-green)](https://developers.stellar.org/docs/data/nativeSoroban-data-types)
[![Poseidon Hash](https://img.shields.io/badge/Hash-Poseidon2-orange)](https://poseidon.wanblack.info/)

## Overview

PrivacyLayer enables **compliance-forward private transactions** on Stellar. Users deposit fixed-denomination XLM or USDC into a shielded pool, then withdraw to any address using a zero-knowledge proof — with no on-chain link between deposit and withdrawal.

**Key innovations:**

- 🔐 **No on-chain link** between deposit addresses and withdrawal addresses
- 🔗 **Native Protocol 25** — BN254 elliptic curve + Poseidon hash as Soroban host functions (no external libraries)
- ⚡ **Groth16 proofs** — Ultra-small proofs (~200 bytes) verified on-chain via `bn254_pairing`
- 🏗️ **Noir ZK circuits** — Auditable, formally-verifiable proof logic
- 🌟 **First mover** — No other Soroban dApp has used these Protocol 25 primitives

Inspired by [Penumbra](https://github.com/penumbra-zone/penumbra) (Cosmos) and [Aztec Network](https://github.com/AztecProtocol/aztec-packages) (Ethereum), adapted natively for the Stellar/Soroban ecosystem.

### Why Now?

Stellar Protocol 25 (X-Ray, January 2026) added:
- ✅ **BN254 elliptic curve** operations (`G1`/`G2` add, scalar mul, pairing)
- ✅ **Poseidon / Poseidon2** hash functions
- ✅ Both are **native Soroban host functions** — no external libraries needed

No Soroban dApp has used these yet. PrivacyLayer is the **first**.

---

## Architecture

```
User                   PrivacyLayer SDK               Soroban Contract
 │                          │                               │
 │── deposit(amount) ──────►│                               │
 │                          │── generateNote() ────────────►│
 │                          │   (nullifier, secret)         │
 │                          │── Poseidon(nullifier,secret)  │
 │                          │   = commitment               │
 │                          │── deposit(commitment) ────────►│
 │                          │                    insert into│
 │◄── noteBackup ───────────│                    MerkleTree │
 │                          │                               │
 │── withdraw(note) ────────►│                               │
 │                          │── syncMerkleTree() ──────────►│
 │                          │◄── leaves[] ─────────────────│
 │                          │── generateMerkleProof()       │
 │                          │── generateZKProof() [WASM]    │
 │                          │   Groth16 via Noir prover     │
 │                          │── withdraw(proof) ───────────►│
 │                          │                    verifyG16  │
 │                          │                    BN254 pair │
 │◄── funds at new addr ────│◄── transfer() ───────────────│
```

### Core Cryptographic Flow

| Step | Operation | Protocol 25 Primitive |
|------|-----------|----------------------|
| Deposit | `commitment = Poseidon(nullifier ∥ secret)` | `poseidon2_hash` host fn |
| Store | Insert commitment into on-chain Merkle tree | Soroban storage |
| Withdraw (prove) | ZK proof: know preimage of a commitment in the tree | Noir circuit (BN254) |
| Withdraw (verify) | Groth16 pairing check on-chain | `bn254_pairing` host fn |

---

## Repository Structure

```
PrivacyLayer/
├── circuits/              # ZK circuits written in Noir
│   ├── commitment/        # Commitment scheme (Poseidon)
│   │   └── src/main.nr
│   ├── withdraw/          # Withdrawal proof (Merkle + nullifier)
│   │   └── src/main.nr
│   ├── merkle/            # Merkle tree circuit library
│   │   └── src/lib.nr
│   ├── lib/               # Shared circuit utilities
│   │   └── src/
│   │       ├── hash/      # Hash functions
│   │       ├── merkle/    # Merkle utilities
│   │       └── validation/# Input validation
│   └── integration_test.nr
├── contracts/             # Soroban smart contracts (Rust + wasm32)
│   └── privacy_pool/      # Core shielded pool contract
├── docs/                  # Documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   ├── FAQ.md             # Frequently asked questions
│   ├── ARCHITECTURE.md    # Technical architecture
│   └── SECURITY.md        # Security best practices
├── scripts/               # Build and test scripts
├── SDK/                   # TypeScript SDK (planned)
└── README.md
```

### Quick Start

```bash
# Install prerequisites
# - Node.js 18+
# - Rust
# - Nargo (Noir compiler)
# - Docker (for Soroban Quickstart)

# Clone and setup
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer

# Build circuits
cd circuits/commitment
nargo build
nargo test

# Build contracts
cd contracts/privacy_pool
cargo build --target wasm32-unknown-unknown --release

# Run contract tests
cargo test --target wasm32-unknown-unknown
```

---

## Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| Commitment circuit | ✅ Done | Poseidon hash of note preimage |
| Withdrawal circuit | ✅ Done | Merkle proof + nullifier spend |
| Soroban contract | ✅ Done | Deposit, withdraw, pause, admin |
| SDK | 🚧 Planned | TypeScript SDK for note generation |
| Frontend | 🚧 Planned | Next.js web interface |
| Freighter wallet | 🚧 Planned | Wallet integration |
| Formal verification | 📋 Planned | Certora/prover-based CVL verification |

---

## Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | How to deploy PrivacyLayer to Stellar testnet/mainnet |
| [FAQ.md](docs/FAQ.md) | Frequently asked questions about PrivacyLayer |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Deep-dive into system architecture and cryptographic flows |
| [SECURITY.md](docs/SECURITY.md) | Security model, best practices, and known limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to PrivacyLayer development |

---

## Ecosystem

| Project | Relationship |
|---------|-------------|
| [Stellar Protocol 25](https://stellar.org) | Base layer providing BN254 + Poseidon host functions |
| [Noir](https://noir-lang.org) | ZK circuit language used for commitment and withdrawal proofs |
| [Aztec Network](https://aztec.network) | Inspiration for the shielded pool architecture |
| [Penumbra](https://penumbra.zone) | Inspiration for the account model integration |
| [Soroban](https://soroban.stellar.org) | Smart contract platform for PrivacyLayer deployment |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and coding guidelines.

### Development Status

- ✅ Circuits: Commitment, withdrawal, and merkle circuits implemented
- ✅ Contracts: Privacy pool contract with pause/unpause and admin controls
- 🚧 SDK: TypeScript SDK for note generation and proof creation (planned)
- 🚧 Frontend: Next.js dApp with Freighter wallet integration (planned)

### Roadmap

- **Circuits**: Optimization, additional proof types, circuit auditing
- **Frontend**: Web interface with Freighter wallet integration
- **SDK**: TypeScript SDK for easy integration
- **Auditing**: Professional security audit and formal verification
- **Governance**: Decentralized admin controls

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Related Repositories

- [Stellar Soroban SDK](https://github.com/stellar/rs-soroban-sdk) — Rust SDK for Soroban contracts
- [Noir](https://github.com/noir-lang/noir) — ZK circuit language compiler
- [Stellar Protocol Documentation](https://developers.stellar.org/docs/data/nativeSoroban-data-types) — BN254 and Poseidon documentation

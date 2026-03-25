# 🔐 PrivacyLayer

> **The first ZK-proof shielded pool on Stellar Soroban** — powered by Protocol 25's native BN254 and Poseidon cryptographic primitives.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stellar Protocol 25](https://img.shields.io/badge/Stellar-Protocol%2025-blue)](https://stellar.org)
[![Built with Noir](https://img.shields.io/badge/ZK-Noir-black)](https://noir-lang.org)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-purple)](https://soroban.stellar.org)

## Overview

PrivacyLayer enables **compliance-forward private transactions** on Stellar. Users deposit fixed-denomination XLM or USDC into a shielded pool, then withdraw to any address using a zero-knowledge proof — with no on-chain link between deposit and withdrawal.

Inspired by [Penumbra](https://github.com/penumbra-zone/penumbra) (Cosmos) and [Aztec Network](https://github.com/AztecProtocol/aztec-packages) (Ethereum), adapted natively for the Stellar/Soroban ecosystem.

### Why Now?

Stellar Protocol 25 (X-Ray, January 2026) added:
- ✅ **BN254 elliptic curve** operations (`G1`/`G2` add, scalar mul, pairing)
- ✅ **Poseidon / Poseidon2** hash functions
- ✅ Both are native Soroban host functions — no external libraries needed

No Soroban dApp has used these yet. PrivacyLayer is the first.

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
 │                          │── deposit(commitment) ───────►│
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
├── contracts/             # Soroban smart contracts (Rust)
│   └── privacy_pool/
│       └── src/
│           ├── contract.rs        # Main contract interface
│           ├── lib.rs             # Library entry point
│           ├── core/              # Core business logic
│           │   ├── deposit.rs     # Deposit operations
│           │   ├── withdraw.rs    # Withdrawal operations
│           │   ├── admin.rs       # Admin functions
│           │   ├── initialize.rs  # Contract initialization
│           │   └── view.rs        # View/query functions
│           ├── crypto/            # Cryptographic operations
│           │   ├── merkle.rs      # Incremental Merkle tree (depth=20)
│           │   └── verifier.rs    # Groth16 verifier via BN254 host fns
│           ├── storage/           # State management
│           │   ├── config.rs      # Configuration storage
│           │   └── nullifier.rs   # Nullifier tracking
│           ├── types/             # Type definitions
│           │   ├── state.rs       # Contract state types
│           │   ├── events.rs      # Contract events
│           │   └── errors.rs      # Error types
│           ├── utils/             # Utility functions
│           │   ├── validation.rs  # Input validation
│           │   └── address_decoder.rs
│           ├── test.rs            # Unit tests
│           └── integration_test.rs# Integration tests
├── sdk/                   # TypeScript client SDK (planned)
│   └── src/
│       ├── note.ts        # Note generation
│       ├── deposit.ts     # Deposit flow
│       ├── withdraw.ts    # Withdraw flow (proof generation)
│       ├── merkle.ts      # Client-side Merkle sync
│       └── __tests__/     # Jest tests
├── frontend/              # Next.js dApp (planned)
├── scripts/               # Deploy + key setup (planned)
├── contracts/privacy_pool/ARCHITECTURE.md  # Contract architecture docs
└── docs/                  # Documentation (planned)
```

---

## Getting Started

### Prerequisites

```bash
# Rust (for Soroban contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Noir toolchain (nargo)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup

# Node.js 18+ (for SDK and frontend)
# Use nvm: https://github.com/nvm-sh/nvm
```

### Build Circuits

```bash
cd circuits/commitment
nargo build       # Compile commitment circuit
nargo test        # Run circuit tests

cd ../withdraw
nargo build       # Compile withdrawal circuit
nargo test

cd ../merkle
nargo build       # Compile merkle library
```

### Build Contracts

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test        # Run unit and integration tests
```

## Current Status

✅ Circuits: Commitment, withdrawal, and merkle circuits implemented  
✅ Contracts: Full privacy pool contract with deposit/withdraw/admin functions  
🚧 SDK: TypeScript client SDK (planned)  
🚧 Frontend: Next.js dApp (planned)  
🚧 Scripts: Deployment automation (planned)

---

## Roadmap & Issues

We're tracking development through GitHub Issues. Key areas:

- **Circuits**: Optimization, additional proof types, circuit auditing
- **Contracts**: Gas optimization, additional admin features, testnet deployment
- **SDK**: TypeScript/JavaScript client library for note generation and proof creation
- **Frontend**: Web interface with Freighter wallet integration
- **Documentation**: Architecture docs, API references, tutorials
- **Testing**: Comprehensive test coverage, fuzzing, security audits

Check the [Issues tab](https://github.com/ANAVHEOBA/PrivacyLayer/issues) for specific tasks and bounties.

---

## Security

> **⚠️ AUDIT STATUS: Unaudited. Do not use in production.**

This project uses zero-knowledge cryptography. While the mathematical primitives (BN254, Poseidon) are battle-tested, the circuit logic and contract integration require a formal security audit before mainnet deployment.

See [`docs/threat-model.md`](docs/threat-model.md) for known risks.

### Bug Bounty Program

We run a bug bounty program through [Immunefi](https://immunefi.com/) to reward security researchers who identify vulnerabilities in our circuits, contracts, and cryptographic logic.

- **Report vulnerabilities**: See [`SECURITY.md`](SECURITY.md) for reporting instructions
- **Full program details**: See [`docs/bug-bounty-policy.md`](docs/bug-bounty-policy.md) for scope, reward tiers, and rules
- **Do NOT open public issues** for security vulnerabilities

---

## Contributing

We welcome contributions! Here's how to get started:

1. Check the [Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) tab for open tasks
2. Comment on an issue to claim it
3. Fork the repo and create a feature branch
4. Submit a PR referencing the issue number

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for detailed guidelines.

This project is funded via [Drips Wave](https://www.drips.network/wave) — contributors earn USDC for completing issues.

---

## License

MIT — see [`LICENSE`](LICENSE)

---

## References


- [CAP-0074: BN254 Host Functions](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md)
- [CAP-0075: Poseidon Hash](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md)
- [Noir Language Docs](https://noir-lang.org/docs)
- [Soroban SDK Docs](https://docs.rs/soroban-sdk)

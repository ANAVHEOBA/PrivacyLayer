# ⚡ Quick Start Guide

Get from zero to a working PrivacyLayer demo in 5 minutes.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Noir | 0.30+ | `curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install \| bash && noirup` |
| Node.js | 18+ | `nvm install 18` |
| Solana CLI | 1.18+ | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |

## Step 1: Clone & Setup

```bash
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer
```

## Step 2: Compile ZK Circuits

```bash
cd circuits
nargo compile
nargo test
```

You should see all tests passing. The circuits define the privacy logic — they prove statements without revealing secrets.

## Step 3: Build the Contracts

```bash
cd ../contracts/privacy_pool
cargo build-bpf
```

This compiles the Solana program that verifies ZK proofs on-chain.

## Step 4: Run Local Validator

```bash
# In a separate terminal
solana-test-validator
```

## Step 5: Deploy & Test

```bash
# Deploy the program
solana program deploy target/deploy/privacy_pool.so

# Run integration tests
cd ../..
bash scripts/test_all.sh
```

## Step 6: Start Building!

Pick a project from the [project ideas](./README.md#-project-ideas) and start hacking.

### Your First Private Transfer

```typescript
import { PrivacyPool } from './sdk';

// 1. Create a commitment (deposit)
const note = PrivacyPool.createNote({
  amount: 1_000_000, // 1 SOL in lamports  
  secret: crypto.getRandomValues(new Uint8Array(32)),
});

// 2. Deposit into the pool
const depositTx = await pool.deposit(note);

// 3. Generate a withdrawal proof
const proof = await pool.generateProof(note, recipientAddress);

// 4. Withdraw privately
const withdrawTx = await pool.withdraw(proof);
```

## Common Issues

### `nargo compile` fails
- Ensure Noir is up to date: `noirup`
- Check circuit syntax matches Noir version

### `cargo build-bpf` fails
- Install Solana BPF tools: `solana-install init 1.18.0`
- Ensure Rust nightly is available: `rustup install nightly`

### Tests timeout
- Local validator might not be running — start it with `solana-test-validator`
- Increase test timeout in config if needed

## Next Steps

1. Read the [Architecture section](./README.md#-architecture-overview) to understand the system
2. Look at the [examples](./examples/) for working code
3. Check [JUDGING.md](./JUDGING.md) to understand scoring criteria
4. Build something awesome! 🚀

# PrivacyLayer Deployment Guide

> Step-by-step instructions for deploying the PrivacyLayer ZK-proof shielded pool to Stellar testnet and mainnet.

## Prerequisites

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Cargo (Soroban) | Latest | `cargo install cargo-soroban` |
| Stellar CLI | 20.0+ | `cargo install stellar-cli` |
| Noir (Noirup) | 1.0+ | `curl -L https://noirlang.org/install.sh \| bash` |

### Verify Installations

```bash
rustc --version   # Should be 1.75 or higher
cargo --version
stellar --version  # Should be 20.0.0 or higher
noirup --version
```

### Testnet Account

1. Create a Stellar testnet account at [Stellar Lab](https://laboratory.stellar.org/#account-creator)
2. Fund it with test XLM using the testnet friendbot: `curl https://friendbot.stellar.org/?addr=YOUR_ADDRESS`
3. Your account needs a minimum balance of 2 XLM + contract deployment costs (~10 XLM recommended)

### Get Testnet Balance

```bash
stellar account balance YOUR_ADDRESS --network testnet
```

---

## Circuit Compilation

PrivacyLayer uses two Noir circuits:
- `circuits/commitment/` — Generates deposit commitments (Poseidon hash)
- `circuits/withdraw/` — Generates withdrawal proofs (Merkle + nullifier proof)

### 1. Install Noir Dependencies

```bash
# Install Nargo (Noir compiler)
noirup

# Verify
nargo --version
```

### 2. Compile Commitment Circuit

```bash
cd circuits/commitment

# Build the circuit
nargo build

# Output: circuits/commitment/target/commitment.gz
```

### 3. Compile Withdraw Circuit

```bash
cd circuits/withdraw

# Build the circuit  
nargo build

# Output: circuits/withdraw/target/withdraw.gz
```

### 4. Generate Verification Keys

```bash
# From circuits/withdraw directory
nargo verify --proof-name withdraw

# Output: circuits/withdraw/proving.key and verifying.key
```

> **Note**: Verification key generation can take 10-30 minutes on first run due to trusted setup.

---

## Contract Compilation

### 1. Build Soroban Contract

```bash
cd contracts/privacy_pool

# Build WASM binary
cargo build --target wasm32-unknown-unknown --release

# Output: target/wasm32-unknown-unknown/release/privacy_pool.wasm
```

### 2. Optimize WASM Binary

```bash
cargo install wasm-opt

wasm-opt -O target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  -o target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm
```

### 3. Check Contract Hash

```bash
stellar contract hash target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm
```

Expected output: A 64-character hex string (e.g., `3f8c3b2a...`)

---

## Testnet Deployment

### 1. Configure Network

```bash
# Add testnet RPC endpoint
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Set default identity
stellar keys add deployer --network testnet
```

### 2. Fund Deployer Account

```bash
# Get your public key
stellar keys address deployer

# Fund via friendbot
curl "https://friendbot.stellar.org/?addr=GA7TE...YOUR_KEY"
```

### 3. Deploy Contract

```bash
cd contracts/privacy_pool

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source deployer \
  --network testnet
```

**Save the contract ID** — you'll need it for all subsequent calls:
```
CBHDBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Initialize Contract

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --admin ACCOUNT_ID \
  --denomination 1000000   # 1 USDC (6 decimal places)
```

### 5. Set Verification Keys

```bash
# Set withdraw circuit verification key
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  set_verifying_key \
  --key "$(cat ../circuits/withdraw/verifying.key | base64)"
```

### 6. Verify Deployment

```bash
# Check admin address
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_admin

# Check denomination
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_denomination
```

---

## Configuration

### Set Admin Address

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  set_admin \
  --new_admin NEW_ACCOUNT_ID
```

### Configure Fee Parameter

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  set_fee \
  --fee 100   # basis points (1% = 100)
```

### Enable/Disable Deposits

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  set_deposits_enabled \
  --enabled true
```

---

## Testing Deployment

### Test Deposit

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source user1 \
  --network testnet \
  -- \
  deposit \
  --amount 1000000
```

Expected: Emits `Deposit` event with commitment hash.

### Test Withdrawal

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source user2 \
  --network testnet \
  -- \
  withdraw \
  --proof "$(cat proof.json | base64)" \
  --root "$(cat merkle_root.json | base64)" \
  --nullifier_hash "$(cat nullifier.json | base64)"
```

### Check Contract State

```bash
# Get contract metadata
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_state

# Get total deposited
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_total_deposited
```

---

## Mainnet Deployment

### ⚠️ Security Checklist

Before mainnet deployment:

- [ ] All circuits have been audited
- [ ] Verification keys are committed and immutable
- [ ] Multi-sig admin (at least 3-of-5) is configured
- [ ] Emergency pause functionality is tested
- [ ] Upgrade timelock is set (minimum 48 hours)
- [ ] Bug bounty program is active
- [ ] Testnet has been running for at least 2 weeks with no issues

### 1. Fund Mainnet Account

You need significantly more XLM for mainnet deployment:
- Base reserve: 0.5 XLM
- Contract deployment: ~100 XLM
- Initial deposits: Variable

### 2. Deploy to Mainnet

```bash
stellar network add mainnet \
  --rpc-url https://soroban-mainnet.stellar.org:443 \
  --network-passphrase "Public Global Stellar Network ; September 2015"

stellar keys add deployer --network mainnet

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source deployer \
  --network mainnet
```

### 3. Initialize with Production Values

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network mainnet \
  -- \
  initialize \
  --admin MULTISIG_ACCOUNT \
  --denomination 1000000   # 1 USDC
```

---

## Troubleshooting

### Common Errors

**"Account not found"**
```
Error: TransactionFailed: Account not found
```
→ Fund your account with test XLM or mainnet XLM first.

**"Insufficient balance"**
```
Error: TransactionFailed: insufficient balance
```
→ Ensure you have at least 2 XLM base reserve + deployment costs (~10 XLM).

**"WASM too large"**
```
Error: Resource exceeded
```
→ Run `wasm-opt -Oz` to further optimize the WASM binary.

**"Verification key mismatch"**
```
Error: Invalid verification key
```
→ Ensure the verification key was generated from the correct compiled circuit.

### Debug Commands

```bash
# View contract events
stellar contract events \
  --id CONTRACT_ID \
  --network testnet \
  --type all

# Check account details
stellar account details ACCOUNT_ID --network testnet

# Simulate a transaction (dry run)
stellar contract invoke \
  --id CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  deposit \
  --amount 1000000 \
  --simulate
```

### Getting Help

- Stellar Dev Discord: https://discord.gg/stellardev
- Soroban Forum: https://forum.stellar.org
- PrivacyLayer Issues: https://github.com/ANAVHEOBA/PrivacyLayer/issues

---

## Scripts

The `scripts/` directory contains automation scripts:

```bash
# One-shot testnet deployment
./scripts/deploy-testnet.sh

# Verify contract state
./scripts/verify-state.sh CONTRACT_ID

# Generate test proofs
./scripts/generate-proof.sh
```

---

## Production Considerations

### Monitoring

Set up monitoring for:
- Contract events (deposits, withdrawals)
- Failed transaction rate
- Nullifier set growth
- Merkle tree depth utilization

### Backup

- Store verification keys offline
- Keep deployment keys in hardware wallet
- Document all initialization parameters

### Upgrade Path

PrivacyLayer uses Soroban's upgrade mechanism. Before upgrading:
1. Deploy new WASM to a separate contract ID
2. Run full test suite against new contract
3. Run migration script to transfer state
4. Submit upgrade proposal to multi-sig admin

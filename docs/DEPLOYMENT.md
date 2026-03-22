# PrivacyLayer Deployment Guide

> **Comprehensive step-by-step instructions for deploying the PrivacyLayer shielded pool contract to Stellar testnet and mainnet.**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Circuit Compilation](#2-circuit-compilation)
3. [Contract Compilation](#3-contract-compilation)
4. [Testnet Deployment](#4-testnet-deployment)
5. [Contract Configuration](#5-contract-configuration)
6. [Verification & Testing](#6-verification--testing)
7. [Mainnet Deployment](#7-mainnet-deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### 1.1 Rust & Cargo

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM target for Soroban smart contracts
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version    # Should be 1.70+
cargo --version
```

### 1.2 Stellar CLI

```bash
# Install the Stellar CLI
cargo install --locked stellar-cli

# Verify installation
stellar --version
```

### 1.3 Noir Toolchain (nargo)

```bash
# Install noirup (Noir toolchain installer)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash

# Install nargo
noirup

# Verify installation
nargo --version
```

### 1.4 Network Account Setup

#### Testnet Account

```bash
# Generate a new testnet keypair
stellar keys generate --global testnet-deployer --network testnet

# Fund the account via Friendbot (testnet faucet)
stellar keys fund testnet-deployer --network testnet
# Expected output: "Account funded with 10,000 XLM"

# Verify account exists
stellar account --id $(stellar keys address testnet-deployer) --network testnet
```

#### Mainnet Account

```bash
# Generate a mainnet keypair (store seed phrase securely!)
stellar keys generate --global mainnet-deployer --network mainnet

# Fund the account (transfer XLM from exchange or another wallet)
# Record the address and fund manually
stellar keys address mainnet-deployer
```

> ⚠️ **Security**: Never share or commit private keys. Use environment variables or a secrets manager.

---

## 2. Circuit Compilation

PrivacyLayer uses [Noir](https://noir-lang.org) ZK circuits that must be compiled before deployment. The verification keys generated from these circuits are required during contract initialization.

### 2.1 Compile All Circuits

```bash
cd circuits/

# Compile the commitment circuit (Poseidon hash)
cd commitment && nargo build && cd ..

# Compile the Merkle tree library
cd merkle && nargo build && cd ..

# Compile the withdrawal proof circuit
cd withdraw && nargo build && cd ..
```

Expected output for each circuit:
```
[noir] Compiled circuit: <circuit_name> (<X> constraints)
```

### 2.2 Run Circuit Tests

```bash
cd circuits/

# Test all circuits
for circuit in commitment merkle withdraw; do
    echo "Testing $circuit..."
    nargo test --package "$circuit"
done
```

Expected output:
```
Testing commitment...
[noir] 3/3 tests passed
Testing merkle...
[noir] 5/5 tests passed
Testing withdraw...
[noir] 8/8 tests passed
```

### 2.3 Generate Verification Key

The withdrawal circuit requires a Groth16 verification key (VK) for on-chain proof verification. Generate it using `nargo`:

```bash
cd circuits/withdraw/

# Generate proving and verification keys
nargo compile

# Export the verification key (JSON format)
# The VK is used during contract initialization (see Section 5)
nargo export-verifier --output vk.json
```

The exported `vk.json` contains:
- `alpha_g1`: 64-byte G1 point
- `beta_g2`: 128-byte G2 point
- `gamma_g2`: 128-byte G2 point
- `delta_g2`: 128-byte G2 point
- `gamma_abc_g1`: Array of 7 G1 points (IC[0] through IC[6])

> **Note**: Keep this file secure. The VK is stored on-chain during initialization.

### 2.4 Verify Compilation Artifacts

```bash
# Confirm generated files exist
ls -la circuits/withdraw/target/
# Should contain:
#   - withdraw.json (circuit bytecode)
#   - vk.json (verification key, if exported)
#   - pk.bin (proving key, optional)
```

---

## 3. Contract Compilation

### 3.1 Build the WASM Binary

```bash
cd contracts/

# Build for production (optimized)
cargo build --target wasm32-unknown-unknown --release

# Output location
ls -la target/wasm32-unknown-unknown/release/privacy_pool.wasm
```

Expected file size: ~50-80 KB (optimized with LTO and symbol stripping).

### 3.2 Run Contract Tests

```bash
cd contracts/

# Unit tests
cargo test --package privacy_pool

# Integration tests
cargo test --package privacy_pool integration

# All tests at once
cargo test --package privacy_pool -- --include-ignored
```

Expected output:
```
test result: ok. XX passed; 0 failed; 0 ignored; 0 measured
```

### 3.3 Optimize WASM (Optional)

For minimal on-chain footprint, use `wasm-opt`:

```bash
# Install wasm-opt (via binaryen)
# Ubuntu/Debian:
sudo apt install binaryen
# macOS:
brew install binaryen

# Optimize the WASM binary
wasm-opt -Oz -o privacy_pool_optimized.wasm \
    target/wasm32-unknown-unknown/release/privacy_pool.wasm

# Compare sizes
ls -lh target/wasm32-unknown-unknown/release/privacy_pool.wasm
ls -lh privacy_pool_optimized.wasm
```

---

## 4. Testnet Deployment

### 4.1 Upload the Contract

```bash
cd contracts/

# Deploy the contract to testnet
stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
    --source testnet-deployer \
    --network testnet \
    --alias privacy-pool-testnet

# Record the contract ID from the output
# Example: CONTRACT_ID="CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Expected output:
```
Contract deployed successfully!
Contract ID: CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

> 💡 Save the contract ID — you'll need it for initialization and all subsequent operations.

### 4.2 Verify Contract Deployment

```bash
# Check the contract exists on testnet
CONTRACT_ID="CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- deposit_count
# Expected output: 0 (no deposits yet, contract not initialized)
```

### 4.3 Deploy a Test Token (Optional)

If you need a test token (e.g., for USDC denomination testing):

```bash
# Deploy a test token contract
stellar contract deploy \
    --wasm <path_to_token_contract.wasm> \
    --source testnet-deployer \
    --network testnet \
    --alias test-token

# Or use the Stellar native asset (XLM) for XLM denominations
# No token contract needed for Xlm10, Xlm100, Xlm1000
```

---

## 5. Contract Configuration

### 5.1 Initialize the Privacy Pool

The `initialize` function must be called **once** before any deposits or withdrawals. It sets:

- **Admin address**: Can pause/unpause and update the verifying key
- **Token address**: XLM native address or a SAC (Stellar Asset Contract) address
- **Denomination**: Fixed deposit amount (`Xlm10`, `Xlm100`, `Xlm1000`, `Usdc100`, `Usdc1000`)
- **Verification key**: Groth16 VK from the withdrawal circuit

```bash
CONTRACT_ID="CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
ADMIN_ADDRESS=$(stellar keys address testnet-deployer)

# For XLM denomination (native asset, no token contract):
# Use the Stellar native asset contract address (all zeros)
TOKEN_ADDRESS="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

# Initialize with Xlm100 denomination and the verification key
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --token "$TOKEN_ADDRESS" \
    --denomination '{"Xlm100": null}' \
    --vk "$(cat circuits/withdraw/vk.json | jq -c .)"
```

> **Denomination options**:
> - `{"Xlm10": null}` — 10 XLM (100,000,000 stroops)
> - `{"Xlm100": null}` — 100 XLM (1,000,000,000 stroops)
> - `{"Xlm1000": null}` — 1000 XLM (10,000,000,000 stroops)
> - `{"Usdc100": null}` — 100 USDC (100,000,000 microunits)
> - `{"Usdc1000": null}` — 1000 USDC (1,000,000,000 microunits)

### 5.2 Verify Configuration

```bash
# View pool configuration
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- get_config_view
```

Expected output (example):
```json
{
  "admin": "GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "token": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
  "denomination": {"Xlm100": null},
  "tree_depth": 20,
  "root_history_size": 100,
  "paused": false
}
```

### 5.3 Update Verification Key (If Needed)

If you need to update the VK after initialization:

```bash
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- set_verifying_key \
    --admin "$ADMIN_ADDRESS" \
    --new-vk "$(cat /path/to/updated_vk.json | jq -c .)"
```

---

## 6. Verification & Testing

### 6.1 Test Deposit

Before making real deposits, verify the contract state:

```bash
# Check initial deposit count (should be 0)
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- deposit_count

# Check current Merkle root
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- get_root
```

To test a deposit, you'll need the PrivacyLayer SDK (or manual Soroban invocation):

```bash
# Using the SDK (when available):
# npm install @privacy-layer/sdk
# Generate a note, compute commitment, call deposit

# Manual deposit via Stellar CLI (advanced):
# Requires a valid 32-byte commitment (Poseidon hash of nullifier + secret)
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- deposit \
    --from "$ADMIN_ADDRESS" \
    --commitment "0x<32-byte-commitment-hash>"
```

### 6.2 Test Withdrawal Verification

Withdrawals require a valid Groth16 proof. To test the withdrawal circuit locally:

```bash
cd circuits/withdraw/

# Run the circuit tests (includes proof generation/verification)
nargo test
```

### 6.3 Verify On-Chain State

```bash
# Check pool is not paused
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- get_config_view | jq '.paused'
# Expected: false

# Check nullifier status (should be unspent for new pool)
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- is_spent \
    --nullifier-hash "0x0000000000000000000000000000000000000000000000000000000000000000"
# Expected: false

# Check if a root is known
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- is_known_root \
    --root "$(stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network testnet -- get_root)"
```

### 6.4 Test Admin Functions

```bash
# Test pause
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- pause \
    --admin "$ADMIN_ADDRESS"

# Verify paused state
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- get_config_view | jq '.paused'
# Expected: true

# Test unpause
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- unpause \
    --admin "$ADMIN_ADDRESS"

# Verify unpaused state
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source testnet-deployer \
    --network testnet \
    -- get_config_view | jq '.paused'
# Expected: false
```

---

## 7. Mainnet Deployment

### 7.1 Pre-Deployment Checklist

Before deploying to mainnet, complete the following security checklist:

- [ ] **All unit tests pass** — `cargo test --package privacy_pool`
- [ ] **All integration tests pass** — `cargo test --package privacy_pool integration`
- [ ] **All circuit tests pass** — `nargo test` in each circuit directory
- [ ] **Contract tested on testnet** — deposits, withdrawals, and admin functions verified
- [ ] **Verification key validated** — VK matches the deployed circuit exactly
- [ ] **Code reviewed** — at least one independent reviewer
- [ ] **Dependencies audited** — no known vulnerabilities in soroban-sdk, soroban-poseidon
- [ ] **Admin key secured** — mainnet admin key stored in hardware wallet or multisig
- [ ] **Contract address documented** — for monitoring and user reference
- [ ] **Fee parameters reviewed** — denomination and fees are appropriate

> ⚠️ **AUDIT STATUS**: This contract is unaudited. Do not deploy to mainnet with significant funds until a formal security audit is completed.

### 7.2 Deploy to Mainnet

```bash
cd contracts/

# Deploy using the mainnet key
stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
    --source mainnet-deployer \
    --network mainnet \
    --alias privacy-pool-mainnet

# Record the contract ID
# MAINNET_CONTRACT_ID="CAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 7.3 Initialize on Mainnet

```bash
CONTRACT_ID="$MAINNET_CONTRACT_ID"
ADMIN_ADDRESS=$(stellar keys address mainnet-deployer)

# For XLM denomination:
TOKEN_ADDRESS="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

# Initialize with production settings
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source mainnet-deployer \
    --network mainnet \
    -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --token "$TOKEN_ADDRESS" \
    --denomination '{"Xlm100": null}' \
    --vk "$(cat circuits/withdraw/vk.json | jq -c .)"
```

### 7.4 Post-Deployment Verification

```bash
# Verify deployment on mainnet
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source mainnet-deployer \
    --network mainnet \
    -- get_config_view

# Verify deposit count is 0
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source mainnet-deployer \
    --network mainnet \
    -- deposit_count

# Record all values for monitoring:
# - Contract ID
# - Admin address
# - Token address
# - Denomination
# - Deployment transaction hash
```

### 7.5 Monitor Contract

Set up monitoring for the deployed contract:

```bash
# Watch for deposit events
# (Use Stellar Horizon API or a monitoring service)

# Check contract state periodically
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source mainnet-deployer \
    --network mainnet \
    -- deposit_count

# Check if pool is paused (should be false in normal operation)
stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source mainnet-deployer \
    --network mainnet \
    -- get_config_view | jq '.paused'
```

---

## 8. Troubleshooting

### Common Errors

#### `Error::AlreadyInitialized (1)`

**Cause**: `initialize` called more than once.

**Solution**: The contract can only be initialized once. If you need to change settings, use admin functions:
- `set_verifying_key` — update the VK
- `pause` / `unpause` — control pool availability

#### `Error::NotInitialized (2)`

**Cause**: Trying to deposit/withdraw before calling `initialize`.

**Solution**: Call `initialize` first with valid parameters.

#### `Error::UnauthorizedAdmin (10)`

**Cause**: Non-admin address calling admin-only functions.

**Solution**: Use the address that was set as `admin` during initialization. Check with:
```bash
stellar contract invoke --id "$CONTRACT_ID" --source <admin-key> --network testnet -- get_config_view | jq '.admin'
```

#### `Error::PoolPaused (20)`

**Cause**: Pool is paused; deposits and withdrawals are blocked.

**Solution**: Call `unpause` from the admin account:
```bash
stellar contract invoke --id "$CONTRACT_ID" --source <admin-key> --network testnet -- unpause --admin <admin-address>
```

#### `Error::WrongAmount (30)`

**Cause**: Deposit amount doesn't match the pool's denomination.

**Solution**: Ensure the deposited amount equals the configured denomination exactly (e.g., exactly 100 XLM for `Xlm100`).

#### `Error::ZeroCommitment (31)`

**Cause**: Attempting to deposit a zero-value commitment.

**Solution**: Generate a valid commitment using Poseidon(nullifier, secret) — both inputs must be non-zero.

#### `Error::UnknownRoot (40)`

**Cause**: Withdrawal proof references a Merkle root not in the root history.

**Solution**: Sync the Merkle tree client-side and use a recent root. The contract keeps the last 100 roots.

#### `Error::NullifierAlreadySpent (41)`

**Cause**: Double-spend attempt — this note has already been withdrawn.

**Solution**: Each note can only be withdrawn once. Generate a new note for each deposit.

#### `Error::InvalidProof (42)`

**Cause**: Groth16 proof verification failed.

**Solution**: Verify the proof was generated with the correct circuit and VK. Check:
1. Public inputs match the on-chain state (correct root, nullifier hash, recipient)
2. Proof was generated with the same VK deployed on-chain
3. Circuit compilation matches the deployed version

#### `Error::MalformedVerifyingKey (51)`

**Cause**: VK bytes have incorrect length or format.

**Solution**: Re-export the VK from the circuit compilation:
```bash
cd circuits/withdraw/
nargo export-verifier --output vk.json
```
Verify the JSON structure matches the `VerifyingKey` type (alpha_g1: 64 bytes, beta_g2: 128 bytes, etc.).

### Debug Commands

```bash
# Check contract account exists on network
stellar account --id "$CONTRACT_ID" --network testnet

# View recent transactions for the contract
stellar tx --source testnet-deployer --network testnet --limit 10

# Verify WASM hash matches deployed contract
stellar contract inspect --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm
stellar contract inspect --id "$CONTRACT_ID" --network testnet

# Check account balance (admin needs XLM for transaction fees)
stellar account --id "$ADMIN_ADDRESS" --network testnet

# View contract storage keys
stellar contract read --id "$CONTRACT_ID" --network testnet --key <storage-key-hex>
```

### Support Resources

- **Stellar Discord**: [#soroban channel](https://discord.gg/stellar)
- **Noir Discord**: [#general channel](https://discord.gg/noir)
- **Soroban Docs**: [https://soroban.stellar.org](https://soroban.stellar.org)
- **GitHub Issues**: [PrivacyLayer Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)

---

## Automation Scripts

### Quick Deploy Script

Save this as `scripts/deploy.sh` for automated testnet deployment:

```bash
#!/usr/bin/env bash
set -e

NETWORK="${1:-testnet}"
KEY_NAME="${2:-testnet-deployer}"
DENOMINATION="${3:-Xlm100}"

echo "=== PrivacyLayer Deployment ==="
echo "Network: $NETWORK"
echo "Key: $KEY_NAME"
echo "Denomination: $DENOMINATION"

# Build
echo "[1/4] Building contract..."
cd contracts && cargo build --target wasm32-unknown-unknown --release && cd ..

# Compile circuits
echo "[2/4] Compiling circuits..."
cd circuits/withdraw && nargo compile && nargo export-verifier --output vk.json && cd ../..

# Deploy
echo "[3/4] Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/target/wasm32-unknown-unknown/release/privacy_pool.wasm \
    --source "$KEY_NAME" \
    --network "$NETWORK" \
    --alias "privacy-pool-$NETWORK" 2>&1 | grep -oP 'Contract ID: \K.*')

echo "Contract deployed: $CONTRACT_ID"

# Initialize
echo "[4/4] Initializing contract..."
ADMIN_ADDRESS=$(stellar keys address "$KEY_NAME")
TOKEN_ADDRESS="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"

stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$KEY_NAME" \
    --network "$NETWORK" \
    -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --token "$TOKEN_ADDRESS" \
    --denomination "{\"$DENOMINATION\": null}" \
    --vk "$(cat circuits/withdraw/vk.json | jq -c .)"

echo "=== Deployment Complete ==="
echo "Contract ID: $CONTRACT_ID"
echo "Network: $NETWORK"
```

### Quick Test Script

Save this as `scripts/test_deploy.sh` to verify a deployed contract:

```bash
#!/usr/bin/env bash
set -e

CONTRACT_ID="${1:?Usage: $0 <contract-id> [network]}"
NETWORK="${2:-testnet}"

echo "=== Testing PrivacyLayer Deployment ==="
echo "Contract: $CONTRACT_ID"
echo "Network: $NETWORK"

echo "[1/5] Checking configuration..."
stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network "$NETWORK" -- get_config_view

echo "[2/5] Checking deposit count..."
stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network "$NETWORK" -- deposit_count

echo "[3/5] Checking Merkle root..."
stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network "$NETWORK" -- get_root

echo "[4/5] Testing pause..."
ADMIN=$(stellar keys address testnet-deployer)
stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network "$NETWORK" -- pause --admin "$ADMIN"

echo "[5/5] Testing unpause..."
stellar contract invoke --id "$CONTRACT_ID" --source testnet-deployer --network "$NETWORK" -- unpause --admin "$ADMIN"

echo "=== All Checks Passed ==="
```

---

*Last updated: 2026-03-23*
*PrivacyLayer v0.1.0 | Stellar Soroban SDK v25.3.0 | Noir*

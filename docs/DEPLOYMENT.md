# PrivacyLayer Deployment Guide

## Prerequisites

### 1. Rust & Cargo
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

### 2. Stellar CLI
```bash
cargo install --locked stellar-cli --features opt
stellar --version  # Verify: >= 21.0.0
```

### 3. Noir Toolchain
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
nargo --version  # Verify: >= 0.30.0
```

### 4. Node.js (for frontend)
```bash
# Node.js >= 18 required
node --version
npm --version
```

## Testnet Deployment

### Step 1: Configure Network
```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Step 2: Create Deployer Account
```bash
stellar keys generate deployer --network testnet
stellar keys address deployer  # Save this address
# Fund via Friendbot
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

### Step 3: Build Contracts
```bash
cd contracts
# Build privacy pool contract
stellar contract build --package privacy-pool
# Build verifier contract
stellar contract build --package verifier
```

### Step 4: Generate ZK Circuits
```bash
cd circuits
nargo compile
nargo prove  # Generate test proof
nargo verify  # Verify test proof passes
```

### Step 5: Deploy Verifier Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/verifier.wasm \
  --source deployer \
  --network testnet \
  -- --admin $(stellar keys address deployer)
# Save the CONTRACT_ID output
export VERIFIER_ID=<contract_id>
```

### Step 6: Deploy Privacy Pool Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --source deployer \
  --network testnet \
  -- --admin $(stellar keys address deployer) \
     --verifier $VERIFIER_ID \
     --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2OOBD2BYR
```

### Step 7: Verify Deployment
```bash
# Check contract exists
stellar contract info --id $VERIFIER_ID --network testnet
stellar contract info --id $PRIVACY_POOL_ID --network testnet

# Test deposit
stellar contract invoke \
  --id $PRIVACY_POOL_ID \
  --source deployer \
  --network testnet \
  -- deposit --amount 1000000 --commitment <test_commitment>
```

## Mainnet Deployment

### Pre-flight Checklist
- [ ] All tests pass: `cargo test --all`
- [ ] ZK circuits verified: `nargo verify`
- [ ] Security audit completed
- [ ] Contract code reviewed by team
- [ ] Deployer account funded with sufficient XLM (minimum 100 XLM)

### Step 1: Configure Mainnet
```bash
stellar network add mainnet \
  --rpc-url https://soroban-rpc.mainnet.stellar.gateway.fm \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

### Step 2: Deploy (Same steps as testnet with --network mainnet)
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/verifier.wasm \
  --source deployer \
  --network mainnet

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --source deployer \
  --network mainnet \
  -- --admin $(stellar keys address deployer) \
     --verifier $VERIFIER_ID
```

### Step 3: Post-Deployment Verification
```bash
# Verify on Stellar Expert
# https://stellar.expert/explorer/public/contract/<contract_id>

# Run integration tests against mainnet
NETWORK=mainnet cargo test --features integration
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STELLAR_NETWORK` | Network to use | `testnet` / `mainnet` |
| `DEPLOYER_SECRET` | Deployer private key | `S...` (keep secret!) |
| `VERIFIER_ID` | Verifier contract ID | `C...` |
| `PRIVACY_POOL_ID` | Privacy pool contract ID | `C...` |
| `RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `insufficient funds` | Fund account via Friendbot (testnet) or transfer XLM (mainnet) |
| `contract too large` | Enable `opt-level = "z"` in `Cargo.toml` profile |
| `simulation failed` | Check contract args match ABI, verify auth signature |
| `nargo compile error` | Update Noir toolchain: `noirup` |
| `wasm build fails` | Install target: `rustup target add wasm32-unknown-unknown` |

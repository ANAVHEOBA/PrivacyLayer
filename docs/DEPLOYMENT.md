# PrivacyLayer Deployment Guide

> Complete guide for deploying PrivacyLayer shielded pool contracts to Stellar testnet and mainnet.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Circuit Compilation](#2-circuit-compilation)
3. [Contract Compilation](#3-contract-compilation)
4. [Testnet Deployment](#4-testnet-deployment)
5. [Configuration](#5-configuration)
6. [Verification](#6-verification)
7. [Mainnet Deployment](#7-mainnet-deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### 1.1 System Requirements

- **OS**: Linux/macOS/Windows with WSL2
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space
- **Network**: Stable internet connection

### 1.2 Install Rust and Cargo

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WASM target for Soroban
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version
cargo --version
```

**Expected output:**
```
rustc 1.85.0 (f6e511eec 2025-03-15)
cargo 1.85.0 (d73d2caf9 2024-12-31)
```

### 1.3 Install Stellar CLI

```bash
# Install via cargo
cargo install --locked stellar-cli --features opt

# Verify installation
stellar --version
```

**Expected output:**
```
stellar-cli 22.2.0
```

### 1.4 Install Noir Toolchain

```bash
# Install noirup (Noir version manager)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
source ~/.bashrc  # or ~/.zshrc

# Install latest Noir version
noirup

# Verify installation
nargo --version
```

**Expected output:**
```
nargo version = 1.0.0-beta.3
noirc version = 1.0.0-beta.3
```

### 1.5 Fund Testnet Account

```bash
# Generate a new testnet keypair
stellar keys generate --global testnet-deployer

# Get the public key
stellar keys address testnet-deployer

# Fund the account via Friendbot
stellar network fund --source testnet-deployer

# Check balance
stellar contract asset balance --id $(stellar keys address testnet-deployer)
```

**Expected output:**
```
✅ Account funded with 10,000 XLM
Public Key: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 2. Circuit Compilation

### 2.1 Navigate to Circuits Directory

```bash
cd circuits/
```

### 2.2 Compile Commitment Circuit

```bash
cd commitment/
nargo build

# Generate verification key
nargo prove --oracle-resolver ../../scripts/oracle_resolver.py
```

**Expected output:**
```
[commitment] Circuit compiled successfully
[commitment] Proving key size: 2.4 MB
[commitment] Verification key exported to: ./target/verification_key.json
```

### 2.3 Compile Withdrawal Circuit

```bash
cd ../withdraw/
nargo build

# Generate verification key
nargo prove --oracle-resolver ../../scripts/oracle_resolver.py
```

**Expected output:**
```
[withdraw] Circuit compiled successfully
[withdraw] Proving key size: 4.8 MB
[withdraw] Verification key exported to: ./target/verification_key.json
```

### 2.4 Compile Merkle Library

```bash
cd ../merkle/
nargo build
```

### 2.5 Run Circuit Tests

```bash
cd ../commitment && nargo test
cd ../withdraw && nargo test
cd ../merkle && nargo test
```

**Expected output:**
```
Running 3 tests...
test test_commitment_generation ... ok
test test_nullifier_derivation ... ok
test test_poseidon_hash ... ok
```

### 2.6 Export Circuit Artifacts

```bash
# Create artifacts directory
mkdir -p ../contracts/privacy_pool/artifacts

# Copy verification keys
cp commitment/target/verification_key.json ../contracts/privacy_pool/artifacts/
cp withdraw/target/verification_key.json ../contracts/privacy_pool/artifacts/

# Copy circuit binaries
cp commitment/target/commitment.json ../contracts/privacy_pool/artifacts/
cp withdraw/target/withdraw.json ../contracts/privacy_pool/artifacts/
```

---

## 3. Contract Compilation

### 3.1 Navigate to Contracts Directory

```bash
cd ../../contracts/privacy_pool/
```

### 3.2 Build WASM Binary

```bash
cargo build --target wasm32-unknown-unknown --release
```

**Expected output:**
```
Compiling privacy_pool v0.1.0
Finished release [optimized] target(s) in 45.23s
```

### 3.3 Optimize for Size

```bash
# Install wasm-opt (if not already installed)
cargo install wasm-opt

# Optimize the WASM binary
wasm-opt -Oz -o target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  target/wasm32-unknown-unknown/release/privacy_pool.wasm

# Check file sizes
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

**Expected output:**
```
-rw-r--r-- 1 user user 245K Mar 24 10:00 privacy_pool.wasm
-rw-r--r-- 1 user user 187K Mar 24 10:01 privacy_pool_optimized.wasm
```

### 3.4 Generate Contract Hash

```bash
# Generate contract hash for verification
stellar contract install \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source testnet-deployer \
  --network testnet \
  --dry-run
```

**Expected output:**
```
Contract Hash: 0x7a3f...e9d2 (preview)
Estimated cost: 3.2 XLM
```

### 3.5 Run Contract Tests

```bash
cargo test
```

**Expected output:**
```
Running 12 tests...
test test_deposit ... ok
test test_withdraw ... ok
test test_merkle_tree ... ok
test test_nullifier_tracking ... ok
...
test result: ok. 12 passed; 0 failed
```

---

## 4. Testnet Deployment

### 4.1 Configure Network

```bash
# Add testnet network configuration
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Set as default
stellar network use testnet
```

### 4.2 Deploy Contract

```bash
# Deploy the optimized contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source testnet-deployer \
  --network testnet \
  --fee 1000000
```

**Expected output:**
```
Contract ID: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC2
Transaction Hash: 7a3f8e9d2c1b4a5f6e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0
Successfully deployed contract
```

**Save the Contract ID** - you'll need it for all subsequent operations.

### 4.3 Initialize Contract

```bash
# Set environment variable for convenience
export CONTRACT_ID="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC2"

# Initialize the contract
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  initialize \
  --admin $(stellar keys address testnet-deployer) \
  --merkle_depth 20
```

**Expected output:**
```
Transaction successful
Contract initialized with:
  - Admin: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
  - Merkle Tree Depth: 20
  - Max Leaves: 1,048,576
```

### 4.4 Set Verification Keys

```bash
# Set commitment verification key
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  set_verifying_key \
  --key_type 0 \
  --key_file artifacts/commitment/verification_key.json

# Set withdrawal verification key
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  set_verifying_key \
  --key_type 1 \
  --key_file artifacts/withdraw/verification_key.json
```

**Expected output:**
```
Verification key set for commitment circuit
Verification key set for withdrawal circuit
```

---

## 5. Configuration

### 5.1 Set Admin Address

```bash
# Verify current admin
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  -- \
  get_admin
```

**Expected output:**
```
Admin: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 5.2 Configure Denominations

```bash
# Add supported denominations (in stroops: 1 XLM = 10,000,000 stroops)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  add_denomination \
  --amount 100000000  # 10 XLM

stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  add_denomination \
  --amount 500000000  # 50 XLM

stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  add_denomination \
  --amount 1000000000  # 100 XLM
```

**Expected output:**
```
Denomination added: 10 XLM
Denomination added: 50 XLM
Denomination added: 100 XLM
```

### 5.3 Set Fee Parameters

```bash
# Set deposit fee (in basis points, 100 = 1%)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  set_fee_parameters \
  --deposit_fee_bp 50 \
  --withdraw_fee_bp 100 \
  --fee_recipient $(stellar keys address testnet-deployer)
```

**Expected output:**
```
Fee parameters updated:
  - Deposit fee: 0.5%
  - Withdraw fee: 1.0%
  - Fee recipient: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 5.4 Enable/Disable Features

```bash
# Enable deposits
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  set_feature_enabled \
  --feature 0 \
  --enabled true

# Enable withdrawals
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  set_feature_enabled \
  --feature 1 \
  --enabled true
```

**Expected output:**
```
Feature 'deposits' enabled
Feature 'withdrawals' enabled
```

---

## 6. Verification

### 6.1 Test Deposit

```bash
# Create a test deposit note
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  deposit \
  --amount 100000000 \
  --commitment 0x7a3f8e9d2c1b4a5f6e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0
```

**Expected output:**
```
Deposit successful
Note created with commitment: 0x7a3f8e9d2c1b4a5f6e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0
Merkle tree leaf index: 0
```

### 6.2 Test Withdrawal

```bash
# Generate a withdrawal proof (requires Noir prover)
cd scripts/
python3 generate_withdraw_proof.py \
  --note <your_note> \
  --merkle_path <merkle_proof> \
  --output proof.json

# Submit withdrawal
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  --fee 100000 \
  -- \
  withdraw \
  --proof_file proof.json \
  --recipient $(stellar keys address testnet-deployer)
```

**Expected output:**
```
Withdrawal proof verified
Transfer completed: 10 XLM to GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Nullifier recorded: 0x...
```

### 6.3 Verify Events

```bash
# Check contract events
stellar contract events \
  --id $CONTRACT_ID \
  --network testnet \
  --start-ledger 0
```

**Expected output:**
```
Event: deposit
  - commitment: 0x7a3f...
  - amount: 100000000
  - timestamp: 1711267200

Event: withdrawal
  - nullifier: 0x...
  - recipient: GXXX...
  - amount: 100000000
  - timestamp: 1711267800
```

### 6.4 Check Contract State

```bash
# Get pool statistics
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  -- \
  get_pool_stats
```

**Expected output:**
```
Pool Statistics:
  - Total deposits: 1
  - Total withdrawals: 0
  - Merkle tree size: 1
  - Total value locked: 10 XLM
  - Nullifiers count: 0
```

---

## 7. Mainnet Deployment

### 7.1 Security Checklist

Before deploying to mainnet, ensure:

- [ ] **Code Audit**: Contract audited by a reputable firm
- [ ] **Circuit Audit**: ZK circuits formally verified
- [ ] **Testnet Testing**: Minimum 2 weeks of testnet operation
- [ ] **Bug Bounty**: Public bug bounty program launched
- [ ] **Multi-sig Admin**: Admin key held by multi-sig wallet
- [ ] **Emergency Pause**: Pause mechanism tested and functional
- [ ] **Monitoring**: Alert system configured for suspicious activity
- [ ] **Insurance**: Coverage for potential exploits

### 7.2 Audit Requirements

```bash
# Generate audit report from testnet
stellar contract history \
  --id $CONTRACT_ID \
  --network testnet \
  --output audit_report.json

# Run security analysis
python3 scripts/security_analysis.py \
  --report audit_report.json \
  --output security_audit.md
```

### 7.3 Mainnet Deployment Steps

```bash
# Configure mainnet network
stellar network add mainnet \
  --rpc-url https://soroban-rpc.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# Switch to mainnet
stellar network use mainnet

# Deploy with higher fee budget
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source mainnet-deployer \
  --network mainnet \
  --fee 5000000

# Initialize with multi-sig admin
stellar contract invoke \
  --id $MAINNET_CONTRACT_ID \
  --source mainnet-deployer \
  --network mainnet \
  --fee 100000 \
  -- \
  initialize \
  --admin <MULTI_SIG_ADDRESS> \
  --merkle_depth 20
```

### 7.4 Post-Deployment Verification

```bash
# Verify contract hash matches testnet
stellar contract hash \
  --id $MAINNET_CONTRACT_ID \
  --network mainnet

# Run smoke tests
bash scripts/smoke_test_mainnet.sh

# Monitor initial transactions
stellar contract events \
  --id $MAINNET_CONTRACT_ID \
  --network mainnet \
  --start-ledger latest
```

---

## 8. Troubleshooting

### 8.1 Common Errors

#### Error: "Insufficient balance"

```
Error: Account balance insufficient for transaction
```

**Solution:**
```bash
# Check balance
stellar balance --source testnet-deployer

# Fund account if needed
stellar network fund --source testnet-deployer
```

#### Error: "Contract not found"

```
Error: Contract CAAXXXXXXXXXXX not found on network
```

**Solution:**
```bash
# Verify contract ID
stellar contract info --id $CONTRACT_ID --network testnet

# Redeploy if necessary
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm \
  --source testnet-deployer \
  --network testnet
```

#### Error: "Verification key mismatch"

```
Error: Provided verification key does not match circuit
```

**Solution:**
```bash
# Rebuild circuits
cd circuits/commitment && nargo build
cd ../withdraw && nargo build

# Re-export verification keys
cp commitment/target/verification_key.json ../contracts/privacy_pool/artifacts/
cp withdraw/target/verification_key.json ../contracts/privacy_pool/artifacts/

# Reset verification keys in contract
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  -- \
  reset_verifying_keys
```

#### Error: "Transaction failed: Wasm VM error"

```
Error: Wasm VM trapped: Unreachable instruction
```

**Solution:**
```bash
# Check contract logs
stellar contract events \
  --id $CONTRACT_ID \
  --network testnet \
  --start-ledger <failed_tx_ledger>

# Rebuild with debug symbols
cargo build --target wasm32-unknown-unknown --release --features debug
```

### 8.2 Debug Commands

```bash
# Get contract storage
stellar contract storage \
  --id $CONTRACT_ID \
  --network testnet

# Trace transaction
stellar transaction trace \
  --hash <tx_hash> \
  --network testnet

# Simulate contract call
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-deployer \
  --network testnet \
  -- \
  <function_name> \
  --dry-run
```

### 8.3 Support Resources

- **Documentation**: https://github.com/ANAVHEOBA/PrivacyLayer/docs
- **Discord**: https://discord.gg/privacylayer
- **GitHub Issues**: https://github.com/ANAVHEOBA/PrivacyLayer/issues
- **Email**: support@privacylayer.dev

### 8.4 Emergency Contacts

For critical security issues:

1. **Pause the contract immediately:**
   ```bash
   stellar contract invoke \
     --id $CONTRACT_ID \
     --source admin-key \
     --network mainnet \
     -- \
     emergency_pause
   ```

2. **Contact the team:**
   - Security email: security@privacylayer.dev
   - Telegram: @privacylayer_security

3. **Monitor for exploits:**
   ```bash
   # Set up alerts
   python3 scripts/monitor_alerts.py --contract $CONTRACT_ID
   ```

---

## Appendix A: Quick Reference

### Environment Variables

```bash
export CONTRACT_ID="CAAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export NETWORK="testnet"  # or "mainnet"
export DEPLOYER="testnet-deployer"
export RPC_URL="https://soroban-testnet.stellar.org"
```

### Common Commands

| Action | Command |
|--------|---------|
| Deploy | `stellar contract deploy --wasm <file> --source <key> --network <net>` |
| Invoke | `stellar contract invoke --id <id> -- <function> --args` |
| Events | `stellar contract events --id <id> --network <net>` |
| Balance | `stellar balance --source <key>` |

### Contract Addresses

| Network | Contract ID |
|---------|-------------|
| Testnet | `CAAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| Mainnet | `TBA` |

---

*Last updated: March 24, 2026*
*Version: 1.0.0*
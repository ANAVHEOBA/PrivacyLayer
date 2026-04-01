# PrivacyLayer Deployment Guide

Complete step-by-step instructions for deploying the PrivacyLayer privacy pool contract to Stellar testnet and mainnet.

## Prerequisites

### 1.1 System Requirements

- **OS**: macOS, Linux, or Windows (WSL2 recommended)
- **RAM**: 16GB minimum (32GB recommended)
- **Disk**: 10GB free space
- **Network**: Stable internet connection

### 1.2 Required Software

#### Rust and Cargo

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version
# Should output: rustc 1.70+ (check stellar-cli for specific version requirements)
```

#### Stellar CLI

```bash
cargo install --locked stellar-cli
stellar --version
```

#### Noir Toolchain (nargo)

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
source $HOME/.cargo/env
noirup
nargo --version
```

#### Node.js 18+

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
node --version  # Should output: v18.x.x or higher
```

### 1.3 Funded Testnet Account

1. Generate a new keypair:
```bash
stellar key generate --network testnet my-account
```

2. Fund the account using the Stellar testnet faucet:
   - Visit https://laboratory.stellar.org/#account-creator?network=testnet
   - Or use: `curl https://friendbot.stellar.org/?addr=$(stellar key address my-account)`

3. Verify the account:
```bash
stellar account lookup --network testnet $(stellar key address my-account)
```

## Circuit Compilation

### 2.1 Clone and Setup

```bash
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer
```

### 2.2 Compile Commitment Circuit

```bash
cd circuits/commitment
nargo build
nargo test
```

Expected output:
```
[package] - commitment
[ ] - compiling..
[✓] - compiled successfully
[ ] - testing..
[✓] - all tests passing
```

### 2.3 Compile Withdrawal Circuit

```bash
cd ../withdraw
nargo build
nargo test
```

### 2.4 Compile Merkle Library

```bash
cd ../merkle
nargo build
```

### 2.5 Generate Verification Keys

```bash
cd ../..
nargo codegen_verifier --contract commitment
nargo codegen_verifier --contract withdraw
```

This generates the verification keys needed for on-chain verification.

## Contract Compilation

### 3.1 Build WASM Binary

```bash
cd contracts/privacy_pool
cargo build --target wasm32-unknown-unknown --release
```

Expected output:
```
   Compiling privacy_pool v0.1.0
    Finished release [optimized] target(s)
```

### 3.2 Optimize WASM (Optional)

For production deployment, optimize the WASM size:

```bash
cargo install wasm-opt
wasm-opt -Oz target/wasm32-unknown-unknown/release/privacy_pool.wasm -o optimized.wasm
```

### 3.3 Generate Contract Hash

```bash
stellar contract hash --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm
```

Save this hash for verification.

## Testnet Deployment

### 4.1 Deploy Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --source my-account \
  --network testnet
```

Output example:
```
Contract deployed with ID: CBWDH5YJ2JVZL6X7CZBDCCB4IXB7BPR6GIRGWM6ZRKYXJIHLBS4NUUY5
```

Save the contract ID.

### 4.2 Initialize Contract

```bash
stellar contract invoke \
  --id CBWDH5YJ2JVZL6X7CZBDCCB4IXB7BPR6GIRGWM6ZRKYXJIHLBS4NUUY5 \
  --source my-account \
  --network testnet \
  -- initialize \
  --admin $(stellar key address my-account) \
  --denomination 1000000
```

### 4.3 Set Verification Keys

```bash
stellar contract invoke \
  --id CBWDH5YJ2JVZL6X7CZBDCCB4IXB7BPR6GIRGWM6ZRKYXJIHLBS4NUUY5 \
  --source my-account \
  --network testnet \
  -- set_verification_keys \
  --commitment_vk "$(cat ../circuits/commitment/plonk_verification_key.json)" \
  --withdraw_vk "$(cat ../circuits/withdraw/plonk_verification_key.json)"
```

### 4.4 Verify Deployment

```bash
# Check contract state
stellar contract invoke \
  --id CBWDH5YJ2JVZL6X7CZBDCCB4IXB7BPR6GIRGWM6ZRKYXJIHLBS4NUUY5 \
  --source my-account \
  --network testnet \
  -- get_admin

# Check denomination
stellar contract invoke \
  --id CBWDH5YJ2JVZL6X7CZBDCCB4IXB7BPR6GIRGWM6ZRKYXJIHLBS4NUUY5 \
  --source my-account \
  --network testnet \
  -- get_denomination
```

## Configuration

### 5.1 Set Admin Address

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- set_admin \
  --new_admin NEW_ADMIN_ADDRESS
```

### 5.2 Configure Denominations

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- add_denomination \
  --amount 10000000
```

Supported denominations: 1, 10, 100, 1000, 10000, 100000, 1000000 XLM or USDC

### 5.3 Set Fee Parameters

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- set_fee \
  --deposit_fee 100 \
  --withdraw_fee 100
```

### 5.4 Enable/Disable Features

```bash
# Enable deposits
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- set_deposits_enabled \
  --enabled true

# Enable withdrawals
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- set_withdrawals_enabled \
  --enabled true
```

## Testing

### 6.1 Test Deposit

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- deposit \
  --amount 1000000
```

Expected events:
```
Topic: [..., "type", "deposit"]
Topic: [..., "commitment", "COMMITMENT_HASH"]
Data: Note backup: {nullifier}:{secret}
```

**IMPORTANT**: Save the note backup securely. Losing it means losing your funds.

### 6.2 Test Withdrawal

```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source my-account \
  --network testnet \
  -- withdraw \
  --proof "$(cat proof.json)" \
  --root "$(cat merkle_root.json)" \
  --nullifier_hash NULLIFIER_HASH \
  --recipient RECIPIENT_ADDRESS
```

### 6.3 Verify Events

```bash
stellar contract events \
  --id YOUR_CONTRACT_ID \
  --network testnet \
  --type deposit,withdraw
```

## Mainnet Deployment

### 7.1 Security Checklist

- [ ] Contract code audited by reputable security firm
- [ ] All circuit code formally verified
- [ ] Multi-signature admin keys configured
- [ ] Emergency pause mechanism tested
- [ ] Backup and recovery procedures documented
- [ ] Monitoring and alerting systems in place
- [ ] Legal review completed for jurisdiction
- [ ] Bug bounty program established

### 7.2 Pre-deployment Steps

1. **Final Testnet Verification**
```bash
# Run full test suite
cd contracts
cargo test --release

# Run integration tests
cd ..
cargo test --test integration
```

2. **Code Audit**
   - Engage professional audit firm
   - Address all findings
   - Public disclosure of audit report

3. **Mainnet Account Setup**
```bash
stellar key generate --network mainnet deploy-account
stellar key generate --network mainnet admin-account
stellar key generate --network mainnet emergency-account
```

4. **Multi-sig Configuration**
```bash
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deploy-account \
  --network mainnet \
  -- set_multisig \
  --threshold 2 \
  --signers [ADMIN_PUBKEY,EMERGENCY_PUBKEY]
```

### 7.3 Mainnet Deployment Commands

```bash
# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --source deploy-account \
  --network mainnet

# Initialize
stellar contract invoke \
  --id YOUR_MAINNET_CONTRACT_ID \
  --source admin-account \
  --network mainnet \
  -- initialize \
  --admin $(stellar key address admin-account) \
  --denomination 1000000

# Configure verification keys
stellar contract invoke \
  --id YOUR_MAINNET_CONTRACT_ID \
  --source admin-account \
  --network mainnet \
  -- set_verification_keys \
  --commitment_vk "$(cat ../circuits/commitment/plonk_verification_key.json)" \
  --withdraw_vk "$(cat ../circuits/withdraw/plonk_verification_key.json)"
```

### 7.4 Post-deployment Verification

```bash
# Verify contract exists
stellar contract info --id YOUR_MAINNET_CONTRACT_ID --network mainnet

# Check initial state
stellar contract invoke \
  --id YOUR_MAINNET_CONTRACT_ID \
  --source admin-account \
  --network mainnet \
  -- get_admin

# Test small deposit (1 XLM)
stellar contract invoke \
  --id YOUR_MAINNET_CONTRACT_ID \
  --source admin-account \
  --network mainnet \
  -- deposit \
  --amount 1000000
```

## Troubleshooting

### Common Errors

#### "Insufficient Balance"

Your account doesn't have enough XLM for deployment + initialization.
```
Solution: Fund account with more XLM (minimum 1000 XLM recommended for mainnet)
```

#### "Contract already initialized"

Attempting to initialize an already-initialized contract.
```
Solution: This is expected. Contract initialization is one-time only.
```

#### "Verification key mismatch"

Circuit verification keys don't match.
```
Solution: Recompile circuits and regenerate keys. Ensure circuit versions match contract version.
```

#### "Merkle tree sync failed"

Client cannot sync with on-chain Merkle tree.
```
Solution: Check network connectivity and contract state. Try again after a few blocks.
```

#### "Proof generation timeout"

ZK proof generation took too long.
```
Solution: Use more powerful hardware or optimize circuit. Increase timeout in SDK.
```

### Debug Commands

```bash
# Check account details
stellar account lookup --network testnet YOUR_ADDRESS

# View contract code
stellar contract code --id YOUR_CONTRACT_ID --network testnet

# Check recent operations
stellar operations --account YOUR_CONTRACT_ID --network testnet --limit 10

# View contract events
stellar contract events --id YOUR_CONTRACT_ID --network testnet --type all --limit 20
```

### Support Resources

- **GitHub Issues**: https://github.com/ANAVHEOBA/PrivacyLayer/issues
- **Documentation**: https://docs.privacylayer.xyz
- **Discord**: https://discord.gg/privacylayer
- **Stellar Discord**: #soroban-dev channel

## Automation Scripts

### deploy-testnet.sh

```bash
#!/bin/bash
set -e

NETWORK="testnet"
CONTRACT_WASM="target/wasm32-unknown-unknown/release/privacy_pool.wasm"

echo "Deploying PrivacyLayer to testnet..."

# Deploy
CONTRACT_ID=$(stellar contract deploy \
  --wasm $CONTRACT_WASM \
  --source my-account \
  --network $NETWORK \
  --output json | jq -r '.contract_id')

echo "Contract deployed: $CONTRACT_ID"

# Initialize
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-account \
  --network $NETWORK \
  -- initialize \
  --admin $(stellar key address my-account) \
  --denomination 1000000

echo "Contract initialized"

# Save contract ID
echo $CONTRACT_ID > .contract_id
echo "Deployment complete. Contract ID: $CONTRACT_ID"
```

### verify-deployment.sh

```bash
#!/bin/bash
set -e

CONTRACT_ID=$(cat .contract_id)
NETWORK="testnet"

echo "Verifying deployment..."

# Check admin
ADMIN=$(stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-account \
  --network $NETWORK \
  -- get_admin 2>/dev/null)

echo "Admin: $ADMIN"

# Check denomination
DENOM=$(stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-account \
  --network $NETWORK \
  -- get_denomination 2>/dev/null)

echo "Denomination: $DENOM"

echo "Verification complete!"
```

## Security Checklist Summary

### Pre-deployment
- [ ] All prerequisites installed
- [ ] Testnet deployment successful
- [ ] All tests passing
- [ ] Circuit verification keys generated
- [ ] WASM optimized
- [ ] Contract hash verified

### Mainnet
- [ ] Security audit completed
- [ ] Multi-sig configured
- [ ] Emergency procedures tested
- [ ] Monitoring active
- [ ] Team trained on operations
- [ ] Incident response plan ready

---

**WARNING**: This contract is unaudited. Do not use with large amounts of funds on mainnet until audited.

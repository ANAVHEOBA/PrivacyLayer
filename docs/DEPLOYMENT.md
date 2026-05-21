# PrivacyLayer Deployment Guide

Step-by-step instructions for deploying the PrivacyLayer privacy pool contract to Stellar Soroban testnet and mainnet.

---

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

### 1.1 Rust and Cargo

Install Rust via rustup and add the WASM compilation target:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Add WASM target for Soroban
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version
cargo --version
```

Expected output:

```
rustc 1.82.x (or later)
cargo 1.82.x (or later)
```

### 1.2 Stellar CLI

Install the Stellar CLI, which provides the `stellar` command for contract deployment and interaction:

```bash
cargo install --locked stellar-cli

# Verify installation
stellar --version
```

Expected output:

```
stellar 25.x.x
```

### 1.3 Noir Toolchain (nargo)

Install the Noir toolchain for compiling ZK circuits:

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup

# Verify installation
nargo --version
```

Expected output:

```
nargo version = 1.x.x
```

### 1.4 Node.js (Optional)

Required only if you plan to use the TypeScript SDK for client-side operations:

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 18
node --version
```

### 1.5 Funded Testnet Account

Generate a new Stellar keypair and fund it via the testnet friendbot:

```bash
# Generate a new identity for deployment
stellar keys generate deployer --network testnet

# View the public key
stellar keys address deployer

# Fund via friendbot (10,000 test XLM)
stellar keys fund deployer --network testnet
```

> **Note:** Store your secret key securely. Never commit it to version control.

### 1.6 Clone the Repository

```bash
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer
```

---

## 2. Circuit Compilation

The ZK circuits must be compiled before deployment. The circuits produce verification keys that are uploaded to the contract.

### 2.1 Compile All Circuits

```bash
cd circuits

# Compile the commitment circuit
cd commitment
nargo build
nargo test
cd ..

# Compile the Merkle tree library
cd merkle
nargo build
nargo test
cd ..

# Compile the withdrawal proof circuit
cd withdraw
nargo build
nargo test
cd ..
```

Each `nargo build` command produces artifacts in the circuit's `target/` directory.

### 2.2 Generate Verification Keys

After compiling the withdrawal circuit, generate the Groth16 proving and verification keys:

```bash
cd withdraw

# Generate the proving key and verification key
nargo prove
```

The verification key (VK) is needed to initialize the on-chain contract. It contains BN254 elliptic curve points that the contract uses to verify withdrawal proofs.

### 2.3 Export Circuit Artifacts

The key files produced are:

| File | Purpose |
|------|---------|
| `target/commitment.json` | Compiled commitment circuit |
| `target/withdraw.json` | Compiled withdrawal circuit |
| `target/vk` | Groth16 verification key (needed for contract init) |
| `target/proof` | Example proof (for testing) |

---

## 3. Contract Compilation

### 3.1 Build the WASM Binary

```bash
cd contracts

# Build the optimized WASM binary
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file is located at:

```
target/wasm32-unknown-unknown/release/privacy_pool.wasm
```

### 3.2 Optimize for Size

The `Cargo.toml` already includes size optimization settings (`opt-level = "z"`, `lto = true`, `strip = "symbols"`). For additional optimization:

```bash
# Optional: further optimize with wasm-opt (install via binaryen)
wasm-opt -Oz \
  target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  -o target/wasm32-unknown-unknown/release/privacy_pool_optimized.wasm
```

### 3.3 Run Contract Tests

Before deploying, verify all tests pass:

```bash
cd contracts

# Run unit tests
cargo test --package privacy_pool

# Run integration tests
cargo test --package privacy_pool integration
```

Alternatively, use the provided test script:

```bash
chmod +x scripts/test_all.sh
./scripts/test_all.sh
```

### 3.4 Generate Contract Hash

```bash
stellar contract build

# The WASM hash is printed during deployment (see next section)
```

---

## 4. Testnet Deployment

### 4.1 Configure Testnet Network

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 4.2 Deploy the Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --network testnet \
  --source deployer
```

Expected output:

```
Contract deployed successfully.
Contract ID: CABC...XYZ
```

Save the contract ID. You will need it for all subsequent commands.

```bash
# Store the contract ID for convenience
export CONTRACT_ID="CABC...XYZ"
```

### 4.3 Initialize the Contract

The contract must be initialized once before accepting deposits. Initialization sets:

- **Admin address** -- the account that can pause/unpause the pool and update the verification key
- **Token address** -- the Stellar Asset Contract (SAC) address for XLM or USDC
- **Denomination** -- the fixed deposit/withdrawal amount (e.g., `Xlm10`, `Xlm100`, `Xlm1000`, `Usdc100`, `Usdc1000`)
- **Verifying key** -- the Groth16 verification key from the circuit compilation step

```bash
# Get the native XLM SAC address
stellar contract id asset \
  --asset native \
  --network testnet

# Initialize with 10 XLM denomination
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  initialize \
  --admin $(stellar keys address deployer) \
  --token <XLM_SAC_ADDRESS> \
  --denomination Xlm10 \
  --vk '{"alpha_g1": "<hex>", "beta_g2": "<hex>", "gamma_g2": "<hex>", "delta_g2": "<hex>", "gamma_abc_g1": ["<hex>", ...]}'
```

> **Important:** Replace the `--vk` parameter with the actual verification key generated in Step 2.2. The key must contain valid BN254 curve points encoded as hex bytes.

### 4.4 Verify Deployment

```bash
# Check the pool configuration
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  get_config_view

# Check the deposit count (should be 0)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  deposit_count
```

Expected output for `get_config_view`:

```json
{
  "admin": "G...",
  "token": "C...",
  "denomination": "Xlm10",
  "tree_depth": 20,
  "root_history_size": 30,
  "paused": false
}
```

---

## 5. Configuration

### 5.1 Admin Address

The admin address is set during initialization and has the following privileges:

- **Pause/Unpause** the pool (blocks or allows deposits and withdrawals)
- **Update the verifying key** (for circuit upgrades)

```bash
# Pause the pool
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  pause \
  --admin $(stellar keys address deployer)

# Unpause the pool
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  unpause \
  --admin $(stellar keys address deployer)
```

### 5.2 Denominations

The pool supports fixed denominations to prevent amount-based correlation attacks:

| Denomination | Asset | Amount | Stroops/Microunits |
|-------------|-------|--------|-------------------|
| `Xlm10` | XLM | 10 XLM | 100,000,000 |
| `Xlm100` | XLM | 100 XLM | 1,000,000,000 |
| `Xlm1000` | XLM | 1,000 XLM | 10,000,000,000 |
| `Usdc100` | USDC | 100 USDC | 100,000,000 |
| `Usdc1000` | USDC | 1,000 USDC | 1,000,000,000 |

The denomination is fixed at initialization and cannot be changed. To support multiple denominations, deploy separate pool instances.

### 5.3 Update Verifying Key

If the ZK circuits are upgraded, the admin must update the on-chain verifying key:

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  set_verifying_key \
  --admin $(stellar keys address deployer) \
  --new_vk '{"alpha_g1": "<hex>", ...}'
```

> **Warning:** Updating the verification key is a critical operation. Any proofs generated with the old circuit will fail verification after the key is updated. Coordinate with users before performing this operation.

---

## 6. Verification

After deployment, verify the contract is functioning correctly by performing a test deposit and withdrawal.

### 6.1 Test Deposit

A deposit requires:

1. A funded account with sufficient balance
2. A valid commitment (the Poseidon2 hash of a nullifier and secret)

```bash
# Fund a test user account
stellar keys generate testuser --network testnet
stellar keys fund testuser --network testnet

# Perform a deposit (commitment must be a valid 32-byte hex value)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source testuser \
  -- \
  deposit \
  --from $(stellar keys address testuser) \
  --commitment 0x<32_BYTE_COMMITMENT_HEX>
```

Expected output:

```json
[0, "0x<MERKLE_ROOT_HEX>"]
```

The first value is the leaf index (0 for the first deposit), and the second is the new Merkle root.

### 6.2 Verify Deposit Count

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  deposit_count
```

Expected output: `1`

### 6.3 Verify Merkle Root

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  get_root
```

The returned root should match the root from the deposit output.

### 6.4 Test Withdrawal

A withdrawal requires a valid Groth16 proof. This is generated client-side using the Noir prover with the private note data (nullifier, secret, leaf index, Merkle path).

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  withdraw \
  --proof '{"a": "<64_BYTE_HEX>", "b": "<128_BYTE_HEX>", "c": "<64_BYTE_HEX>"}' \
  --pub_inputs '{"root": "<32B>", "nullifier_hash": "<32B>", "recipient": "<32B>", "amount": "<32B>", "relayer": "<32B>", "fee": "<32B>"}'
```

Expected output: `true`

### 6.5 Verify Nullifier Spent

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  is_spent \
  --nullifier_hash 0x<NULLIFIER_HASH_HEX>
```

Expected output: `true`

### 6.6 Check Contract Events

View emitted events on Stellar testnet using the Stellar CLI or a block explorer:

```bash
stellar events \
  --id $CONTRACT_ID \
  --network testnet \
  --start-ledger <DEPLOY_LEDGER> \
  --count 10
```

Events to look for:

| Event | Fields | Meaning |
|-------|--------|---------|
| `DepositEvent` | commitment, leaf_index, root | Deposit processed |
| `WithdrawEvent` | nullifier_hash, recipient, relayer, fee, amount | Withdrawal processed |
| `PoolPausedEvent` | admin | Pool was paused |
| `PoolUnpausedEvent` | admin | Pool was unpaused |
| `VkUpdatedEvent` | admin | Verifying key was updated |

---

## 7. Mainnet Deployment

### 7.1 Security Checklist

Before deploying to mainnet, complete the following checklist:

- [ ] **Smart contract audit** -- The contract must be audited by a reputable security firm
- [ ] **Circuit audit** -- The Noir ZK circuits must be audited for soundness (correct constraint system, no under-constrained witnesses)
- [ ] **All tests passing** -- Run `./scripts/test_all.sh` and verify zero failures
- [ ] **Testnet deployment verified** -- Complete a full deposit-withdrawal cycle on testnet
- [ ] **Admin key security** -- The admin key must be stored in a hardware wallet or multi-sig
- [ ] **Verifying key correctness** -- The VK must match the audited circuit exactly
- [ ] **Denomination chosen** -- Decide which denomination(s) to support at launch
- [ ] **Emergency pause tested** -- Verify the pause/unpause mechanism works on testnet
- [ ] **Monitoring in place** -- Set up monitoring for contract events and pool state
- [ ] **Incident response plan** -- Document procedures for handling security incidents
- [ ] **Rate limiting** -- Consider off-chain rate limiting for deposit/withdrawal requests
- [ ] **Frontend deployed** -- The dApp frontend is deployed and tested end-to-end

### 7.2 Audit Requirements

The following components require independent security audits:

| Component | Audit Focus |
|-----------|-------------|
| Noir circuits (`circuits/withdraw/`) | Constraint soundness, witness uniqueness, no under-constrained variables |
| Soroban contract (`contracts/privacy_pool/`) | Access control, fund safety, reentrancy, overflow, storage management |
| Groth16 verifier (`crypto/verifier.rs`) | Correct pairing equation, point validation, scalar encoding |
| Merkle tree (`crypto/merkle.rs`) | Root computation correctness, history buffer, boundary conditions |

### 7.3 Deployment Steps

```bash
# 1. Configure mainnet network
stellar network add mainnet \
  --rpc-url https://soroban.stellar.org \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# 2. Ensure the deployer account is funded with real XLM
stellar keys fund deployer --network mainnet

# 3. Deploy the audited WASM binary
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm \
  --network mainnet \
  --source deployer

# 4. Initialize with production parameters
stellar contract invoke \
  --id $MAINNET_CONTRACT_ID \
  --network mainnet \
  --source deployer \
  -- \
  initialize \
  --admin <MULTISIG_ADMIN_ADDRESS> \
  --token <MAINNET_TOKEN_SAC_ADDRESS> \
  --denomination Xlm100 \
  --vk '<AUDITED_VERIFYING_KEY_JSON>'
```

### 7.4 Post-Deployment Verification

After deploying to mainnet:

1. **Verify contract configuration** -- Call `get_config_view` and confirm all parameters are correct
2. **Verify deposit count is 0** -- Call `deposit_count` to confirm a fresh state
3. **Perform a small test deposit** -- Deposit the minimum denomination and verify the Merkle root updates
4. **Perform a test withdrawal** -- Withdraw the test deposit using a valid proof
5. **Monitor events** -- Watch for `DepositEvent` and `WithdrawEvent` to confirm correct operation
6. **Verify nullifier tracking** -- Confirm the test withdrawal nullifier is marked as spent
7. **Test pause mechanism** -- Pause, attempt a deposit (should fail), then unpause

---

## 8. Troubleshooting

### Common Errors

| Error | Code | Cause | Solution |
|-------|------|-------|----------|
| `AlreadyInitialized` | 1 | `initialize` called twice | The contract can only be initialized once. Deploy a new instance if you need different parameters. |
| `NotInitialized` | 2 | Operating before `initialize` | Call `initialize` with correct parameters first. |
| `UnauthorizedAdmin` | 10 | Non-admin calling admin functions | Use the admin account specified during initialization. |
| `PoolPaused` | 20 | Deposit/withdraw while paused | Admin must call `unpause` first. |
| `TreeFull` | 21 | Merkle tree full (1,048,576 deposits) | Deploy a new pool instance. The tree supports 2^20 leaves. |
| `ZeroCommitment` | 31 | Commitment is all zeros | Generate a valid commitment using `Poseidon2(nullifier, secret)`. |
| `UnknownRoot` | 40 | Stale Merkle root in proof | The root history keeps 30 recent roots. Regenerate the proof with a current root. |
| `NullifierAlreadySpent` | 41 | Double-spend attempt | Each note can only be withdrawn once. |
| `InvalidProof` | 42 | Groth16 verification failed | Check that the proof matches the verifying key and public inputs are correct. |
| `FeeExceedsAmount` | 43 | Relayer fee > denomination | Reduce the relayer fee. |
| `NoVerifyingKey` | 50 | VK not set | Call `initialize` or `set_verifying_key` with a valid key. |

### Debug Commands

```bash
# Check if the contract is deployed
stellar contract info \
  --id $CONTRACT_ID \
  --network testnet

# View the pool configuration
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  get_config_view

# Check if a specific root is known
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  is_known_root \
  --root 0x<ROOT_HEX>

# Check if a nullifier has been spent
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  --source deployer \
  -- \
  is_spent \
  --nullifier_hash 0x<NULLIFIER_HASH_HEX>
```

### Build Failures

**WASM target not installed:**

```
error[E0463]: can't find crate for `std`
```

Fix: `rustup target add wasm32-unknown-unknown`

**Soroban SDK version mismatch:**

```
error: failed to select a version for `soroban-sdk`
```

Fix: Ensure your Rust toolchain and `stellar-cli` are up to date:

```bash
rustup update
cargo install --locked stellar-cli
```

**Noir compilation errors:**

```
error: cannot find 'lib' in scope
```

Fix: Ensure you are running `nargo build` from within the correct circuit directory (e.g., `circuits/commitment/`), not from the workspace root.

### Support Resources

- [Stellar Developer Docs](https://developers.stellar.org/)
- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Noir Language Documentation](https://noir-lang.org/docs)
- [PrivacyLayer GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- [Stellar Discord](https://discord.gg/stellar) -- `#soroban` channel

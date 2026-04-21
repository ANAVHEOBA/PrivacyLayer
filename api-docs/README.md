# 🔐 PrivacyLayer API Documentation

Complete API documentation for the PrivacyLayer ZK shielded pool on Stellar Soroban.

---

## 📚 Contents

| Document | Description |
|----------|-------------|
| [OpenAPI Spec](openapi.yaml) | Full REST API specification (OpenAPI 3.0) |
| [Contract ABI](contract-abi.json) | Soroban contract function definitions |
| [Examples](examples/) | JavaScript code examples |
| [Postman Collection](postman/) | Import into Postman for testing |

---

## 🚀 Quick Start

### 1. View Interactive Docs

Open `openapi.yaml` in Swagger UI:

```bash
# Option 1: Use Swagger Editor online
# Visit: https://editor.swagger.io/
# Paste openapi.yaml content

# Option 2: Run locally with docker
docker run -p 8080:8080 -e SWAGGER_JSON=/api/openapi.yaml \
  -v $(pwd):/api swaggerapi/swagger-ui
```

### 2. Import Postman Collection

1. Open Postman
2. Click **Import**
3. Select `postman/PrivacyLayer.postman_collection.json`
4. Set environment variables:
   - `rpc_url`: `https://soroban-test.stellar.org`
   - `contract_id`: Your deployed contract address
   - `admin_key`: Admin secret key
   - `user_key`: User secret key

### 3. Run Examples

```bash
# Install dependencies
npm install @stellar/stellar-sdk @privacylayer/sdk

# Run deposit example
node examples/deposit.js

# Run withdraw example
node examples/withdraw.js

# Run query examples
node examples/query.js
```

---

## 📖 API Overview

### Core Operations

| Function | Description | Access |
|----------|-------------|--------|
| `initialize` | Initialize privacy pool | Public (one-time) |
| `deposit` | Deposit to shielded pool | Public |
| `withdraw` | Withdraw with ZK proof | Public |

### View Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `get_root` | Current Merkle root | `BytesN<32>` |
| `deposit_count` | Total deposits | `u32` |
| `is_known_root` | Check root validity | `bool` |
| `is_spent` | Check nullifier spent | `bool` |
| `get_config_view` | Pool configuration | `PoolConfig` |

### Admin Functions

| Function | Description | Access |
|----------|-------------|--------|
| `pause` | Pause pool | Admin only |
| `unpause` | Resume pool | Admin only |
| `set_verifying_key` | Update VK | Admin only |

---

## 🔧 Contract Details

**Contract Address:** `CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE` (Testnet)

**Network:** Stellar Soroban Testnet

**RPC URL:** `https://soroban-test.stellar.org`

**Denominations:**
- XLM_10 (10 XLM)
- XLM_100 (100 XLM)
- USDC_10 (10 USDC)
- USDC_100 (100 USDC)

---

## 🔐 Privacy Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  SDK (ZK)    │────▶│  Contract   │
│             │     │              │     │             │
│ 1. Generate │     │ 2. Compute   │     │ 3. Store    │
│    note     │     │  commitment │     │  commitment │
│             │     │              │     │             │
│ 4. Save     │◀────│ 5. Receive   │◀────│ 6. Insert   │
│    note     │     │  leaf index │     │  to tree    │
└─────────────┘     └──────────────┘     └─────────────┘

        Withdrawal (later)
        
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  SDK (ZK)    │────▶│  Contract   │
│             │     │              │     │             │
│ 1. Load     │     │ 2. Sync      │     │ 3. Verify   │
│    note     │     │  Merkle tree │     │  ZK proof   │
│             │     │              │     │             │
│ 4. Receive  │◀────│ 5. Submit    │◀────│ 6. Transfer │
│    funds    │     │  withdraw    │     │  funds      │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## 📝 Code Examples

### Deposit

```javascript
const { nullifier, secret } = generateNote();
const commitment = poseidonHash(nullifier, secret);
const { leafIndex } = await contract.deposit(from, commitment);

// Save note securely!
const note = { nullifier, secret, leafIndex };
```

### Withdraw

```javascript
const merkleTree = await syncMerkleTree(contractId);
const merkleProof = generateMerkleProof(merkleTree, note.leafIndex);
const { proof, publicInputs } = await generateZKProof({
  note, merkleProof, recipient
});
await contract.withdraw(proof, publicInputs);
```

### Query

```javascript
const root = await contract.getRoot();
const count = await contract.depositCount();
const isValid = await contract.isKnownRoot(root);
const isSpent = await contract.isSpent(nullifierHash);
```

---

## 🔗 Resources

- [GitHub Repository](https://github.com/ANAVHEOBA/PrivacyLayer)
- [Stellar Docs](https://developers.stellar.org)
- [Soroban Docs](https://soroban.stellar.org)
- [Noir ZK Language](https://noir-lang.org)

---

## 📄 License

MIT — see [LICENSE](../../LICENSE)

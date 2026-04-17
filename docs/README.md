# PrivacyLayer API Documentation

This directory contains comprehensive API documentation for the PrivacyLayer privacy pool smart contract.

## Files

- **`openapi.yaml`** - OpenAPI 3.0 specification for all contract methods
- **`postman_collection.json`** - Postman collection for testing the API
- **`examples/`** - Code examples in multiple languages

## OpenAPI Specification

The `openapi.yaml` file documents all public methods of the PrivacyPool Soroban contract:

### Initialization
- `POST /initialize` - Initialize the privacy pool

### Core Operations
- `POST /deposit` - Deposit into the shielded pool
- `POST /withdraw` - Withdraw using a ZK proof

### View Functions
- `GET /get_root` - Get current Merkle root
- `GET /deposit_count` - Get total deposits
- `GET /is_known_root` - Check if root is valid
- `GET /is_spent` - Check if nullifier is spent
- `GET /get_config` - Get pool configuration

### Admin Functions
- `POST /pause` - Pause the pool (admin only)
- `POST /unpause` - Unpause the pool (admin only)
- `POST /set_verifying_key` - Update verifying key (admin only)

## Viewing the Documentation

### Option 1: Swagger UI (Recommended)

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`.

### Option 2: Redoc

```bash
npm install -g redoc-cli
redoc-cli serve openapi.yaml
```

Then open http://localhost:8080

### Option 3: Local Swagger UI

```bash
docker run -p 8080:8080 -e SWAGGER_JSON=/docs/openapi.yaml -v $(pwd):/docs swaggerapi/swagger-ui
```

Then open http://localhost:8080

## Postman Collection

Import `postman_collection.json` into Postman to test the API endpoints.

### Setup

1. Open Postman
2. Click **Import** → **Upload Files**
3. Select `postman_collection.json`
4. Configure environment variables:
   - `CONTRACT_ADDRESS` - Your deployed contract address
   - `ADMIN_ADDRESS` - Admin Stellar address
   - `USER_ADDRESS` - User Stellar address

## Code Examples

See the `examples/` directory for integration examples:

- **TypeScript/JavaScript** - Using Stellar SDK
- **Python** - Using stellar-sdk
- **Rust** - Using soroban-sdk
- **cURL** - Raw HTTP requests

## Contract ABI

The contract ABI is automatically generated from the Rust source code:

```bash
cd contracts/privacy_pool
cargo build --target wasm32-unknown-unknown --release
stellar contract bindings typescript --wasm target/wasm32-unknown-unknown/release/privacy_pool.wasm --output-dir ../../sdk/src/bindings
```

## Interactive API Testing

### Using Stellar CLI

```bash
# Get current root
stellar contract invoke \
  --id CONTRACT_ID \
  --source-account ACCOUNT \
  --network testnet \
  -- get_root

# Check deposit count
stellar contract invoke \
  --id CONTRACT_ID \
  --source-account ACCOUNT \
  --network testnet \
  -- deposit_count
```

## API Versioning

The API follows semantic versioning:
- **Major version** - Breaking changes to contract interface
- **Minor version** - New features, backward compatible
- **Patch version** - Bug fixes

Current version: **1.0.0**

## Security Considerations

⚠️ **IMPORTANT**: This contract is unaudited. Do not use in production.

### Authentication

All state-changing operations require:
1. Valid Stellar transaction signature
2. Sufficient XLM for transaction fees
3. Token approval for deposit operations

### Rate Limiting

Consider implementing rate limiting at the relayer level to prevent:
- Spam deposits
- DoS attacks on the Merkle tree
- Excessive gas consumption

### Privacy Notes

- Fixed denominations prevent amount-based correlation
- Merkle tree depth of 20 supports up to 1,048,576 deposits
- Historical root buffer prevents front-running attacks
- Nullifier tracking prevents double-spending

## Support

- **Issues**: https://github.com/ANAVHEOBA/PrivacyLayer/issues
- **Discussions**: https://github.com/ANAVHEOBA/PrivacyLayer/discussions
- **Documentation**: https://github.com/ANAVHEOBA/PrivacyLayer/tree/main/docs

## License

MIT - see [LICENSE](../LICENSE)

# PrivacyLayer FAQ

## General Questions

### What is PrivacyLayer?
PrivacyLayer is the first ZK-proof shielded pool implementation on Stellar Soroban, enabling compliance-forward private transactions using zero-knowledge proofs.

### How does PrivacyLayer work?
Users deposit fixed-denomination assets (XLM or USDC) into a shielded pool and can withdraw them to any address using zero-knowledge proofs, with no on-chain link between deposits and withdrawals.

### What makes PrivacyLayer unique?
PrivacyLayer leverages Stellar Protocol 25's native BN254 elliptic curve and Poseidon hash function cryptographic primitives, eliminating external dependencies and optimizing performance.

## Technical Questions

### What cryptographic primitives does PrivacyLayer use?
PrivacyLayer uses:
- **BN254 elliptic curve**: For efficient Groth16 proof verification
- **Poseidon hash function**: For commitment generation (ZK-friendly)
- **Groth16 proof system**: For zero-knowledge proofs
- **Incremental Merkle trees**: For efficient membership proofs (depth=20)

### Is PrivacyLayer secure?
PrivacyLayer uses battle-tested cryptographic algorithms (BN254 and Poseidon) with native protocol integration. However, the implementation requires formal security audits before production use.

### How does withdrawal work?
1. Prove membership of a commitment in the Merkle tree
2. Generate a Groth16 proof using BN254
3. Submit proof for on-chain verification
4. Receive funds at withdrawal address

### What assets are supported?
Currently supports XLM and USDC in fixed denominations. Additional asset support can be added through contract upgrades.

### What are fixed denominations?
Fixed denominations ensure all deposits have the same value, simplifying the ZK proof system and preventing value leakage through proofs.

## Development Questions

### What skills are needed to contribute?
- Rust (for Soroban contracts)
- Noir (for ZK circuits)
- TypeScript (for SDK development)
- Understanding of ZK cryptography

### How do I get started with development?
See the [Getting Started](#getting-started) section in the main README for setup instructions.

### What tools are required?
- Rust and cargo for contract development
- Noir and nargo for circuit development
- Stellar CLI for contract deployment
- TypeScript/Node.js for SDK development

### Can I contribute without deep ZK knowledge?
Yes! Contributions include documentation, testing, UI development, SDK improvements, and educational content.

## Usage Questions

### How do I make a deposit?
1. Generate a note with nullifier and secret
2. Create commitment using Poseidon hash
3. Call the deposit contract function with the commitment
4. Assets are transferred to the shielded pool

### How do I make a withdrawal?
1. Generate a withdrawal proof using your note
2. Submit proof to the withdrawal contract function
3. Receive funds at specified withdrawal address

### What happens if I lose my note?
Notes contain the secret required for withdrawal. Losing a note means losing access to the deposited funds. Always backup notes securely.

### Is there a maximum deposit amount?
The system uses fixed denominations, so each deposit must match predefined amounts. Multiple deposits can be made for larger amounts.

### How long does proof generation take?
Proof generation time depends on hardware but typically ranges from seconds to minutes. Verification is fast thanks to native BN254 operations.

## Compliance Questions

### How is PrivacyLayer compliance-forward?
PrivacyLayer maintains auditability through cryptographic proofs while providing transaction privacy. Organizations can verify compliance without exposing transaction details.

### Can transactions be audited?
Yes, zero-knowledge proofs can be verified to ensure compliance while keeping transaction details private.

### Does PrivacyLayer support regulatory requirements?
The system is designed to support selective disclosure and audit capabilities required by regulations.

### How does PrivacyLayer prevent illicit activities?
The shielded pool design prevents tracking but maintains cryptographic proofs for compliance verification.

## Performance Questions

### How efficient are the ZK proofs?
PrivacyLayer is optimized for Stellar Protocol 25's native cryptographic primitives, making it more efficient than implementations requiring external libraries.

### What is the gas cost for operations?
Gas costs are minimized through:
- Native BN254 operations (no WASM overhead)
- Efficient Poseidon hash function
- Optimized circuit design

### How fast are deposits/withdrawals?
Deposits are standard Soroban transactions. Withdrawals require proof generation (off-chain) and verification (on-chain).

### What is the Merkle tree depth?
The Merkle tree has depth 20, supporting up to 2^20 (1,048,576) commitments.

## Comparison Questions

### How does PrivacyLayer compare to other privacy solutions?
PrivacyLayer differs by:
- Using Stellar Protocol 25 native primitives
- Designed for compliance-forward applications
- Optimized for Soroban smart contracts
- No external cryptographic dependencies

### What advantages does PrivacyLayer have over traditional approaches?
- Protocol-native cryptographic operations
- No external library dependencies
- Compliance-focused design
- Efficient proof verification

### How does it compare to Penumbra and Aztec?
PrivacyLayer draws inspiration from these systems but is specifically designed for Stellar/Soroban with native protocol integration.

## Future Questions

### What features are planned?
- Additional asset support
- Enhanced compliance features
- SDK improvements
- Frontend interface development
- Cross-chain capabilities

### How can I get involved?
- Submit issues or feature requests on GitHub
- Contribute code, documentation, or tests
- Create educational content
- Participate in bounty programs

### Where can I find more information?
- [PrivacyLayer GitHub Repository](https://github.com/ANAVHEOBA/PrivacyLayer)
- [Stellar Protocol 25 Documentation](https://stellar.org/protocol-25)
- [Noir Language Documentation](https://noir-lang.org/docs)
- [Soroban Documentation](https://soroban.stellar.org)

## Getting Started

### Prerequisites Installation
```bash
# Rust (for Soroban contracts)
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Noir (for ZK circuits)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup
```

### Building Circuits
```bash
cd circuits/commitment
nargo build
nargo test

cd ../withdraw
nargo build
nargo test
```

### Building Contracts
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### Testing
```bash
# Run all tests
cargo test --all-features

# Integration tests
cargo test --test integration_test
```

## Troubleshooting

### Common Issues

**Circuit Build Failures**
- Ensure Noir is properly installed
- Check circuit parameters match specification
- Verify input/output constraints

**Contract Build Failures**
- Ensure Rust and Soroban SDK are updated
- Check WASM target availability
- Verify BN254/Poseidon host function usage

**Proof Generation Issues**
- Verify note generation parameters
- Check Merkle tree state synchronization
- Ensure correct nullifier/secret usage

**Verification Failures**
- Check proof parameters match contract expectations
- Verify BN254 pairing inputs
- Ensure contract state matches circuit state

### Getting Help
- Check GitHub Issues for known problems
- Review documentation and examples
- Join community discussions
- Contact maintainers for technical support

---

**Note**: This FAQ is continuously updated. Check the GitHub repository for the latest information.
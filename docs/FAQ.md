# PrivacyLayer FAQ

> Frequently Asked Questions about PrivacyLayer — the first ZK-proof shielded pool on Stellar Soroban.

## General

### What is PrivacyLayer?

PrivacyLayer is a **compliance-forward private transaction system** built on Stellar Soroban (Protocol 25). It enables users to deposit fixed-denomination XLM or USDC into a shielded pool and withdraw to any address using zero-knowledge proofs — with no on-chain link between deposit and withdrawal.

### How is PrivacyLayer different from Tornado Cash on Ethereum?

PrivacyLayer is inspired by Tornado Cash but **adapted natively for Stellar/Soroban**:

- Uses **Soroban's native BN254** elliptic curve operations (no external libraries)
- Uses **Poseidon / Poseidon2** hash functions as native Soroban host functions
- Built with **Noir** (the same ZK language used by Aztec Network)
- Integrates with **Stellar's existing account model** and Soroban smart contracts

### What cryptographic primitives does Stellar Protocol 25 provide?

Stellar Protocol 25 (X-Ray, January 2026) introduced:

- ✅ **BN254 elliptic curve** operations (`G1`/`G2` add, scalar multiplication, pairing)
- ✅ **Poseidon / Poseidon2** hash functions as native host functions
- ✅ Both are **native Soroban host functions** — no external library dependencies

### What is a shielded pool?

A shielded pool is a smart contract that accepts deposits of fixed denominations, records commitments (hashes of secrets) in a Merkle tree, and allows withdrawals by proving knowledge of a commitment without revealing which deposit it corresponds to — breaking the on-chain link between deposit and withdrawal addresses.

---

## Security & Privacy

### How private are transactions on PrivacyLayer?

When used correctly, PrivacyLayer provides **strong privacy guarantees**:

- No on-chain link between deposit address and withdrawal address
- Zero-knowledge proofs (Groth16 via Noir) verify withdrawal validity without revealing the deposit secret
- The Merkle tree stores commitments (Poseidon hashes), not plaintext deposits
- Nullifiers prevent double-spending without revealing the note

### What are the privacy limitations?

Privacy is **not guaranteed** in the following scenarios:

- Deposits and withdrawals from/to **exchanges** (KYC-linked accounts) can break privacy
- **Timing analysis** — withdrawals immediately after deposits may be correlatable
- **Bridge activity** — interacting with bridges before or after may leak identity
- **IP address** leaks (use Tor or VPN)

### Can the operator see transaction details?

The smart contract stores **commitments** (Poseidon hashes), not plaintext secrets. The operator:

- ✅ Can verify proofs are valid (via BN254 pairing checks)
- ✅ Can see the Merkle tree state (commitments inserted)
- ❌ Cannot determine which deposit corresponds to which withdrawal
- ❌ Cannot steal funds without the corresponding note

---

## Technical

### What are the fixed deposit denominations?

Currently supported denominations (configurable):

| Asset | Denomination |
|-------|-------------|
| XLM | 10 XLM |
| USDC | 10 USDC |

### How does the ZK proof system work?

PrivacyLayer uses a **Groth16** proof system with Noir circuits:

1. **Deposit**: User generates a note `(nullifier, secret)` locally, computes `commitment = Poseidon(nullifier || secret)`, and submits to the contract
2. **Merkle Insert**: Contract inserts the commitment into its on-chain Merkle tree
3. **Withdraw**: User generates a ZK proof proving:
   - Knowledge of `(nullifier, secret)` such that `Poseidon(nullifier || secret)` is in the Merkle tree
   - The nullifier has not been spent
4. **Verify**: The Soroban contract verifies the Groth16 proof via `bn254_pairing` host function

### What Noir circuits are used?

| Circuit | Purpose |
|---------|---------|
| `commitment` | Commitment generation (Poseidon hash) |
| `withdraw` | Withdrawal proof (Merkle path + nullifier) |
| `merkle` | Merkle tree library (shared) |

### What is the trusted setup requirement?

Groth16 requires a **trusted setup ceremony** per circuit. PrivacyLayer uses:

- Per-circuit proving keys / verification keys
- A ceremony similar to Aztec's Powers of Tau
- Verification keys are stored in the smart contract

---

## Development

### How do I contribute?

See [CONTRIBUTING.md](../CONTRIBUTING.md) for:

- Development environment setup (Node.js 18+, Rust, Nargo)
- Circuit development workflow
- Contract testing and deployment
- Code style and submission guidelines

### What tools are required?

- **Node.js 18+** — for SDK and frontend (planned)
- **Rust** — for Soroban smart contract development
- **Nargo** — Noir circuit compiler (`nargo`)
- **Docker** — for local Soroban environment (Soroban Quickstart)

### How do I run tests?

```bash
# Circuit tests
cd circuits/commitment
nargo test

# Contract tests
cd contracts/privacy_pool
cargo test --target wasm32-unknown-unknown

# Full integration
cd scripts
./test_integration.sh
```

---

## FAQ Schema (JSON-LD)

For search engines, the structured data for this page follows the [FAQPage schema](https://schema.org/FAQPage):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is PrivacyLayer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PrivacyLayer is a compliance-forward private transaction system built on Stellar Soroban (Protocol 25). It enables users to deposit fixed-denomination XLM or USDC into a shielded pool and withdraw to any address using zero-knowledge proofs — with no on-chain link between deposit and withdrawal."
      }
    }
  ]
}
```

---

## Still have questions?

- Open an [issue on GitHub](https://github.com/ANAVHEOBA/PrivacyLayer/issues)
- Read the [Architecture documentation](./ARCHITECTURE.md)
- Read the [Deployment guide](./DEPLOYMENT.md)
- Review the [Security practices](./SECURITY.md)

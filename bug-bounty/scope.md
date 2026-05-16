# 🎯 Bug Bounty Scope

## In-Scope Assets

### 1. Smart Contracts (Soroban)

**Location**: `contracts/privacy_pool/src/`

**Key Files**:
- `contract.rs` - Main contract interface
- `core/deposit.rs` - Deposit operations
- `core/withdraw.rs` - Withdrawal operations (ZK proof verification)
- `core/admin.rs` - Admin functions
- `core/initialize.rs` - Contract initialization
- `crypto/merkle.rs` - Incremental Merkle tree (depth=20)
- `crypto/verifier.rs` - Groth16 verifier (BN254)
- `storage/config.rs` - Configuration storage
- `storage/nullifier.rs` - Nullifier tracking (double-spend prevention)

**Vulnerabilities of Interest**:
- ✅ Logic errors in deposit/withdraw flow
- ✅ Double-spending vulnerabilities
- ✅ Merkle tree manipulation
- ✅ Nullifier collisions or bypass
- ✅ Unauthorized admin functions
- ✅ Pausing bypass
- ✅ Reentrancy attacks
- ✅ Integer overflow/underflow
- ✅ Access control bypass
- ✅ Front-running vulnerabilities
- ✅ Denial of service vectors

**Reward Range**: $500 - $10,000 USDC

---

### 2. ZK Circuits (Noir)

**Location**: `circuits/`

**Key Components**:
- `circuits/commitment/` - Commitment scheme (Poseidon hash)
- `circuits/withdraw/` - Withdrawal proof (Merkle + nullifier)
- `circuits/merkle/` - Merkle tree circuit library
- `circuits/lib/hash/` - Hash functions
- `circuits/lib/merkle/` - Merkle utilities
- `circuits/lib/validation/` - Input validation

**Vulnerabilities of Interest**:
- ✅ Constraint bypass
- ✅ Soundness errors
- ✅ Proof malleability
- ✅ Nullifier collisions
- ✅ Commitment collisions
- ✅ Merkle tree forgery
- ✅ Invalid proof acceptance
- ✅ Input validation bypass
- ✅ Circuit logic errors
- ✅ Under-constrained inputs

**Reward Range**: $500 - $10,000 USDC

---

### 3. Cryptographic Operations

**Location**: `contracts/privacy_pool/src/crypto/` + `circuits/lib/`

**Key Operations**:
- BN254 elliptic curve operations (pairing, scalar multiplication)
- Poseidon / Poseidon2 hash functions
- Groth16 zero-knowledge proofs
- Incremental Merkle trees (depth=20)
- Nullifier generation

**Vulnerabilities of Interest**:
- ✅ Pairing check bypass
- ✅ Hash collisions
- ✅ Curve operation errors
- ✅ Proof verification bypass
- ✅ Random number prediction
- ✅ Side-channel attacks
- ✅ Timing attacks
- ✅ Memory leaks

**Reward Range**: $500 - $10,000 USDC

---

### 4. SDK (TypeScript/JavaScript)

**Location**: `sdk/` (planned)

**Components**:
- Note generation (nullifier, secret, commitment)
- Merkle tree synchronization
- ZK proof generation (WASM)
- Contract interaction
- Key management

**Vulnerabilities of Interest**:
- ✅ Private key leakage
- ✅ Note backup theft
- ✅ Man-in-the-middle attacks
- ✅ WASM injection
- ✅ Input validation bypass
- ✅ State manipulation
- ✅ Race conditions

**Reward Range**: $100 - $5,000 USDC

---

### 5. Frontend (Web Application)

**Location**: `frontend/` (planned)

**Components**:
- Wallet connection
- Deposit UI
- Withdrawal UI
- Transaction history
- Note backup interface

**Vulnerabilities of Interest**:
- ✅ XSS (cross-site scripting)
- ✅ CSRF (cross-site request forgery)
- ✅ Wallet connection hijacking
- ✅ Note backup theft
- ✅ UI manipulation leading to fund loss
- ✅ LocalStorage/sessionStorage theft
- ✅ Injection attacks

**Reward Range**: $100 - $5,000 USDC

---

## Out of Scope

### ❌ Not Eligible

The following are **NOT** eligible for bounties:

1. **Social Engineering**
   - Phishing attacks
   - Impersonation
   - Physical security breaches

2. **DDoS Attacks**
   - Rate limiting issues
   - DoS vectors requiring excessive resources

3. **Third-Party Services**
   - Stellar network issues
   - Soroban runtime bugs (report to Stellar)
   - Noir compiler bugs (report to Aztec)
   - Dependency vulnerabilities (report to maintainers)

4. **Test Environments**
   - Testnet deployments
   - Staging servers
   - Development forks

5. **Non-Security Issues**
   - UI/UX bugs without security impact
   - Performance issues
   - Feature requests
   - Documentation errors

6. **Theoretical Attacks**
   - Attacks requiring unreasonable conditions
   - Attacks with no real-world impact
   - Speculative vulnerabilities

7. **Already Known Issues**
   - Previously reported vulnerabilities
   - Publicly disclosed issues
   - Issues in our GitHub issues

8. **Network-Level Attacks**
   - 51% attacks
   - Chain reorganizations
   - Eclipse attacks

---

## Severity Classification

| Severity | Impact | Examples |
|----------|--------|----------|
| **Critical** | Direct fund theft, complete protocol compromise | - Double-spending bypass<br>- Nullifier collision<br>- Admin key leak |
| **High** | Significant fund loss, major privacy breach | - Withdrawal without valid proof<br>- Merkle tree manipulation<br>- ZK soundness error |
| **Medium** | Limited fund loss, privacy degradation | - Input validation bypass<br>- DoS vector<br>- Partial deanonymization |
| **Low** | Minimal impact, informational | - Gas optimization<br>- Minor UI bugs<br>- Documentation errors |

---

## Testing Guidelines

### ✅ Allowed

- Manual testing with your own accounts
- Using testnet funds only
- Reviewing open-source code
- Fuzzing with reasonable limits

### ❌ Prohibited

- Accessing others' data or funds
- Automated scanning (contact us first)
- Exploiting vulnerabilities beyond proof of concept
- Public disclosure before fix
- Spamming or DDoS

---

## Asset Inventory

| Asset | Network | Address | Status |
|-------|---------|---------|--------|
| Privacy Pool Contract | Stellar Mainnet | TBD | Pending deployment |
| Privacy Pool Contract | Stellar Testnet | Available | Active |
| ZK Circuits | N/A | `circuits/` | Active |
| SDK | N/A | `sdk/` | In development |
| Frontend | N/A | `frontend/` | In development |

---

## Contact for Clarification

If you're unsure whether something is in scope:

- **Email**: security@privacylayer.io
- **GitHub**: Open an issue with `[scope question]` tag

---

**Last Updated**: April 2026  
**Version**: 1.0

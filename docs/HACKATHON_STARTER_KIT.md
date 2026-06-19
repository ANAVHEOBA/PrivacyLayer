# PrivacyLayer Hackathon Starter Kit 🏆

> A comprehensive guide for hackathon participants to build with PrivacyLayer

## Table of Contents
1. [Quick Start](#quick-start)
2. [Boilerplate Code](#boilerplate-code)
3. [Example Projects](#example-projects)
4. [Judging Criteria](#judging-criteria)
5. [Prize Ideas](#prize-ideas)

---

## Quick Start

### Prerequisites

```bash
# Rust (for Soroban contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Noir toolchain (nargo)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
noirup

# Node.js 18+ (for SDK and frontend)
# Use nvm: https://github.com/nvm-sh/nvm
```

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer

# Build circuits
cd circuits/commitment
nargo build
nargo test

# Build contracts
cd ../contracts
cargo build --target wasm32-unknown-unknown --release
```

---

## Boilerplate Code

### Basic Deposit Contract

```rust
// contracts/privacy_pool/src/lib.rs (simplified example)
use soroban_sdk::{contract, contractimpl, Address, Vec};

#[contract]
pub struct PrivacyPool;

#[contractimpl]
impl PrivacyPool {
    /// Initialize the privacy pool
    pub fn init(env: Env, admin: Address) {
        // Set up initial configuration
    }

    /// Deposit funds into the privacy pool
    /// Returns a note (nullifier + secret) that the user must save
    pub fn deposit(env: Env, amount: i128) -> Vec<u8> {
        // Generate nullifier and secret
        // Create commitment
        // Insert into Merkle tree
        // Return note to user
    }

    /// Withdraw funds from the privacy pool
    /// Requires a valid ZK proof
    pub fn withdraw(env: Env, proof: Vec<u8>, recipient: Address) {
        // Verify ZK proof
        // Check nullifier hasn't been used
        // Transfer funds to recipient
    }
}
```

### Basic Noir Circuit

```noir
// circuits/commitment/src/main.nr (simplified example)
use dep::std;

// Hash function using Poseidon
fn hash(left: Field, right: Field) -> Field {
    std::hash::poseidon2([left, right])
}

fn main(nullifier: Field, secret: Field) -> pub Field {
    // Compute commitment = Poseidon(nullifier || secret)
    hash(nullifier, secret)
}
```

### TypeScript SDK Usage

```typescript
import { PrivacyPoolSDK } from '@privacylayer/sdk';

const sdk = new PrivacyPoolSDK({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org'
});

// Deposit
const note = await sdk.deposit({
  amount: 100, // in stroops
  publicKey: 'G...'
});

console.log('Save this note:', note.toString());

// Withdraw
await sdk.withdraw({
  note: savedNote,
  recipient: 'G...'
});
```

---

## Example Projects

### Example 1: Privacy Donation Box

**Description**: Create an anonymous donation system where donors can contribute to a cause without revealing their identity.

**Features**:
- Anonymous deposits
- Privacy-preserving withdrawals by fundraiser
- Donation counter (without revealing donors)

**Difficulty**: ⭐⭐ (Beginner)

**Code Location**: Create in `examples/privacy-donation/`

---

### Example 2: Privacy Escrow

**Description**: Build an escrow service where funds are locked until conditions are met, protecting both buyer and seller.

**Features**:
- Deposit funds into privacy pool
- Release funds upon condition fulfillment
- Dispute resolution mechanism

**Difficulty**: ⭐⭐⭐ (Intermediate)

**Code Location**: Create in `examples/privacy-escrow/`

---

### Example 3: Private Voting System

**Description**: Create a voting system where votes are anonymous but verifiable.

**Features**:
- Register voters (off-chain)
- Cast anonymous votes via deposit/withdraw
- Tally results without revealing individual votes

**Difficulty**: ⭐⭐⭐⭐ (Advanced)

**Code Location**: Create in `examples/privacy-voting/`

---

### Example 4: Confidential Tip Jar

**Description**: A simple tipping system where users can tip content creators anonymously.

**Features**:
- Quick deposit/withdraw
- Support multiple recipients
- Transaction history (private to user)

**Difficulty**: ⭐ (Easy)

**Code Location**: Create in `examples/tip-jar/`

---

### Example 5: Privacy Gaming Wallet

**Description**: Gaming wallet with hidden balances and anonymous transfers.

**Features**:
- Hide wallet balance
- Anonymous transfers between players
- Gaming-specific features (betting, rewards)

**Difficulty**: ⭐⭐⭐⭐⭐ (Expert)

**Code Location**: Create in `examples/gaming-wallet/`

---

## Judging Criteria

### Technical Implementation (30%)

| Criteria | Description | Points |
|----------|-------------|--------|
| Code Quality | Clean, well-structured, documented code | 10 |
| Security | Proper handling of cryptographic operations | 10 |
| Innovation | Novel approaches to privacy solutions | 10 |

### Functionality (30%)

| Criteria | Description | Points |
|----------|-------------|--------|
| Completeness | All intended features working | 15 |
| User Experience | Easy to use, good UI/UX | 10 |
| Error Handling | Graceful handling of edge cases | 5 |

### Presentation (20%)

| Criteria | Description | Points |
|----------|-------------|--------|
| Demo Quality | Clear, working demonstration | 10 |
| Documentation | README, setup instructions, usage guide | 10 |

### Impact (20%)

| Criteria | Description | Points |
|----------|-------------|--------|
| Usefulness | Real-world applicability | 10 |
| Creativity | Unique approach to privacy on Stellar | 10 |

---

## Prize Ideas

### 🥇 First Place ($500)
- **Best Overall Privacy Application**
- Criteria: Most complete, innovative, and well-presented project

### 🥈 Second Place ($300)
- **Best Technical Implementation**
- Criteria: Best code quality, security, and architecture

### 🥉 Third Place ($200)
- **Best Beginner Project**
- Criteria: Best project by team with less than 3 months experience

### 🎖️ Special Prizes

| Prize | Amount | Criteria |
|-------|--------|----------|
| Security Champion | $150 | Best security practices and audit-ready code |
| Community Choice | $100 | Most voted by participants |
| Innovation Award | $150 | Most creative use of zero-knowledge proofs |
| Quickest Start | $50 | First team to get deposit/withdraw working |

---

## Resources

### Documentation
- [PrivacyLayer README](../README.md)
- [Introduction to PrivacyLayer](./introduction-to-privacy-layer.md)
- [Understanding BN254 and Poseidon](./understanding-bn254-poseidon.md)
- [FAQ](./FAQ.md)

### Tools
- [Noir Documentation](https://noir-lang.org/docs)
- [Soroban SDK Docs](https://docs.rs/soroban-sdk)
- [Stellar SDK](https://developers.stellar.org/docs)

### Community
- Discord: Join our community for help
- GitHub Issues: Ask questions on our issue tracker

---

## Getting Help

1. **Check Documentation**: Start with README.md and docs/
2. **Search Issues**: Your question might already be answered
3. **Ask in Discord**: Community and mentors are here to help
4. **Office Hours**: Check schedule for live Q&A sessions

---

**Good luck and happy building!** 🏗️🔐

*This Hackathon Starter Kit was created for PrivacyLayer Hackathon participants.*

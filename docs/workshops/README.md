# PrivacyLayer Developer Workshops

Comprehensive workshop curriculum for building privacy-preserving applications with PrivacyLayer.

---

## Workshop Series Overview

| Workshop | Title | Duration | Level |
|----------|-------|----------|-------|
| 1 | Introduction to Privacy-Preserving Development | 2 hours | Beginner |
| 2 | Building with PrivacyLayer SDK | 3 hours | Intermediate |
| 3 | Advanced ZK Circuit Development | 3 hours | Advanced |

---

## Workshop 1: Introduction to Privacy-Preserving Development

### Duration: 2 hours
### Level: Beginner
### Prerequisites: Basic programming knowledge

### Learning Objectives
By the end of this workshop, participants will be able to:
- Understand the importance of privacy in Web3
- Explain how zero-knowledge proofs work
- Set up a basic PrivacyLayer development environment
- Create their first private transaction

### Curriculum

#### Part 1: Why Privacy Matters (30 minutes)

**Slides:**
1. The Privacy Problem in Public Blockchains
   - Transaction transparency
   - Real-world privacy risks
   - Case studies: Privacy failures

2. Privacy vs. Anonymity
   - Definitions and differences
   - Regulatory landscape
   - Privacy as a feature

3. Zero-Knowledge Proofs Introduction
   - The magic cave analogy
   - Properties: Completeness, Soundness, Zero-Knowledge
   - Real-world applications

**Interactive Element:** Privacy Quiz
- Participants answer questions about privacy scenarios
- Real-time polling and discussion

#### Part 2: PrivacyLayer Architecture (30 minutes)

**Slides:**
1. System Overview
   - Components: Smart contracts, SDK, dApp
   - Transaction flow
   - Security model

2. Core Concepts
   - Privacy pools
   - Commitments and nullifiers
   - Merkle trees

3. Stellar Integration
   - Soroban smart contracts
   - Freighter wallet
   - Transaction fees

**Live Demo:**
- Walk through a deposit/withdrawal on testnet
- Show transaction on Stellar Expert

#### Part 3: Hands-on Setup (45 minutes)

**Exercise 1: Environment Setup**
```bash
# Install dependencies
npm install @privacylayer/sdk

# Clone workshop repository
git clone https://github.com/PrivacyLayer/workshop-starter

# Install Freighter wallet extension
# https://freighter.app
```

**Exercise 2: First Deposit**
```typescript
import { PrivacyLayer } from '@privacylayer/sdk';

// Initialize client
const client = new PrivacyLayer({
  network: 'testnet',
  wallet: freighterWallet
});

// Connect wallet
await client.connect();

// Deposit funds
const note = await client.deposit({
  amount: '10', // XLM
  asset: 'XLM'
});

console.log('Deposit note:', note);
// IMPORTANT: Save this note securely!
```

**Exercise 3: First Withdrawal**
```typescript
// Withdraw using your saved note
const tx = await client.withdraw({
  note: savedNote,
  recipientAddress: 'G...', // Fresh address
});

console.log('Withdrawal complete:', tx.hash);
```

#### Part 4: Q&A and Wrap-up (15 minutes)

- Review key concepts
- Answer questions
- Homework assignment: Complete a private transaction

### Materials Provided
- Slide deck (PDF and Google Slides)
- Code repository with exercises
- Cheat sheet for common commands
- Recording (posted after workshop)

---

## Workshop 2: Building with PrivacyLayer SDK

### Duration: 3 hours
### Level: Intermediate
### Prerequisites: Workshop 1 or equivalent knowledge, JavaScript/TypeScript proficiency

### Learning Objectives
- Build a complete privacy-enabled application
- Handle deposits, withdrawals, and balance queries
- Implement proper security practices
- Integrate PrivacyLayer into existing applications

### Curriculum

#### Part 1: SDK Deep Dive (45 minutes)

**Topics:**
1. SDK Architecture
   - Module structure
   - Configuration options
   - Error handling

2. Core Methods
   - `deposit()` - Add funds to pool
   - `withdraw()` - Private withdrawal
   - `getBalance()` - Check privacy balance
   - `getAnonymitySet()` - View pool statistics

3. Event Handling
   - Transaction events
   - Pool updates
   - Error events

**Code Example:**
```typescript
// Full SDK initialization
import { PrivacyLayer, WalletType } from '@privacylayer/sdk';

const client = new PrivacyLayer({
  network: 'mainnet',
  wallet: {
    type: WalletType.Freighter,
  },
  options: {
    pollingInterval: 5000,
    maxRetries: 3,
  }
});

// Event listeners
client.on('deposit:confirmed', (event) => {
  console.log('Deposit confirmed:', event);
});

client.on('withdrawal:complete', (event) => {
  console.log('Withdrawal complete:', event);
});

await client.connect();
```

#### Part 2: Building a Privacy-Enabled DApp (90 minutes)

**Project: Private Payment Gateway**

**Step 1: Project Setup (15 minutes)**
```bash
# Create Next.js project
npx create-next-app private-payments

# Install dependencies
npm install @privacylayer/sdk stellar-sdk @stellar/freighter-api
```

**Step 2: SDK Integration (30 minutes)**
```typescript
// lib/privacy.ts
import { PrivacyLayer } from '@privacylayer/sdk';

export const createClient = async () => {
  const client = new PrivacyLayer({
    network: process.env.NEXT_PUBLIC_NETWORK as 'testnet' | 'mainnet',
    wallet: { type: 'freighter' }
  });
  
  await client.connect();
  return client;
};
```

**Step 3: Deposit Component (20 minutes)**
```tsx
// components/DepositForm.tsx
import { useState } from 'react';
import { usePrivacyClient } from '../hooks/usePrivacyClient';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const client = usePrivacyClient();

  const handleDeposit = async () => {
    const result = await client.deposit({
      amount,
      asset: 'XLM'
    });
    setNote(result.note);
    alert('Save this note securely!');
  };

  return (
    <div className="deposit-form">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in XLM"
      />
      <button onClick={handleDeposit}>Deposit</button>
      {note && (
        <div className="warning">
          Save this note: {note}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Withdrawal Component (25 minutes)**
```tsx
// components/WithdrawForm.tsx
import { useState } from 'react';
import { usePrivacyClient } from '../hooks/usePrivacyClient';

export function WithdrawForm() {
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState('');
  const client = usePrivacyClient();

  const handleWithdraw = async () => {
    try {
      const tx = await client.withdraw({
        note,
        recipientAddress: recipient
      });
      alert(`Withdrawal complete: ${tx.hash}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="withdraw-form">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Your deposit note"
      />
      <input
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
      />
      <button onClick={handleWithdraw}>Withdraw</button>
    </div>
  );
}
```

#### Part 3: Security Best Practices (30 minutes)

**Topics:**
1. Key Management
   - Secure note storage
   - Hardware wallet integration
   - Backup strategies

2. Operational Security
   - IP protection
   - Timing attacks
   - Address hygiene

3. Smart Contract Security
   - Verification of contract addresses
   - Understanding permissions
   - Audit considerations

**Checklist:**
```markdown
## Security Checklist for Production Apps

### Key Management
- [ ] Implement secure note storage (encrypted)
- [ ] Add hardware wallet support
- [ ] Create backup/recovery flow

### Operational Security
- [ ] Integrate Tor/VPN options
- [ ] Add random delays for withdrawals
- [ ] Generate fresh addresses automatically

### Contract Security
- [ ] Verify contract addresses on load
- [ ] Implement signature verification
- [ ] Add transaction simulation before signing
```

#### Part 4: Testing and Deployment (15 minutes)

**Testing Strategy:**
```typescript
// __tests__/privacy.test.ts
import { PrivacyLayer } from '@privacylayer/sdk';
import { mockWallet } from './mocks/wallet';

describe('PrivacyLayer Client', () => {
  it('should deposit successfully', async () => {
    const client = new PrivacyLayer({
      network: 'testnet',
      wallet: mockWallet
    });
    
    const result = await client.deposit({ amount: '10', asset: 'XLM' });
    expect(result.note).toBeDefined();
    expect(result.txHash).toBeDefined();
  });
});
```

### Materials Provided
- Complete project template
- Exercise solutions
- Security checklist
- Deployment guide

---

## Workshop 3: Advanced ZK Circuit Development

### Duration: 3 hours
### Level: Advanced
### Prerequisites: Workshop 2, understanding of ZK proofs, Rust/Noir familiarity

### Learning Objectives
- Understand PrivacyLayer's circuit architecture
- Write custom Noir circuits
- Integrate circuits with Soroban contracts
- Debug and optimize circuit performance

### Curriculum

#### Part 1: Circuit Architecture (45 minutes)

**Topics:**
1. Noir Language Overview
   - Syntax and types
   - Built-in functions
   - Constraint system

2. PrivacyLayer Circuits
   - Commitment circuit
   - Withdrawal circuit
   - Merkle proof verification

3. Circuit Compilation
   - Proving keys
   - Verification keys
   - Trusted setup considerations

**Code Walkthrough:**
```noir
// circuits/commitment.nr
use dep std;

fn main(
    secret: Field,
    amount: Field,
    nullifier: Field
) -> pub Field {
    // Compute commitment
    let commitment = std::hash::pedersen([secret, amount]);
    
    // Compute nullifier hash
    let nullifier_hash = std::hash::pedersen([nullifier]);
    
    // Return both
    commitment
}
```

#### Part 2: Writing Custom Circuits (60 minutes)

**Exercise: Private Transfer Circuit**

```noir
// circuits/private_transfer.nr
use dep std;

struct PrivateTransfer {
    sender_secret: Field,
    recipient_public: Field,
    amount: Field,
    nullifier: Field,
}

fn main(
    transfer: PrivateTransfer,
    merkle_root: Field,
    merkle_proof: [Field; 32],
    merkle_index: Field
) -> pub Field {
    // 1. Verify sender's commitment exists in tree
    let sender_commitment = std::hash::pedersen([
        transfer.sender_secret,
        transfer.amount
    ]);
    
    // Verify Merkle proof
    let computed_root = std::merkle::verify(
        merkle_proof,
        merkle_index,
        sender_commitment
    );
    assert(computed_root == merkle_root);
    
    // 2. Create recipient commitment
    let recipient_commitment = std::hash::pedersen([
        transfer.recipient_public,
        transfer.amount
    ]);
    
    // 3. Emit nullifier to prevent double-spend
    let nullifier_hash = std::hash::pedersen([transfer.nullifier]);
    
    recipient_commitment
}
```

#### Part 3: Integration with Soroban (45 minutes)

**Contract Integration:**
```rust
// contracts/src/privacy_pool.rs
use soroban_sdk::{Env, Symbol, Address};

pub struct PrivacyPool;

#[contractimpl]
impl PrivacyPool {
    pub fn verify_withdrawal(
        env: Env,
        proof: Vec<u8>,
        nullifier: Symbol,
        recipient: Address
    ) -> bool {
        // Verify ZK proof
        let verified = verify_groth16_proof(&env, &proof);
        
        if verified {
            // Check nullifier hasn't been used
            assert!(!env.storage().has(&nullifier), "Already withdrawn");
            
            // Mark nullifier as used
            env.storage().set(&nullifier, &true);
            
            // Transfer funds
            // ... transfer logic
        }
        
        verified
    }
}
```

#### Part 4: Debugging and Optimization (30 minutes)

**Common Issues:**
1. Constraint count too high
2. Proof generation timeout
3. Verification gas costs

**Optimization Techniques:**
```noir
// Before: 10,000 constraints
fn compute_root_old(leaves: [Field; 256]) -> Field {
    // Naive implementation
    // ...
}

// After: 2,000 constraints
fn compute_root_optimized(leaves: [Field; 256]) -> Field {
    // Use incremental Merkle tree
    // ...
}
```

### Materials Provided
- Circuit templates
- Debugging guide
- Optimization checklist
- Performance benchmarks

---

## Workshop Materials Repository

All workshop materials are available at:
`https://github.com/PrivacyLayer/workshops`

### Structure
```
workshops/
├── workshop-1/
│   ├── slides.pdf
│   ├── exercises/
│   └── solutions/
├── workshop-2/
│   ├── project-template/
│   ├── completed-project/
│   └── security-checklist.md
├── workshop-3/
│   ├── circuit-templates/
│   ├── examples/
│   └── benchmarks/
└── recordings/
    ├── workshop-1.mp4
    ├── workshop-2.mp4
    └── workshop-3.mp4
```

---

## Video Recordings

All workshops are recorded and made available on:
- YouTube: @PrivacyLayer
- Documentation site
- Discord community

### Recording Schedule

| Workshop | Recording Date | Status |
|----------|---------------|--------|
| Workshop 1 | Week 1 | Planned |
| Workshop 2 | Week 2 | Planned |
| Workshop 3 | Week 3 | Planned |

---

## Facilitator Guide

### Prerequisites for Facilitators
- Strong understanding of ZK proofs
- Experience with Noir and Soroban
- Teaching/presentation experience

### Preparation Checklist
- [ ] Review all slides and materials
- [ ] Test all code examples
- [ ] Prepare backup environments
- [ ] Set up recording equipment
- [ ] Create participant accounts (testnet)

### Tips for Success
1. Start with the basics, even if audience seems advanced
2. Use live coding to demonstrate concepts
3. Encourage questions throughout
4. Have helpers available for hands-on exercises
5. Provide clear instructions for environment setup

---

*Part of the PrivacyLayer Education Initiative*
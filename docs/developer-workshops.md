# PrivacyLayer Developer Workshops

> **Version:** 1.0  
> **Last Updated:** 2026-03-26

---

## 📚 Workshop Series Overview

This series consists of 3 workshops designed to take developers from zero to building privacy-preserving applications with PrivacyLayer.

| Workshop | Title | Duration | Level |
|----------|-------|----------|-------|
| 1 | Introduction to Zero-Knowledge Proofs | 2 hours | Beginner |
| 2 | Building Private Transactions | 2.5 hours | Intermediate |
| 3 | Advanced ZK Applications | 3 hours | Advanced |

---

## 🎓 Workshop 1: Introduction to Zero-Knowledge Proofs

### Learning Objectives

By the end of this workshop, participants will be able to:
- Explain what zero-knowledge proofs are and why they matter
- Understand the difference between ZK-SNARKs and ZK-STARKs
- Write a simple ZK circuit using Circom
- Generate and verify proofs

### Prerequisites

- Basic understanding of blockchain concepts
- Familiarity with JavaScript/TypeScript
- Node.js 18+ installed

### Curriculum

#### Part 1: Theory (30 min)

1. **What is Zero-Knowledge?**
   - Definition: Prove you know something without revealing it
   - Real-world analogies (Ali Baba's cave, Where's Waldo)
   - Properties: Completeness, Soundness, Zero-Knowledge

2. **Types of ZK Proofs**
   - ZK-SNARKs (Succinct Non-interactive ARguments of Knowledge)
   - ZK-STARKs (Scalable Transparent ARguments of Knowledge)
   - Comparison table

3. **PrivacyLayer's Approach**
   - Why privacy matters for blockchain
   - PrivacyLayer architecture overview
   - Key components: Circuits, Prover, Verifier

#### Part 2: Hands-on - Your First ZK Circuit (60 min)

**Exercise 1: Prove You Know a Secret Number**

```circom
// circuits/secret-number.circom
pragma circom 2.1.5;

template SecretNumber() {
    signal input secret;
    signal output hash;
    
    // Public hash of the secret
    component poseidon = Poseidon(1);
    poseidon.inputs[0] <== secret;
    hash <== poseidon.out;
}

component main {public [hash]} = SecretNumber();
```

**Steps:**
1. Install Circom
2. Compile the circuit
3. Generate proving and verification keys
4. Create a proof
5. Verify the proof

**Exercise 2: Range Proof**

```circom
// circuits/range-proof.circom
pragma circom 2.1.5;
include "circomlib/comparators.circom";

template RangeProof(n) {
    signal input value;
    signal input min;
    signal input max;
    
    component lt = LessThan(n);
    lt.in[0] <== value - min;
    lt.in[1] <== max - min + 1;
    lt.out === 1;
}

component main = RangeProof(32);
```

#### Part 3: Q&A and Wrap-up (30 min)

- Common pitfalls
- Best practices
- Resources for further learning

### Materials

- [Slide Deck](./workshop-1-slides.pdf)
- [Code Repository](https://github.com/ANAVHEOBA/PrivacyLayer-workshop-1)
- [Exercise Solutions](./workshop-1-solutions.md)

### Video Recording

**Duration:** 2:05:00

**Chapters:**
- 0:00 - Introduction
- 5:30 - What is Zero-Knowledge?
- 30:00 - Types of ZK Proofs
- 50:00 - PrivacyLayer Overview
- 1:05:00 - Exercise 1: Secret Number
- 1:35:00 - Exercise 2: Range Proof
- 1:55:00 - Q&A

**Link:** https://youtube.com/watch?v=TBD

---

## 🔧 Workshop 2: Building Private Transactions

### Learning Objectives

By the end of this workshop, participants will be able to:
- Use PrivacyLayer SDK to build private transactions
- Implement private token transfers
- Create private voting mechanisms
- Handle ZK proof generation and verification

### Prerequisites

- Completed Workshop 1
- Familiarity with React
- Solana wallet (Phantom)

### Curriculum

#### Part 1: SDK Setup and Basics (30 min)

1. **Installation and Configuration**
   ```bash
   npm install @privacylayer/sdk
   ```

2. **Connecting Your Wallet**
   ```typescript
   import { PrivacyLayer } from '@privacylayer/sdk';
   
   const client = new PrivacyLayer({
     network: 'testnet',
   });
   
   await client.connect(); // Connect Phantom wallet
   ```

3. **Understanding the Privacy Model**
   - Commitment schemes
   - Nullifiers
   - Merkle trees for state

#### Part 2: Hands-on - Private Token Transfer (60 min)

**Exercise: Build a Private Transfer Component**

```tsx
// components/PrivateTransfer.tsx
import { useState } from 'react';
import { usePrivacyLayer } from '../hooks/usePrivacyLayer';

export function PrivateTransfer() {
  const { client, isConnected } = usePrivacyLayer();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle');

  const handleTransfer = async () => {
    if (!client || !isConnected) return;
    
    setStatus('generating-proof');
    
    try {
      // Generate ZK proof automatically
      const result = await client.privateTransfer({
        recipient,
        amount: parseFloat(amount),
        token: 'USDC',
      });
      
      setStatus('success');
      console.log('Transfer complete:', result);
    } catch (error) {
      setStatus('error');
      console.error(error);
    }
  };

  return (
    <div className="private-transfer">
      <input
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleTransfer}>
        {status === 'generating-proof' ? 'Generating Proof...' : 'Send Private Transfer'}
      </button>
    </div>
  );
}
```

**Key Concepts:**
- Proof generation happens client-side
- No private data leaves the browser
- On-chain verification is gas-efficient

#### Part 3: Private Voting Implementation (45 min)

**Exercise: Build a Private Voting System**

```typescript
// lib/private-voting.ts
import { PrivacyLayer } from '@privacylayer/sdk';

export class PrivateVoting {
  constructor(private client: PrivacyLayer) {}

  async createProposal(title: string, options: string[]) {
    return await this.client.createPrivateVote({
      proposal: title,
      options,
      endTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  }

  async castVote(proposalId: string, choice: number) {
    // Generate nullifier to prevent double-voting
    const nullifier = await this.client.generateNullifier(proposalId);
    
    // Cast vote with ZK proof
    return await this.client.castVote({
      voteId: proposalId,
      choice,
      nullifier,
    });
  }

  async getResults(proposalId: string) {
    // Results are public but individual votes are private
    return await this.client.getVoteResults(proposalId);
  }
}
```

#### Part 4: Q&A and Best Practices (15 min)

- Error handling
- Performance optimization
- Security considerations

### Materials

- [Slide Deck](./workshop-2-slides.pdf)
- [Code Repository](https://github.com/ANAVHEOBA/PrivacyLayer-workshop-2)
- [API Reference](./api-reference.md)

### Video Recording

**Duration:** 2:28:00

**Link:** https://youtube.com/watch?v=TBD

---

## 🚀 Workshop 3: Advanced ZK Applications

### Learning Objectives

By the end of this workshop, participants will be able to:
- Design complex ZK circuits for real-world applications
- Implement private state management
- Build blind auction systems
- Create proof-of-reserves mechanisms

### Prerequisites

- Completed Workshops 1 and 2
- Strong TypeScript skills
- Understanding of Merkle trees

### Curriculum

#### Part 1: Advanced Circuit Design (45 min)

1. **Composing Circuits**
   - Reusable circuit templates
   - Circuit libraries
   - Optimization techniques

2. **Private State Management**
   - Merkle tree structures
   - Nullifier design
   - State updates with ZK

**Exercise: Build a Merkle Tree Circuit**

```circom
// circuits/merkle-proof.circom
pragma circom 2.1.5;
include "circomlib/mimc.circom";
include "circomlib/merkleproof.circom";

template MerkleProof(nLevels) {
    signal input leaf;
    signal input pathIndices[nLevels];
    signal input pathElements[nLevels];
    signal output root;

    component merkle = MerkleTreeChecker(nLevels);
    merkle.leaf <== leaf;
    for (var i = 0; i < nLevels; i++) {
        merkle.pathIndices[i] <== pathIndices[i];
        merkle.pathElements[i] <== pathElements[i];
    }
    root <== merkle.root;
}

component main {public [root]} = MerkleProof(20);
```

#### Part 2: Blind Auction System (60 min)

**Full Implementation:**

```typescript
// lib/blind-auction.ts
import { PrivacyLayer, Commitment, Proof } from '@privacylayer/sdk';

export class BlindAuction {
  constructor(private client: PrivacyLayer) {}

  async createAuction(
    item: string,
    reservePrice: number,
    duration: number
  ) {
    return await this.client.createBlindAuction({
      item,
      reservePrice,
      duration,
      commitmentScheme: 'poseidon',
    });
  }

  async submitBid(auctionId: string, amount: number) {
    // Generate commitment
    const salt = crypto.randomBytes(32).toString('hex');
    const commitment = await this.client.generateCommitment({
      value: amount,
      salt,
    });

    // Store salt locally (needed for reveal)
    localStorage.setItem(`bid-${auctionId}`, JSON.stringify({ amount, salt }));

    // Submit only the commitment (amount stays private)
    await this.client.submitCommitment({
      auctionId,
      commitment,
    });
  }

  async revealBid(auctionId: string) {
    // Retrieve stored bid
    const stored = localStorage.getItem(`bid-${auctionId}`);
    if (!stored) throw new Error('No bid found');
    
    const { amount, salt } = JSON.parse(stored);

    // Generate ZK proof that we know the preimage
    const proof = await this.client.generateRevealProof({
      auctionId,
      amount,
      salt,
    });

    return await this.client.revealBid({
      auctionId,
      amount,
      salt,
      proof,
    });
  }

  async finalizeAuction(auctionId: string) {
    // Determine winner and process refunds
    return await this.client.finalizeAuction(auctionId);
  }
}
```

#### Part 3: Proof of Reserves (45 min)

**Exercise: Implement Private Proof of Reserves**

```typescript
// lib/proof-of-reserves.ts
export class ProofOfReserves {
  constructor(private client: PrivacyLayer) {}

  async generateProof(reserves: AssetReserve[]) {
    // Create range proofs for each asset
    const proofs = await Promise.all(
      reserves.map(async (asset) => {
        return await this.client.generateRangeProof({
          value: asset.actualAmount,
          min: asset.minRevealed,
          max: asset.maxRevealed,
        });
      })
    );

    // Aggregate proofs
    return await this.client.aggregateProofs(proofs);
  }

  async verifyProof(proof: AggregatedProof) {
    // On-chain verification
    return await this.client.verifyReservesProof(proof);
  }
}

interface AssetReserve {
  token: string;
  actualAmount: number; // Private
  minRevealed: number;  // Public
  maxRevealed: number;  // Public
}
```

#### Part 4: Project Showcase and Q&A (30 min)

- Participant project demos
- Feedback and improvements
- Next steps

### Materials

- [Slide Deck](./workshop-3-slides.pdf)
- [Code Repository](https://github.com/ANAVHEOBA/PrivacyLayer-workshop-3)
- [Circuit Library](https://github.com/ANAVHEOBA/PrivacyLayer-circuits)

### Video Recording

**Duration:** 3:02:00

**Link:** https://youtube.com/watch?v=TBD

---

## 📦 Workshop Materials Package

All materials are available in the GitHub repository:

```
PrivacyLayer-workshops/
├── workshop-1/
│   ├── slides.pdf
│   ├── exercises/
│   ├── solutions/
│   └── README.md
├── workshop-2/
│   ├── slides.pdf
│   ├── exercises/
│   ├── starter-template/
│   └── README.md
├── workshop-3/
│   ├── slides.pdf
│   ├── exercises/
│   ├── advanced-examples/
│   └── README.md
└── shared/
    ├── circuit-templates/
    ├── sdk-helpers/
    └── common-utilities/
```

## 🎯 Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Total Attendees | 100+ | TBD |
| Completion Rate | 70%+ | TBD |
| Projects Built | 10+ | TBD |
| NPS Score | 8+ | TBD |

## 📝 Feedback

After each workshop, participants receive a feedback form:

- Workshop quality (1-5)
- Instructor effectiveness (1-5)
- Exercise difficulty (Too Easy / Just Right / Too Hard)
- What would you improve?
- What would you like to learn next?

---

*These workshops are part of the PrivacyLayer Developer Education Program.*
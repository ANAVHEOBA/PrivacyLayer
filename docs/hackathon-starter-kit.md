# PrivacyLayer Hackathon Starter Kit

> **Version:** 1.0  
> **Last Updated:** 2026-03-26

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Solana CLI (optional, for advanced usage)

### Setup (5 minutes)

```bash
# Clone the starter template
git clone https://github.com/ANAVHEOBA/PrivacyLayer-hackathon-starter.git
cd PrivacyLayer-hackathon-starter

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

Your app will be running at `http://localhost:3000`

---

## 📁 Project Structure

```
PrivacyLayer-hackathon-starter/
├── contracts/           # Smart contract examples
│   ├── PrivateVote.sol
│   └── BlindAuction.sol
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
├── circuits/            # ZK circuit examples
│   └── proof-of-assets/
├── sdk/                 # PrivacyLayer SDK
│   └── src/
├── examples/            # Example applications
│   ├── private-voting/
│   ├── blind-auction/
│   └── proof-of-reserves/
└── docs/               # Documentation
    ├── getting-started.md
    └── api-reference.md
```

---

## 💡 Example Projects

### 1. Private Voting System

**Description:** Anonymous on-chain voting with ZK proofs

**Features:**
- Vote privacy (no one knows how you voted)
- Sybil resistance (one wallet = one vote)
- Verifiable results

**Tech Stack:**
- PrivacyLayer SDK
- Circom (ZK circuits)
- React + TypeScript

**Code Example:**

```typescript
import { PrivacyLayer } from '@privacylayer/sdk';

const client = new PrivacyLayer({
  network: 'testnet',
});

// Create a private vote
const vote = await client.createPrivateVote({
  proposal: "Should we increase the treasury allocation?",
  options: ["Yes", "No", "Abstain"],
  endTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Cast a private vote
await client.castVote({
  voteId: vote.id,
  choice: "Yes",
  // ZK proof generated automatically
});
```

**Full Example:** `examples/private-voting/`

---

### 2. Blind Auction Platform

**Description:** Sealed-bid auctions where bids are hidden until reveal

**Features:**
- Bid privacy during auction
- Automatic winner selection
- Refund mechanism for losers

**Code Example:**

```typescript
// Create a blind auction
const auction = await client.createBlindAuction({
  item: "Rare NFT #1234",
  reservePrice: 1.0, // SOL
  duration: 24 * 60 * 60, // 24 hours
});

// Submit a sealed bid
await client.submitBlindBid({
  auctionId: auction.id,
  amount: 5.5, // Your bid (kept secret)
  commitment: "0x...", // Hash commitment
});

// Reveal bid after auction ends
await client.revealBid({
  auctionId: auction.id,
  amount: 5.5,
  salt: "your-secret-salt",
});
```

**Full Example:** `examples/blind-auction/`

---

### 3. Proof of Reserves

**Description:** Cryptographic proof of asset holdings without revealing exact amounts

**Features:**
- Privacy-preserving audits
- Verifiable on-chain proofs
- Real-time updates

**Code Example:**

```typescript
// Generate proof of reserves
const proof = await client.generateReserveProof({
  assets: [
    { token: "SOL", minAmount: 1000, maxAmount: 10000 },
    { token: "USDC", minAmount: 50000, maxAmount: 100000 },
  ],
  // Range proof generated automatically
});

// Verify proof on-chain
const isValid = await client.verifyReserveProof(proof);
console.log("Reserves verified:", isValid);
```

**Full Example:** `examples/proof-of-reserves/`

---

## 🛠️ Boilerplate Code

### Frontend Component

```tsx
// components/PrivateTransaction.tsx
import { usePrivacyLayer } from '../hooks/usePrivacyLayer';

export function PrivateTransaction() {
  const { client, isConnected, connect } = usePrivacyLayer();

  const handlePrivateTransfer = async () => {
    if (!client || !isConnected) {
      await connect();
      return;
    }

    await client.privateTransfer({
      recipient: "0x...",
      amount: 10,
      token: "USDC",
    });
  };

  return (
    <button onClick={handlePrivateTransfer}>
      Send Private Transfer
    </button>
  );
}
```

### ZK Circuit Template

```circom
// circuits/private-input.circom
template PrivateInput() {
  signal input privateValue;
  signal output commitment;

  // Hash the private value for commitment
  component hash = Poseidon(1);
  hash.inputs[0] <== privateValue;
  commitment <== hash.out;
}

component main = PrivateInput();
```

### Smart Contract Template

```solidity
// contracts/PrivateState.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@privacylayer/contracts/PrivateState.sol";

contract MyPrivateApp is PrivateState {
    // Your private state logic here
    function submitProof(bytes calldata proof) external {
        verifyProof(proof);
        // Process private data
    }
}
```

---

## 📚 Documentation

### SDK Reference

#### Initialization

```typescript
import { PrivacyLayer } from '@privacylayer/sdk';

const client = new PrivacyLayer({
  network: 'mainnet' | 'testnet',
  rpcUrl: 'https://...', // Optional custom RPC
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect wallet |
| `disconnect()` | Disconnect wallet |
| `getBalance()` | Get wallet balance |
| `privateTransfer()` | Send private transaction |
| `createPrivateVote()` | Create a private vote |
| `submitBlindBid()` | Submit sealed bid |
| `generateProof()` | Generate ZK proof |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/prove` | POST | Generate ZK proof |
| `/api/v1/verify` | POST | Verify proof on-chain |
| `/api/v1/status` | GET | Get transaction status |

---

## 🏆 Judging Criteria

### Technical Implementation (40%)

| Criteria | Points |
|----------|--------|
| Code quality & structure | 10 |
| Privacy guarantees | 10 |
| Innovation | 10 |
| Performance | 10 |

### User Experience (25%)

| Criteria | Points |
|----------|--------|
| UI/UX design | 10 |
| Ease of use | 10 |
| Documentation | 5 |

### Business Value (20%)

| Criteria | Points |
|----------|--------|
| Market potential | 10 |
| Scalability | 5 |
| Sustainability | 5 |

### Presentation (15%)

| Criteria | Points |
|----------|--------|
| Demo quality | 5 |
| Pitch clarity | 5 |
| Q&A handling | 5 |

---

## 🎁 Prize Ideas

### Prize Pool: $50,000

| Place | Prize | Additional |
|-------|-------|------------|
| 1st | $20,000 | + Investment consideration |
| 2nd | $10,000 | + Mentorship |
| 3rd | $7,500 | + Community spotlight |
| 4th-5th | $5,000 each | - |
| Best Privacy Innovation | $2,500 | Special prize |
| Best UX | $2,500 | Special prize |

### Sponsor Prizes

| Sponsor | Prize | Category |
|---------|-------|----------|
| Solana Foundation | 500 SOL | Best on-chain integration |
| Mystery Sponsor | $5,000 | Best social impact |
| Mystery Sponsor | $3,000 | Best newcomer team |

---

## 📅 Hackathon Timeline

| Day | Activity |
|-----|----------|
| Day 1 | Kickoff, team formation, workshops |
| Day 2-3 | Development, mentorship hours |
| Day 4 | Development continues, office hours |
| Day 5 | Final submissions, judging |
| Day 6 | Demo day, winners announced |

---

## 🔗 Resources

- **Documentation:** https://docs.privacylayer.io
- **GitHub:** https://github.com/ANAVHEOBA/PrivacyLayer
- **Discord:** https://discord.gg/privacylayer
- **Twitter:** https://twitter.com/privacylayer

---

## 💬 Support

- **Technical Questions:** Discord #hackathon-help
- **General Questions:** hackathon@privacylayer.io
- **Emergency:** @privacylayer on Twitter

---

## 📜 License

This starter kit is licensed under MIT License.

---

*Good luck with your hackathon project! Build something amazing with privacy.*
# 🏗️ PrivacyLayer Hackathon Starter Kit

Build privacy-preserving applications on PrivacyLayer. This kit gets you from zero to demo in hours, not days.

## 📦 What's Inside

```
hackathon-kit/
├── README.md              ← You are here
├── QUICK_START.md         ← 5-minute setup guide
├── JUDGING.md             ← Scoring rubric & criteria
├── PRIZES.md              ← Prize structure & ideas
├── examples/
│   ├── private-transfer.ts  ← Basic private token transfer
│   ├── shielded-vote.ts     ← Anonymous voting example
│   └── proof-of-funds.ts   ← Prove balance without revealing amount
└── cheatsheet.md          ← API reference card
```

## 🚀 Quick Start (5 min)

```bash
# 1. Clone the repo
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer

# 2. Install Noir (ZK circuit compiler)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# 3. Compile the circuits
cd circuits
nargo compile

# 4. Run tests
nargo test

# 5. Start building!
```

See [QUICK_START.md](./QUICK_START.md) for the full walkthrough.

## 💡 Project Ideas

### Beginner (4-8 hours)
| Project | Description | Key Concepts |
|---------|-------------|--------------|
| Private Tip Jar | Send anonymous tips to creators | Basic transfers, nullifiers |
| Secret Ballot | Vote on proposals without revealing choice | Commitment schemes, ZK proofs |
| Proof of Membership | Prove you're in a group without revealing who | Merkle trees, inclusion proofs |

### Intermediate (8-16 hours)
| Project | Description | Key Concepts |
|---------|-------------|--------------|
| Shielded Swap | Exchange tokens privately | Privacy pools, multi-asset |
| Anonymous Feedback | Rate services without identity | Range proofs, aggregation |
| Private Credentials | Issue/verify credentials without data exposure | Selective disclosure |

### Advanced (16-24 hours)
| Project | Description | Key Concepts |
|---------|-------------|--------------|
| Private Lending Pool | Borrow/lend without revealing positions | Complex circuits, state management |
| ZK Compliance Bridge | Prove regulatory compliance privately | Recursive proofs, compliance circuits |
| Privacy-Preserving DAO | Fully anonymous governance | Voting, delegation, treasury |

## 🔧 Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend App   │────▶│  PrivacyLayer   │────▶│  Solana Chain   │
│  (React/Vue/CLI) │     │   SDK + Proofs  │     │  (On-chain Tx)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │               ┌─────────────────┐
        └──────────────▶│   Noir Circuits  │
                        │  (ZK Proof Gen)  │
                        └─────────────────┘
```

### Key Components

1. **Noir Circuits** (`circuits/`) — Zero-knowledge proof definitions
2. **Solana Contracts** (`contracts/`) — On-chain privacy pool program
3. **Scripts** (`scripts/`) — Deployment and testing utilities

### How Privacy Works

1. **Deposit**: User commits funds into a privacy pool with a secret note
2. **Prove**: Generate a ZK proof that you own the note without revealing which one
3. **Withdraw**: Submit the proof on-chain to withdraw to a new address
4. **Verify**: The chain verifies the proof without learning the link between deposit and withdrawal

## 📚 Resources

- [PrivacyLayer Documentation](../README.md)
- [Noir Language Docs](https://noir-lang.org/docs)
- [Solana Developer Docs](https://solana.com/docs)
- [ZK Proof Explainer](https://zkproof.org/2020/08/12/information-theoretic-proof-systems/)

## 🤝 Need Help?

- Open an issue on this repo
- Join the community forum
- Tag your posts with `#PrivacyLayer` on Twitter

---

Built with ❤️ for the privacy community.

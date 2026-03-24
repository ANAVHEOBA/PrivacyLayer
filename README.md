# PrivacyLayer Hackathon Starter Kit

> Everything you need to build privacy-preserving applications on Stellar in 24 hours.

## Quick Start (5 minutes)

```bash
# Clone the starter kit
git clone https://github.com/your-team/privacylayer-hackathon.git
cd privacylayer-hackathon

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Stellar testnet credentials

# Run the example
npm run dev
```

## What's Included

| Component | Description | Time |
|-----------|-------------|------|
| **Boilerplate** | React + Vite + PrivacyLayer SDK starter | 0 min (included) |
| **Quick Start** | Step-by-step getting started guide | 10 min |
| **Examples** | 3 complete example projects | 30 min each |
| **Judging Criteria** | What judges look for | 5 min |
| **Prize Ideas** | Suggested project directions | 5 min |

## Project Structure

```
privacylayer-hackathon/
├── README.md                 # This file
├── docs/
│   ├── quick-start.md        # 10-minute setup guide
│   ├── architecture.md       # Understanding PrivacyLayer
│   └── troubleshooting.md    # Common issues & fixes
├── examples/
│   ├── private-payments/     # Send/receive private payments
│   ├── anonymous-voting/     # Private voting system
│   └── confidential-dao/     # DAO with private treasury
├── templates/
│   ├── react-starter/        # Minimal React template
│   ├── vue-starter/          # Minimal Vue template
│   └── vanilla-js/           # No-framework version
└── resources/
    ├── judging-rubric.md     # How you'll be scored
    └── prize-categories.md   # What to build for prizes
```

## Example Projects

### 1. Private Payments App
Send and receive USDC privately on Stellar.

**Key features:**
- Shield USDC into private pool
- Send to anyone (even without PrivacyLayer)
- View transaction history
- Export for taxes

**Code:** `examples/private-payments/`

### 2. Anonymous Voting
Create and participate in private polls.

**Key features:**
- Create voting proposals
- Cast votes without revealing identity
- Tally results privately
- Prove participation without doxxing

**Code:** `examples/anonymous-voting/`

### 3. Confidential DAO
Manage DAO treasury with private transactions.

**Key features:**
- Private payroll distribution
- Shielded grant payments
- Anonymous contributor rewards
- Public reporting with private details

**Code:** `examples/confidential-dao/`

## Understanding PrivacyLayer

PrivacyLayer brings zero-knowledge privacy to Stellar:

- **Shielded Pools:** Hide transaction amounts and participants
- **zk-SNARKs:** Cryptographic proofs that verify without revealing
- **Compliance:** Optional viewing keys for audits
- **Performance:** Fast finality on Stellar (~5 seconds)

**Architecture:**
```
User Wallet → PrivacyLayer SDK → Stellar Network
                 ↓
         Zero-Knowledge Circuit
                 ↓
         Shielded Pool Contract
```

## Judging Criteria

Projects are scored on:

| Category | Weight | What Judges Look For |
|----------|--------|---------------------|
| **Privacy** | 30% | Effective use of PrivacyLayer features |
| **Innovation** | 25% | Novel application of privacy tech |
| **Functionality** | 25% | Working demo with real transactions |
| **Presentation** | 20% | Clear pitch, good documentation |

**Bonus points for:**
- Creative use cases we haven't thought of
- Integration with other Stellar protocols
- Social impact or accessibility features
- Clean, production-ready code

## Prize Categories

### Grand Prize
Best overall privacy application using PrivacyLayer.

**Ideas:**
- Privacy-preserving DeFi dashboard
- Anonymous social platform
- Confidential business payments
- Private charity donations

### Best Developer Experience
Best tools, SDKs, or documentation for PrivacyLayer.

**Ideas:**
- VS Code extension for PrivacyLayer
- CLI tool for common operations
- Enhanced documentation with interactive examples
- Testing framework for private transactions

### Best Real-World Use Case
Most practical application for everyday users.

**Ideas:**
- Private subscription payments
- Confidential salary negotiations
- Anonymous feedback system
- Privacy-preserving marketplace

### Best Integration
Best combination of PrivacyLayer with other protocols.

**Ideas:**
- PrivacyLayer + Soroban smart contracts
- PrivacyLayer + Anchor for private fiat on/off ramps
- PrivacyLayer + Stellar DEX for private trading
- PrivacyLayer + IPFS for private file payments

## Resources

### Documentation
- [PrivacyLayer Docs](https://docs.privacylayer.io)
- [Stellar Developer Docs](https://developers.stellar.org)
- [zk-SNARKs Explained](https://docs.privacylayer.io/learn/zk-proofs)

### Support
- [Discord](https://discord.gg/privacylayer) - Real-time help
- [GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) - Bug reports
- [Dev Forum](https://forum.privacylayer.io) - Discussion

### Testnet
- **Network:** Stellar Testnet
- **Friendbot:** Request test XLM
- **Explorer:** [Stellar Expert](https://stellar.expert)

## Submission Checklist

Before submitting your project:

- [ ] Code is in a public GitHub repository
- [ ] README includes setup instructions
- [ ] Demo video (2-3 minutes) uploaded
- [ ] Live demo deployed (Vercel/Netlify recommended)
- [ ] Team members listed in submission
- [ ] PrivacyLayer features clearly demonstrated

## Timeline (24-Hour Hackathon)

| Time | Activity |
|------|----------|
| Hour 0 | Kickoff, team formation |
| Hour 1-2 | Idea validation, architecture planning |
| Hour 2-4 | Environment setup, first transaction |
| Hour 4-12 | Core development |
| Hour 12-16 | Feature completion, testing |
| Hour 16-20 | Polish, documentation, demo prep |
| Hour 20-22 | Practice pitch, final fixes |
| Hour 22-24 | Submit, celebrate! |

## Tips for Success

1. **Start Simple:** Get a basic transaction working first
2. **Test Early:** Don't wait until hour 20 to try testnet
3. **Document As You Go:** Write README sections as you build
4. **Focus on Privacy:** Make privacy the star, not an afterthought
5. **Show, Don't Tell:** Working demo beats perfect architecture

## Need Help?

Stuck on something? Check these resources:

- **SDK Issues:** See `docs/troubleshooting.md`
- **Conceptual Questions:** Read `docs/architecture.md`
- **Live Help:** Join Discord #hackathon channel
- **Example Code:** Study the `examples/` directory

## License

MIT - Use this starter kit for any hackathon or personal project.

---

**Built with ❤️ by the PrivacyLayer community**

**Good luck, and may your transactions be private! 🛡️**

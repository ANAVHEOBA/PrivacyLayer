# PrivacyLayer FAQ

**Last Updated:** March 2026

---

## General Questions

### What is PrivacyLayer?

PrivacyLayer is a privacy-preserving protocol built on the Stellar network. It allows users to make private transactions using zero-knowledge proofs, ensuring that deposit and withdrawal addresses cannot be linked on-chain.

### How does PrivacyLayer protect my privacy?

PrivacyLayer uses:
- **Zero-Knowledge Proofs (zk-SNARKs)**: Prove you own funds without revealing which funds
- **Merkle Trees**: Efficiently store deposits without revealing individual positions
- **Nullifiers**: Prevent double-spending without linking transactions

### Is PrivacyLayer legal?

Yes. PrivacyLayer is a privacy tool, similar to cash or encryption. It has legitimate uses for:
- Personal financial privacy
- Business confidentiality
- Protection from targeted attacks

**Note**: PrivacyLayer does not condone illegal activities. Users are responsible for complying with their local laws.

### What blockchains does PrivacyLayer support?

Currently, PrivacyLayer is built on **Stellar** using Soroban smart contracts. Support for other networks may be added in the future.

---

## Getting Started

### What do I need to use PrivacyLayer?

1. A Stellar wallet (Freighter, Lobstr, etc.)
2. XLM for transaction fees
3. The asset you want to transact privately
4. Our CLI tool or web interface

### How do I install the PrivacyLayer CLI?

```bash
npm install -g @privacylayer/cli
privacylayer init
```

### What is the minimum deposit?

The minimum deposit varies by asset:
- XLM: 1 XLM
- USDC: 1 USDC

Note: You also need ~1 XLM for transaction fees.

### Can I use PrivacyLayer on mobile?

Currently, PrivacyLayer works best on desktop. Mobile support is in development.

---

## How It Works

### What happens when I deposit?

1. Your funds are locked in the privacy pool contract
2. A secret commitment is created (only you know it)
3. The commitment is added to the Merkle tree
4. You receive a "note" that proves your deposit

### What is a "note"?

A note is a cryptographic proof of your deposit:
```
privacylayer:[asset]:[amount]:[nullifier]:[secret]
```

**Keep this secret!** Anyone with the note can withdraw your funds.

### How do I withdraw?

1. Use your note to generate a ZK proof
2. Provide a fresh receiving address
3. Submit the withdrawal transaction
4. Receive funds at your new address

### Why do I need a fresh address for withdrawal?

If you withdraw to an address linked to your identity (e.g., a KYC'd exchange), you lose privacy. Always use a new address with no public connection to you.

### What are nullifiers?

Nullifiers are unique values that prevent double-spending:
- Generated from your deposit details
- Revealed only when you withdraw
- Prevents the same deposit from being withdrawn twice
- Cannot be linked back to your deposit

---

## Fees and Limits

### What are the fees?

| Operation | Fee |
|-----------|-----|
| Deposit | ~0.01 XLM (network fee) |
| Withdraw | ~0.01 XLM (network fee) |
| Relayer | 0.1% of withdrawal amount (optional) |

### Is there a deposit/withdrawal limit?

| Type | Limit |
|------|-------|
| Minimum Deposit | 1 XLM / 1 USDC |
| Maximum Deposit | 100,000 XLM / 100,000 USDC |
| Daily Pool Limit | 1,000,000 XLM equivalent |

### How long does a transaction take?

| Operation | Time |
|-----------|------|
| Deposit | ~5 seconds (1 confirmation) |
| Withdrawal | ~10 seconds (proof generation + confirmation) |

---

## Security

### Is PrivacyLayer audited?

Yes. PrivacyLayer has undergone:
- Internal security review
- External audit by [Auditor Name] (link to report)
- Community bug bounty program

### What happens if I lose my note?

**Your funds are permanently lost.** There is no way to recover a lost note because:
- The note contains your secret
- Without the secret, you cannot prove ownership
- This is by design for privacy

**Always backup your notes securely!**

### Can PrivacyLayer team access my funds?

No. The PrivacyLayer team:
- Cannot access your notes
- Cannot reverse transactions
- Cannot freeze funds
- Cannot link deposits to withdrawals

### What if there's a bug in the contract?

PrivacyLayer uses:
- Thoroughly tested contracts
- Formal verification where possible
- Time-locked upgrades (24-hour delay)
- Community governance for major changes

---

## Privacy

### Can transactions be traced?

**On-chain**: No. ZK proofs prevent blockchain-level tracing.

**Off-chain**: Possibly, if you:
- Use the same IP for deposit and withdrawal
- Withdraw to a known address
- Share your notes or discuss transactions
- Use timing patterns

### Who can see my transactions?

On the blockchain, observers see:
- Deposits to the pool (no individual identification)
- Withdrawals from the pool (no deposit reference)
- Nullifiers (prevent double-spending, no link to deposit)

### Does PrivacyLayer collect personal data?

No. PrivacyLayer:
- Does not require KYC
- Does not collect IP addresses (when using Tor/VPN)
- Does not store user data
- Does not track usage patterns

### Can exchanges block PrivacyLayer transactions?

Exchanges can blacklist addresses that interact with PrivacyLayer. To avoid this:
- Use fresh addresses
- Don't withdraw directly to exchanges
- Consider using an intermediary wallet

---

## Technical Questions

### What is a Merkle tree?

A Merkle tree is a data structure that:
- Stores many items efficiently (32-byte root represents billions of items)
- Enables membership proofs without revealing which item
- Powers PrivacyLayer's privacy guarantees

### What are zk-SNARKs?

zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge) are:
- Cryptographic proofs that verify computation
- Zero-knowledge: prove something without revealing the underlying data
- Succinct: proofs are small (~200 bytes) and fast to verify (~2ms)

### What is Groth16?

Groth16 is the specific zk-SNARK construction used by PrivacyLayer:
- Most efficient SNARK for verification
- Trusted setup required
- Used by Zcash, Tornado Cash, and other privacy protocols

### What is Noir?

Noir is a domain-specific language for writing zero-knowledge circuits. PrivacyLayer uses Noir to write the circuits that prove:
- You have a valid deposit
- You haven't withdrawn it before
- You're authorized to withdraw

---

## Troubleshooting

### "Insufficient balance for deposit"

**Solution**: Ensure you have:
- Enough of the asset to deposit
- Extra XLM for fees (~1 XLM)

### "Invalid note format"

**Solution**: Check your note format:
```
privacylayer:[asset]:[amount]:[nullifier]:[secret]
```

### "Nullifier already used"

**Solution**: This note has been withdrawn already. Check your transaction history.

### "ZK proof generation failed"

**Solution**:
- Update CLI: `npm update -g @privacylayer/cli`
- Ensure Node.js 18+: `node --version`
- Check available memory (2GB+ recommended)

### "Transaction reverted"

**Solution**:
- Check contract status: `privacylayer status`
- Verify pool has sufficient liquidity
- Ensure your note hasn't been used

---

## Governance

### Who controls PrivacyLayer?

PrivacyLayer is governed by:
- **Community DAO**: Token holders vote on proposals
- **Multi-sig Treasury**: Requires 4 of 7 signers for major changes
- **Time-locked Upgrades**: 24-hour delay before changes take effect

### How do I participate in governance?

1. Hold PLR governance tokens
2. Delegate votes or vote directly
3. Propose changes on the forum
4. Participate in discussions

### What can be changed through governance?

- Fee parameters
- Supported assets
- Circuit upgrades
- Protocol improvements
- Treasury allocation

---

## Support

### Where can I get help?

- **Documentation**: docs.privacylayer.io
- **Discord**: discord.gg/privacylayer
- **GitHub Issues**: github.com/ANAVHEOBA/PrivacyLayer/issues
- **Email**: support@privacylayer.io

### How do I report a bug?

1. Check existing issues on GitHub
2. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (CLI version, OS, etc.)

### Is there a bug bounty program?

Yes! PrivacyLayer has a bug bounty program with rewards up to $50,000 for critical vulnerabilities. Visit: privacylayer.io/bug-bounty

---

## Future Plans

### What features are coming?

- [ ] Mobile wallet support
- [ ] More supported assets
- [ ] Cross-chain bridges
- [ ] NFT privacy pools
- [ ] Enterprise solutions

### When will [feature] be released?

Check our roadmap at: privacylayer.io/roadmap

---

*Have a question not answered here? Join our Discord or open a GitHub issue!*
# PrivacyLayer FAQ - Frequently Asked Questions

**Last Updated:** April 2026

---

## General Questions

### What is PrivacyLayer?

PrivacyLayer is a privacy protocol built on Stellar that enables private transactions using zero-knowledge proofs. Users can deposit assets into a shielded pool and withdraw them privately, with no on-chain link between deposit and withdrawal.

### Is PrivacyLayer official?

No, PrivacyLayer is a community-built protocol. It leverages Stellar Protocol 25's new cryptographic primitives (BN254, Poseidon) but is not developed by the Stellar Development Foundation.

### What assets are supported?

Currently:
- ✅ XLM (native Stellar asset)
- ✅ USDC (Circle stablecoin)

More assets coming soon via community requests.

### Is it free to use?

PrivacyLayer itself is free (open source). You only pay:
- Stellar network fees (~0.00001 XLM per transaction)
- Soroban contract execution fees (varies by operation)

---

## Security

### Has PrivacyLayer been audited?

**Current Status:** ⚠️ Not yet audited for mainnet.

- Testnet is safe for testing and learning
- **Do NOT use for large amounts on mainnet** until audit is complete
- Audit in progress with [Firm Name TBD]

### What are the risks?

| Risk | Severity | Mitigation |
|------|----------|------------|
| Smart contract bug | High | Audit, bug bounty program |
| ZK circuit bug | High | Formal verification, audit |
| User loses note | High | Backup instructions, education |
| Frontend phishing | Medium | Verify URLs, bookmark official site |

### How do I stay safe?

1. **Start small:** Test with small amounts first
2. **Backup notes:** Save notes in multiple secure locations
3. **Verify URLs:** Always check you're on the official site
4. **Use hardware wallet:** For large amounts
5. **Stay updated:** Follow our Twitter/Discord for security announcements

---

## Technical Questions

### How does privacy work?

PrivacyLayer uses **zero-knowledge proofs** (specifically Groth16 SNARKs):

1. You deposit → get a secret "note"
2. Note is added to a Merkle tree (on-chain)
3. To withdraw, you prove you know a note in the tree
4. Proof doesn't reveal WHICH note → privacy!

See our [technical deep dive](blog-post-3-zk-proofs.md) for details.

### What is a "note"?

A note is your secret receipt of deposit. It contains:
- Amount deposited
- Asset type
- Secret randomness

**You MUST save your note.** Without it, you cannot withdraw. Think of it like a bearer bond—whoever has the note owns the funds.

### What happens if I lose my note?

Unfortunately, funds are **irrecoverable** if you lose your note. This is by design—notes are bearer instruments.

**Best practices:**
- Save in password manager (1Password, Bitwarden)
- Encrypted backup (VeraCrypt, Cryptomator)
- Physical backup (paper in safe)
- Multiple copies in different locations

### Can I withdraw to the same address?

Yes, but it reduces privacy. For maximum privacy:
- Use a new address for withdrawals
- Wait for multiple deposits before withdrawing
- Avoid round numbers

### How long does it take?

- **Deposit:** 5-10 seconds (Stellar confirmation)
- **Withdraw:** 10-30 seconds (proof generation) + 5-10 seconds (confirmation)
- **Sync:** Varies (depends on tree size)

---

## Usage

### How do I get started?

1. Install [Freighter wallet](https://freighter.app)
2. Get testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org)
3. Try the [demo app](https://demo.privacylayer.org)
4. Read our [beginner's guide](blog-post-1-what-is-privacy.md)

### Can I use it on mobile?

Currently, proof generation works best on desktop. Mobile support is planned for Q3 2026.

### What if my transaction fails?

Common causes:
- **Insufficient balance:** Ensure you have XLM for fees
- **Invalid note:** Check for typos
- **Already spent:** Each note can only be withdrawn once
- **Network congestion:** Wait and retry

### How do I verify my transaction?

Use [Stellar Expert](https://stellar.expert):
1. Search your address or transaction hash
2. View transaction details
3. Confirm status

---

## Developer Questions

### How do I integrate PrivacyLayer?

See our [Developer Integration Guide](../developers/integration-guide.md).

Quick start:
```bash
npm install @privacylayer/sdk
```

### Is there an SDK?

Yes! SDKs available for:
- ✅ TypeScript/JavaScript (browser + Node.js)
- ✅ Python
- 🚧 Rust (coming soon)
- 🚧 Go (coming soon)

### Can I self-host?

Yes! PrivacyLayer is open source (MIT license):
```bash
git clone https://github.com/ANAVHEOBA/PrivacyLayer
cd PrivacyLayer
npm install
npm run dev
```

### What's the bounty program?

We have active bounties for:
- Documentation improvements
- SDK development
- Security research
- Integration examples

See [Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) for details.

---

## Compliance

### Is PrivacyLayer legal?

PrivacyLayer is a tool. Legality depends on your jurisdiction and use case.

**Important:**
- Privacy ≠ Illegality
- Many legitimate uses: business confidentiality, personal security, anti-surveillance
- Consult legal counsel for specific advice

### Do I need to report for taxes?

**We are not tax advisors.** Generally:
- Transactions may be taxable events
- Keep records of all transactions
- Consult a tax professional

PrivacyLayer provides transaction export for record-keeping.

### Can PrivacyLayer be used for money laundering?

Like any financial tool, it *could* be misused. However:
- All transactions are still on-chain (just private)
- Law enforcement tools exist for ZK protocols
- We cooperate with legal requests per our terms

We're building privacy for legitimate users, not criminals.

---

## Support

### How do I get help?

- **Discord:** https://discord.gg/privacylayer (fastest)
- **Twitter:** @PrivacyLayer
- **Email:** support@privacylayer.org
- **GitHub Issues:** For bugs and feature requests

### How do I report a security issue?

**DO NOT disclose publicly.** Email: security@privacylayer.org

We have a bug bounty program:
- Critical: $10,000+
- High: $5,000+
- Medium: $1,000+
- Low: $100+

---

## Contributing

### How can I contribute?

Many ways:
- 📝 Improve documentation
- 💻 Build integrations
- 🐛 Report bugs
- 🎨 Design assets
- 📢 Spread the word

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

### Are there bounties?

Yes! Check our [GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues) labeled `bounty`.

Current bounties range from 50-200 USDC for various tasks.

---

**Still have questions?** Join our [Discord](https://discord.gg/privacylayer) and ask!

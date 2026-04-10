# PrivacyLayer User Guide

## What is PrivacyLayer?

PrivacyLayer is a privacy pool built on Stellar that lets you make private transactions using zero-knowledge proofs. Your deposits and withdrawals are cryptographically shielded — nobody can link your deposit to your withdrawal.

### How It Works
1. **Deposit**: You send tokens into the privacy pool with a secret commitment
2. **Wait**: Your deposit mixes with others in the pool (more deposits = more privacy)
3. **Withdraw**: You prove you own a deposit using a ZK proof, without revealing which one

### Privacy Guarantees
- Deposits and withdrawals are unlinkable
- Your identity is hidden within the anonymity set (all depositors)
- ZK proofs verify ownership without revealing the deposit

## Getting Started

### Connect Your Wallet
1. Install [Freighter](https://freighter.app/) (Stellar wallet browser extension)
2. Create or import an account
3. Fund your account with XLM and the supported token
4. Visit the PrivacyLayer dApp and click "Connect Wallet"

### Make a Deposit

1. **Choose amount**: Select a fixed denomination (e.g., 100, 1000, 10000 tokens)
2. **Generate note**: The app creates a secret note — **SAVE THIS NOTE SECURELY**
3. **Confirm deposit**: Approve the transaction in your wallet
4. **Wait for confirmation**: Transaction finalizes in ~5 seconds on Stellar

**Important**: Your note is the ONLY way to withdraw. If you lose it, your funds are permanently locked.

### Manage Your Notes

Your note looks like: `privacy_0x7a8f3b...c4e2_1000_testnet`

**Storage best practices**:
- Save to an encrypted password manager (1Password, Bitwarden)
- Write on paper and store securely (offline backup)
- Never share your note with anyone
- Never paste your note in chat or email

### Withdraw Your Funds

1. **Enter your note**: Paste the note you saved during deposit
2. **Enter recipient address**: The Stellar address to receive funds (can be different from depositor)
3. **Generate proof**: The app creates a ZK proof (takes 10-30 seconds)
4. **Submit withdrawal**: The proof is verified on-chain and funds are sent
5. **Confirmation**: Funds appear in the recipient wallet within ~5 seconds

### Check Pool Status

- **Pool size**: Number of deposits in the pool (larger = more privacy)
- **Your deposits**: List of active notes you've deposited
- **Transaction history**: Your deposit/withdrawal history (local only)

## Security Best Practices

### Do
- Use a fresh wallet address for withdrawals (maximum privacy)
- Wait for more deposits before withdrawing (larger anonymity set)
- Keep your notes in encrypted storage
- Verify the dApp URL before connecting wallet

### Don't
- Don't withdraw immediately after depositing (timing correlation)
- Don't withdraw the same amount to a linked address
- Don't share your notes with anyone
- Don't use the same deposit/withdrawal pattern repeatedly
- Don't screenshot your notes (clipboard can be compromised)

## FAQ

**Q: What if I lose my note?**
A: Your funds cannot be recovered. Always keep secure backups.

**Q: Is there a fee?**
A: A small fee (0.1-0.5%) is taken on withdrawal to fund the relayer.

**Q: Can the PrivacyLayer team see my transactions?**
A: No. The ZK proofs ensure even the contract operators cannot link deposits to withdrawals.

**Q: What tokens are supported?**
A: Currently XLM and USDC on Stellar. More tokens will be added.

**Q: How long should I wait before withdrawing?**
A: The longer you wait and the more deposits enter the pool, the stronger your privacy. Minimum recommended: wait for 10+ additional deposits.

# Getting Started with PrivacyLayer

## Prerequisites

- Stellar wallet with USDC (or supported token)
- Basic understanding of blockchain transactions

## Quick Start

### 1. Connect Your Wallet

Connect your Stellar wallet to the PrivacyLayer interface. Supported wallets:
- Freighter
- Albedo
- xBull

### 2. Choose a Pool

Select a denomination pool:
- Each pool has a fixed deposit amount
- Larger pools with more deposits offer better privacy

### 3. Deposit

1. Click "Deposit"
2. Approve the transaction in your wallet
3. **Save your note** — this is your withdrawal key

> ⚠️ **IMPORTANT:** If you lose your note, your funds cannot be recovered. Store it safely!

### 4. Wait

For maximum privacy, wait before withdrawing:
- The longer you wait, the more deposits happen after yours
- This increases your **anonymity set**
- Minimum recommended: wait for 10+ subsequent deposits

### 5. Withdraw

1. Enter your saved note
2. Specify the recipient address (can be any Stellar address)
3. The ZK proof is generated in your browser
4. Submit the withdrawal transaction

### 6. Done!

The tokens arrive at the recipient address with no visible link to your deposit.

## Tips for Better Privacy

| Tip | Why |
|-----|-----|
| Wait longer between deposit and withdrawal | Larger anonymity set |
| Use a fresh address for receiving | No address reuse |
| Deposit and withdraw at different times of day | Harder to correlate by timing |
| Use the same denomination as others | Blend in with the crowd |

## Fees

- **Deposit:** Network gas fee only
- **Withdrawal:** Network gas fee + optional relayer fee
- **Relayer:** Allows withdrawal without gas in the recipient wallet

## Security

- Smart contract is open-source
- ZK circuits are audited
- No admin can access or freeze individual deposits
- Nullifier system prevents double-spending

## Need Help?

- [API Documentation](../API.md)
- [GitHub Repository](https://github.com/ANAVHEOBA/PrivacyLayer)
- [How PrivacyLayer Works](./02-how-privacylayer-works.md)

---

*Happy private transacting! 🔒*

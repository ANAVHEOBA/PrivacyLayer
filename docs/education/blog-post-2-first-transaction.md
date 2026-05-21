# How to Make Your First Private Transaction

**Published:** April 2026  
**Author:** PrivacyLayer Team  
**Reading Time:** 8 minutes

---

## Prerequisites

Before you begin:
- ✅ Freighter wallet installed
- ✅ Testnet XLM in your wallet (get from [Stellar Laboratory](https://laboratory.stellar.org))
- ✅ Basic understanding of Stellar addresses

---

## Step 1: Connect Your Wallet

1. Open the [PrivacyLayer Demo App](https://demo.privacylayer.org)
2. Click "Connect Freighter" in the top right
3. Approve the connection in your wallet

**Expected result:** You should see "● Connected" with your address truncated.

---

## Step 2: Deposit to Shielded Pool

### 2.1 Choose Amount
- Enter the amount you want to deposit (e.g., `10 XLM`)
- Select the asset (XLM or USDC)

### 2.2 Confirm Transaction
- Click "🔒 Deposit"
- Freighter will pop up asking for confirmation
- Review the transaction details
- Click "Approve"

### 2.3 Save Your Note!
After the deposit confirms:
```
✅ Deposit successful!
Note: note_1abc123xyz... (save this secret!)
```

**⚠️ CRITICAL:** This note is your ONLY proof of ownership. Save it securely:
- ✅ Password manager
- ✅ Encrypted file
- ✅ Physical backup (paper)
- ❌ NOT in plain text email
- ❌ NOT in screenshots

---

## Step 3: Wait for Confirmation

- Deposits typically confirm in 5-10 seconds on testnet
- You can track status on [Stellar Expert](https://stellar.expert)
- Your balance will update automatically

---

## Step 4: Withdraw Privately

### 4.1 Prepare Withdrawal
- Enter your saved note
- Enter recipient address (can be a NEW address for maximum privacy)

### 4.2 Generate Proof
- Click "🔓 Withdraw"
- The app generates a zero-knowledge proof (takes ~10-30 seconds)
- This proves you have funds without revealing which deposit

### 4.3 Submit Transaction
- Approve the withdrawal in Freighter
- Wait for confirmation
- Recipient receives funds privately

---

## What Happened Behind the Scenes

```
1. You deposited 10 XLM → Shielded Pool
   - Pool creates a "note" (your secret receipt)
   - Note is added to Merkle tree

2. You waited... (privacy improves with more deposits)

3. You withdrew 10 XLM ← Shielded Pool
   - Generated ZK proof: "I know a note in the tree"
   - Proof doesn't reveal WHICH note
   - Pool verifies proof, transfers funds
   - Nullifier prevents double-spend
```

---

## Verifying Privacy

After your withdrawal:

1. **Check the blockchain:**
   - Go to [Stellar Expert](https://stellar.expert)
   - Search your original address
   - You'll see the deposit, but NOT the withdrawal link

2. **Check the pool:**
   - The pool shows total deposits and withdrawals
   - But NO link between specific deposit/withdrawal

3. **Check recipient:**
   - Recipient received funds
   - No public link to your original address

---

## Common Issues

### "Transaction Failed"
- **Cause:** Insufficient XLM for fees
- **Fix:** Ensure you have 1+ XLM for fees

### "Note Invalid"
- **Cause:** Typo in note, or note already spent
- **Fix:** Double-check note, ensure you haven't withdrawn before

### "Proof Generation Timeout"
- **Cause:** Browser performance or network issues
- **Fix:** Refresh and try again, or use desktop

---

## Best Practices

### 🛡️ Security
- Never share your notes
- Use hardware wallet for large amounts
- Keep software updated

### 🎯 Privacy
- Wait for multiple deposits before withdrawing
- Use new addresses for withdrawals
- Avoid round numbers (e.g., withdraw 10.123 instead of 10)

### 📝 Record Keeping
- Backup notes in multiple secure locations
- Document transactions for tax purposes
- Use a dedicated wallet for privacy transactions

---

## Next Steps

- 📖 [Understanding ZK Proofs Deep Dive](blog-post-3-zk-proofs.md)
- 🎥 [Video: Advanced Privacy Techniques](video-2-advanced.md)
- 💻 [Developer: Integrate PrivacyLayer](../developers/sdk-quickstart.md)

---

**Need Help?** Join our [Discord](https://discord.gg/privacylayer) or read the [FAQ](faq.md).

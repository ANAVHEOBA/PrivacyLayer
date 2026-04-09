# What is Privacy on Stellar? A Beginner's Guide

**Published:** April 2026  
**Author:** PrivacyLayer Team  
**Reading Time:** 5 minutes

---

## Why Privacy Matters

Imagine sending money on Stellar. Everyone can see:
- ❌ How much you sent
- ❌ Who you sent it to
- ❌ When you sent it
- ❌ Your total balance

This is like shouting your bank account details in a crowded room.

**PrivacyLayer changes this.** With zero-knowledge proofs, you can:
- ✅ Send transactions privately
- ✅ Keep your balance hidden
- ✅ Prove you have funds without revealing amounts

---

## How Does It Work?

### The Problem with Transparent Blockchains

On traditional blockchains like Stellar (before PrivacyLayer):
```
Alice sends 100 XLM to Bob
→ Everyone sees: Alice → 100 XLM → Bob
→ Everyone knows Alice's balance decreased by 100
→ Everyone knows Bob's balance increased by 100
```

### The PrivacyLayer Solution

With PrivacyLayer's shielded pool:
```
Alice deposits 100 XLM → Shielded Pool
Alice withdraws 100 XLM ← Shielded Pool (to new address)

→ Everyone sees: Deposit → Pool ← Withdrawal
→ NO ONE knows: Alice → Bob
→ NO ONE knows the amount
→ NO ONE can link deposit to withdrawal
```

---

## Zero-Knowledge Proofs Explained

A **zero-knowledge proof** lets you prove something is true without revealing the details.

**Real-world analogy:**
> You want to prove you're over 21 without showing your ID with your address, birthday, etc.
> 
> A ZK proof is like a bouncer who only checks "Is this person 21+?" and says "Yes" — without seeing anything else.

**In PrivacyLayer:**
> You want to prove you have funds to withdraw without revealing:
> - Which deposit was yours
> - How much you deposited
> - Your original address

---

## Key Concepts

### 1. **Commitment**
A cryptographic "lock" that hides your deposit details:
```
commitment = Poseidon(nullifier + secret)
```

### 2. **Nullifier**
A unique identifier that prevents double-spending without revealing which note was spent.

### 3. **Merkle Tree**
A data structure that efficiently proves your deposit is in the pool without revealing which one.

### 4. **Shielded Pool**
A smart contract that holds all private deposits and processes private withdrawals.

---

## Use Cases

### 🏢 Business Payments
- Pay suppliers without revealing cash flow
- Keep salary information private
- Protect competitive advantage

### 💰 Personal Finance
- Private donations
- Family transfers without public scrutiny
- Protection from targeted scams

### 🎯 Trading
- Hide trading strategies
- Prevent front-running
- Protect large positions

---

## Getting Started

1. **Install Freighter Wallet** (https://freighter.app)
2. **Get Testnet XLM** (https://laboratory.stellar.org)
3. **Try PrivacyLayer Demo** (link to demo)
4. **Read Technical Docs** (link to docs)

---

## Next Steps

- 📖 [How to Make Your First Private Transaction](blog-post-2-first-transaction.md)
- 🎥 [Video Tutorial: PrivacyLayer Basics](video-1-basics.md)
- 🔧 [Developer Integration Guide](../developers/integration-guide.md)

---

**Questions?** Join our [Discord](https://discord.gg/privacylayer) or read the [FAQ](faq.md).

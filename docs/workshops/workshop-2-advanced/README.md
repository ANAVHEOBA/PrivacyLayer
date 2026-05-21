# Workshop 2: Advanced Privacy Techniques

**Duration:** 120 minutes  
**Level:** Intermediate  
**Prerequisites:** Workshop 1 or equivalent experience  
**Max Participants:** 30

---

## Workshop Overview

Deep dive into advanced PrivacyLayer features and privacy best practices. Participants will learn optimization techniques, privacy patterns, and security considerations.

### Learning Objectives

By the end of this workshop, participants will be able to:
- ✅ Implement privacy best practices
- ✅ Optimize transaction timing for maximum privacy
- ✅ Use advanced features (batch operations, etc.)
- ✅ Understand and mitigate common privacy pitfalls
- ✅ Integrate PrivacyLayer into applications

---

## Agenda

| Time | Activity | Format |
|------|----------|--------|
| 0:00-0:15 | Recap & Privacy Threat Model | Presentation |
| 0:15-0:45 | Advanced Privacy Patterns | Presentation + Examples |
| 0:45-1:15 | Hands-on: Privacy Optimization | Exercise |
| 1:15-1:25 | Break | - |
| 1:25-1:55 | Security Best Practices | Presentation + Discussion |
| 1:55-2:00 | Q&A + Wrap-up | Discussion |

---

## Module 1: Privacy Threat Model

### Understanding Attack Vectors

**Timing Analysis:**
```
Bad: Deposit → Immediate withdrawal → Easy to link
Good: Deposit → Wait for 10+ other deposits → Withdraw → Hard to link
```

**Amount Analysis:**
```
Bad: Deposit 100 XLM → Withdraw 100 XLM → Amount links them
Good: Deposit 100 XLM → Withdraw 99.5 XLM (fees) → Harder to link
```

**Address Reuse:**
```
Bad: Always withdraw to same address → Address becomes "tainted"
Good: Generate new address each time → No linkable pattern
```

### The Anonymity Set

**Definition:** Your privacy is proportional to the number of other deposits in the pool.

```
Anonymity Set = Total deposits in pool at withdrawal time

Larger set = More privacy
Smaller set = Less privacy
```

**Rule of Thumb:**
- Minimum: Wait for 10+ deposits
- Recommended: 50+ deposits
- Optimal: 100+ deposits

---

## Module 2: Advanced Privacy Patterns

### Pattern 1: The Mixer Strategy

```
1. Deposit in multiple small amounts
2. Wait for pool to grow
3. Withdraw in different amounts
4. Use new addresses each time
```

**Example:**
```
Deposit 1: 50 XLM → Address A
Deposit 2: 30 XLM → Address A
Deposit 3: 20 XLM → Address A

Wait for 50+ other deposits...

Withdraw 1: 47 XLM → Address B (new)
Withdraw 2: 51 XLM → Address C (new)
```

### Pattern 2: The Time Delay

```
Deposit → Wait 24+ hours → Withdraw
```

**Why:** Makes timing analysis much harder.

### Pattern 3: The Hop

```
Deposit → Withdraw to intermediate → 
Wait → Deposit again → Withdraw to final
```

**Use case:** Maximum privacy for sensitive transactions.

### Pattern 4: Batch Operations

```javascript
// Deposit multiple times in one session
const deposits = [
  { amount: '10', asset: 'XLM' },
  { amount: '25', asset: 'XLM' },
  { amount: '15', asset: 'USDC' },
];

for (const deposit of deposits) {
  await sdk.deposit(wallet, deposit.amount, deposit.asset);
}

// Now you have 3 notes, more privacy!
```

---

## Module 3: Hands-on Exercise

### Exercise: Privacy Challenge

**Scenario:**
> You need to send 500 XLM privately. Design a transaction flow that maximizes privacy.

**Constraints:**
- Pool currently has 200 deposits
- You have 500 XLM in your wallet
- You want maximum privacy

**Solution Template:**
```
Step 1: Split into multiple deposits
  - Deposit 1: ___ XLM
  - Deposit 2: ___ XLM
  - Deposit 3: ___ XLM
  
Step 2: Wait for ___ additional deposits

Step 3: Withdraw pattern
  - Withdraw 1: ___ XLM to Address ___
  - Withdraw 2: ___ XLM to Address ___
  
Step 4: (Optional) Additional hops
```

**Group Discussion:**
- Share your strategies
- Discuss trade-offs (privacy vs. fees vs. time)
- Instructor provides feedback

---

## Module 4: Security Best Practices

### Note Management

**DO:**
- ✅ Use password manager (1Password, Bitwarden)
- ✅ Encrypted backup (VeraCrypt volume)
- ✅ Multiple copies in different locations
- ✅ Test recovery before large deposits

**DON'T:**
- ❌ Store in plain text file
- ❌ Email to yourself
- ❌ Screenshot and store in cloud
- ❌ Share with anyone

### Operational Security

**Before Large Transactions:**
1. Test with small amount first
2. Verify you can withdraw successfully
3. Double-check backup procedure
4. Use dedicated device if possible

**During Transactions:**
1. Verify URL (phishing check)
2. Check contract address
3. Review transaction details carefully
4. Don't rush

**After Transactions:**
1. Confirm on blockchain explorer
2. Update records
3. Monitor for any issues
4. Report suspicious activity

### Common Mistakes

| Mistake | Consequence | Prevention |
|---------|-------------|------------|
| Lost note | Permanent fund loss | Backup in 3+ locations |
| Wrong address | Funds sent to wrong place | Copy-paste, verify first/last chars |
| Rushed withdrawal | Privacy leak | Take time, follow patterns |
| Reused address | Linkable transactions | Generate new address each time |
| Ignored fees | Transaction failure | Keep buffer for fees |

---

## Module 5: Integration Patterns

### For Exchanges

```javascript
// Withdrawal flow for exchange
async function privateWithdrawal(userId, amount, asset) {
  // 1. Deduct from user's exchange balance
  await db.deduct(userId, amount, asset);
  
  // 2. Deposit to PrivacyLayer
  const { note } = await sdk.deposit(exchangeWallet, amount, asset);
  
  // 3. Store note encrypted
  await db.storeEncryptedNote(userId, note);
  
  // 4. Send withdrawal instructions to user
  await email.send(userId, {
    subject: 'Private Withdrawal Instructions',
    note: note, // User must save this!
    instructions: 'Follow withdrawal guide...'
  });
}
```

### For Payment Processors

```javascript
// Accept private payments
async function acceptPrivatePayment(orderId, expectedAmount) {
  // Generate unique deposit memo
  const memo = generateMemo(orderId);
  
  // Wait for deposit with matching memo
  const deposit = await waitForDeposit(memo, expectedAmount);
  
  // Generate withdrawal instruction for merchant
  const withdrawal = await sdk.withdraw(
    processorWallet,
    deposit.note,
    merchantAddress
  );
  
  return withdrawal;
}
```

---

## Assessment

### Privacy Design Challenge

**Scenario:** Design a privacy-preserving payroll system using PrivacyLayer.

**Requirements:**
- Company pays 10 employees monthly
- Each salary should be private
- Employees should be able to withdraw privately

**Deliverable:**
- Architecture diagram
- Transaction flow
- Privacy guarantees

### Quiz

1. What is the minimum recommended anonymity set?
   - **Answer:** 50+ deposits

2. Why split large deposits into smaller ones?
   - **Answer:** Makes amount analysis harder

3. What's the biggest security risk?
   - **Answer:** Losing your note

---

## Resources

### Further Reading
- [Privacy Threat Model](../../security/threat-model.md)
- [Security Best Practices](../../security/best-practices.md)
- [Integration Guide](../../developers/integration-guide.md)

### Tools
- [Privacy Score Calculator](https://tools.privacylayer.org/score)
- [Address Generator](https://tools.privacylayer.org/addresses)
- [Transaction Planner](https://tools.privacylayer.org/plan)

---

**Next:** [Workshop 3: Developer Integration](../workshop-3-developers/README.md)

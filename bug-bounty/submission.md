# 📝 Submission Guidelines

Thank you for researching PrivacyLayer security! This guide explains how to submit vulnerability reports.

## How to Submit

### Method 1: Email (Preferred)

**Send to**: security@privacylayer.io

**Subject Line**: `[Vulnerability Report] <Brief Description>`

**Example**:
```
Subject: [Vulnerability Report] Double-spending via nullifier collision
```

### Method 2: GitHub Security Advisory

**URL**: https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new

This is preferred for code-level vulnerabilities.

### Method 3: Immunefi (Coming Soon)

We're onboarding to Immunefi. Once live, you can submit via their platform.

---

## Report Template

### Required Information

```markdown
# Vulnerability Report

## Summary
Brief description of the vulnerability (1-2 sentences)

## Severity
- [ ] Critical ($5,000-$10,000)
- [ ] High ($2,000-$5,000)
- [ ] Medium ($500-$2,000)
- [ ] Low ($100-$500)

## Affected Component
- [ ] Smart Contracts (Soroban)
- [ ] ZK Circuits (Noir)
- [ ] Cryptographic Operations
- [ ] SDK
- [ ] Frontend
- [ ] Other: ___________

## Description
Detailed description of the vulnerability

## Impact
What can an attacker achieve? Include:
- Fund loss potential
- Privacy impact
- Attack complexity
- Likelihood of exploitation

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3
4. ...

## Proof of Concept
Include code, screenshots, or videos demonstrating the vulnerability

## Suggested Fix (Optional)
How would you fix this vulnerability?

## Environment
- Network: Mainnet / Testnet
- Contract Version: X.X.X
- Tools Used: (e.g., Foundry, Noir, etc.)

## Researcher Info
- Name/Pseudonym: ___________
- Wallet Address (for payment): ___________
- Public Recognition: Yes / No
- Contact Email: ___________
```

---

## Example Submission

### Critical Vulnerability Example

**Subject**: [Vulnerability Report] Nullifier collision allows double-spending

**Body**:

```markdown
# Vulnerability Report

## Summary
The nullifier generation function has a collision vulnerability, allowing 
attackers to withdraw the same funds twice.

## Severity
- [x] Critical ($5,000-$10,000)

## Affected Component
- [x] Smart Contracts (Soroban)
- [x] ZK Circuits (Noir)

## Description
The nullifier is computed as `hash(nullifier, secret)` using Poseidon. 
However, due to insufficient input validation in the circuit, an attacker 
can craft two different `(nullifier, secret)` pairs that produce the same 
nullifier hash.

This allows:
1. Deposit funds once
2. Withdraw using first (nullifier, secret) pair
3. Withdraw again using second pair (same nullifier hash)
4. Nullifier check passes, funds withdrawn twice

## Impact
- **Fund Loss**: 100% of deposited funds can be stolen
- **Privacy**: None (doesn't affect anonymity)
- **Complexity**: Low (simple parameter manipulation)
- **Likelihood**: High (easily exploitable)

**Estimated Severity**: Critical

## Steps to Reproduce

1. Deploy PrivacyPool contract locally
2. Call `deposit()` with commitment `C1`
3. Generate two (nullifier, secret) pairs that produce same hash:
   - Pair 1: (N1, S1) → hash(N1, S1) = H
   - Pair 2: (N2, S2) → hash(N2, S2) = H (collision!)
4. Call `withdraw()` with proof using (N1, S1) → Success
5. Call `withdraw()` with proof using (N2, S2) → Success (should fail!)

Expected: Second withdrawal should fail (nullifier already used)  
Actual: Both withdrawals succeed

## Proof of Concept

```rust
// Test case showing nullifier collision
#[test]
fn test_nullifier_collision() {
    let n1 = Field::from(123);
    let s1 = Field::from(456);
    let n2 = Field::from(789);
    let s2 = Field::from(012);
    
    let h1 = poseidon2_hash([n1, s1]);
    let h2 = poseidon2_hash([n2, s2]);
    
    assert_eq!(h1, h2); // Collision!
}
```

Full PoC: https://github.com/yourname/privacylayer-poc

## Suggested Fix

Add domain separation to nullifier generation:

```rust
// Before:
let nullifier = poseidon2_hash([nullifier, secret]);

// After:
let nullifier = poseidon2_hash([
    poseidon2_hash([DOMAIN_SEPARATOR_NULLIFIER]),
    nullifier,
    secret
]);
```

## Environment
- Network: Local testnet
- Contract Version: commit abc123
- Tools Used: Rust, Noir

## Researcher Info
- Name/Pseudonym: CryptoResearcher
- Wallet Address: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
- Public Recognition: Yes
- Contact Email: researcher@example.com
```

---

## What Happens Next

### Step 1: Acknowledgment (24 hours)

You'll receive an email confirming we received your report.

### Step 2: Triage (72 hours)

Our team reviews the report and:
- Validates the vulnerability
- Assigns initial severity
- Requests additional info if needed

### Step 3: Validation (3-7 days)

We reproduce the vulnerability and:
- Confirm severity
- Determine bounty amount
- Begin developing fix

### Step 4: Fix Development (14-30 days)

We:
- Develop a fix
- Test the fix
- Prepare deployment

### Step 5: Deployment (30-45 days)

We:
- Deploy fix to testnet
- Verify fix works
- Deploy to mainnet

### Step 6: Payment (7 days after deployment)

You:
- Receive bounty notification
- Provide payment wallet
- Receive USDC payment

---

## Quality Criteria

### High-Quality Reports Include

- ✅ Clear, concise description
- ✅ Working proof of concept
- ✅ Step-by-step reproduction
- ✅ Impact assessment
- ✅ Affected component identification
- ✅ Suggested fix (bonus)
- ✅ Minimal/no code exposure

### Low-Quality Reports Lack

- ❌ Vague descriptions
- ❌ No proof of concept
- ❌ Missing reproduction steps
- ❌ No impact assessment
- ❌ Already known/public
- ❌ Out of scope

---

## Rules & Guidelines

### ✅ Do

- Test with your own accounts/funds only
- Report vulnerabilities promptly
- Provide clear, actionable information
- Keep findings confidential until fix deployed
- Respond to questions promptly

### ❌ Don't

- Access others' data or funds
- Disclose publicly before fix
- Demand immediate payment
- Submit duplicate reports
- Exploit beyond proof of concept
- Violate laws or regulations

---

## Safe Harbor

We commit to:
- ✅ No legal action for good-faith research
- ✅ Confidentiality until fix deployed
- ✅ Fair and prompt bounty evaluation
- ✅ Public recognition (if desired)
- ✅ Prompt payment

---

## FAQs

### Can I report anonymously?

Yes, but you must provide a contact method for payment.

### How long until I get paid?

Typically 30-60 days from report (depends on fix complexity).

### What if I find multiple vulnerabilities?

Submit separate reports for each vulnerability.

### Can I get a partial bounty?

Yes, for vulnerabilities with limited impact or incomplete reports.

### What if I disagree with the bounty amount?

Email security@privacylayer.io with `[Bounty Appeal]` in subject.

---

## Contact

- **Security Email**: security@privacylayer.io
- **GitHub Security**: [Report Advisory](https://github.com/ANAVHEOBA/PrivacyLayer/security/advisories/new)
- **General Questions**: Open a GitHub issue with `[security question]` tag

---

**Ready to submit?** Email security@privacylayer.io with your report!

---

**Last Updated**: April 2026  
**Version**: 1.0

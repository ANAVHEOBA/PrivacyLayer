# 💰 Bounty Rewards

PrivacyLayer offers competitive USDC rewards for security vulnerabilities. Rewards are based on **severity**, **impact**, and **quality** of the report.

## Reward Tiers

### 🔴 Critical: $5,000 - $10,000 USDC

**Definition**: Direct fund theft, complete protocol compromise, or catastrophic privacy breach.

**Examples**:
- ✅ Double-spending vulnerability allowing theft of deposited funds
- ✅ Nullifier collision allowing withdrawal of others' funds
- ✅ Admin key leakage or bypass
- ✅ Complete deanonymization of all users
- ✅ ZK soundness error allowing invalid proofs
- ✅ Merkle tree manipulation allowing fake commitments
- ✅ Smart contract logic error enabling unrestricted withdrawals

**Requirements**:
- Working proof of concept
- Clear reproduction steps
- Impact assessment
- Proposed remediation (optional but appreciated)

**Maximum Reward**: $10,000 USDC  
**Minimum Reward**: $5,000 USDC

---

### 🟠 High: $2,000 - $5,000 USDC

**Definition**: Significant fund loss, major privacy breach, or critical security bypass.

**Examples**:
- ✅ Withdrawal without valid ZK proof
- ✅ Merkle tree depth bypass
- ✅ Front-running attack leading to fund loss
- ✅ Partial deanonymization of users
- ✅ Circuit constraint bypass
- ✅ Proof malleability
- ✅ Reentrancy attack
- ✅ Access control bypass

**Requirements**:
- Working proof of concept
- Clear reproduction steps
- Impact assessment

**Maximum Reward**: $5,000 USDC  
**Minimum Reward**: $2,000 USDC

---

### 🟡 Medium: $500 - $2,000 USDC

**Definition**: Limited fund loss, privacy degradation, or security weakness.

**Examples**:
- ✅ Input validation bypass
- ✅ Denial of service vector
- ✅ Gas optimization leading to failed transactions
- ✅ Race condition in deposit/withdraw flow
- ✅ Timing attack potential
- ✅ Side-channel information leakage
- ✅ Integer overflow/underflow
- ✅ Unhandled error conditions

**Requirements**:
- Clear description of vulnerability
- Reproduction steps
- Potential impact

**Maximum Reward**: $2,000 USDC  
**Minimum Reward**: $500 USDC

---

### 🟢 Low: $100 - $500 USDC

**Definition**: Minimal impact, informational, or best practice violations.

**Examples**:
- ✅ Minor logic errors without fund loss
- ✅ UI/UX bugs with minor security implications
- ✅ Documentation errors exposing sensitive info
- ✅ Missing input validation (low impact)
- ✅ Gas inefficiencies
- ✅ Code quality issues
- ✅ Logging sensitive information

**Requirements**:
- Clear description
- Suggested fix

**Maximum Reward**: $500 USDC  
**Minimum Reward**: $100 USDC

---

## Reward Determination

### Factors Increasing Reward

1. **High Severity** — Critical/High vulnerabilities receive base reward
2. **Clear Impact** — Demonstrated real-world impact
3. **Working PoC** — Functional proof of concept code
4. **Detailed Report** — Comprehensive documentation
5. **Proposed Fix** — Remediation suggestions
6. **Novel Attack** — Creative or previously unknown attack vector
7. **Early Report** — Vulnerability not yet exploited

### Factors Decreasing Reward

1. **Low Severity** — Medium/Low vulnerabilities receive lower base
2. **Theoretical Impact** — No working proof of concept
3. **Incomplete Report** — Missing reproduction steps
4. **Duplicate Report** — Already reported by someone else
5. **Publicly Known** — Already disclosed elsewhere
6. **Out of Scope** — Not eligible for reward

---

## Special Rewards

### 🏆 Bonus Rewards

**Novel Cryptographic Attack**: +$2,000 USDC  
*For discovering a novel attack on BN254, Poseidon, or ZK proofs*

**Chain Reaction Vulnerability**: +$1,500 USDC  
*For finding multiple related vulnerabilities*

**Elegant Report**: +$500 USDC  
*For exceptionally well-written, clear, and actionable reports*

**Fast Response**: +$500 USDC  
*For reporting a vulnerability within 7 days of code release*

### 🎖️ Hall of Fame Bonus

Top 3 researchers by total bounty earnings receive:
- 🥇 **1st Place**: Permanent feature in Hall of Fame + bonus reward
- 🥈 **2nd Place**: Hall of Fame recognition + bonus reward
- 🥉 **3rd Place**: Hall of Fame recognition + bonus reward

---

## Payment Process

### Timeline

| Step | Timeframe |
|------|-----------|
| 1. Report Received | Day 0 |
| 2. Initial Triage | 24-72 hours |
| 3. Vulnerability Validated | 3-7 days |
| 4. Bounty Determined | 7-14 days |
| 5. Fix Developed | 14-30 days |
| 6. Fix Deployed | 30-45 days |
| 7. Payment Processed | 7 days after deployment |

### Payment Method

- **Currency**: USDC on Stellar Network
- **Platform**: Direct transfer or Drips Wave
- **Wallet**: Provided by researcher

### Requirements for Payment

1. ✅ Valid vulnerability confirmed
2. ✅ No disclosure before fix deployed
3. ✅ Provided Stellar wallet address
4. ✅ Signed vulnerability report (optional)

---

## Reward Examples

### Example 1: Critical Vulnerability

**Vulnerability**: Double-spending via nullifier collision  
**Report Quality**: Working PoC, detailed impact, proposed fix  
**Base Reward**: $8,000  
**Bonus**: Novel attack (+$2,000)  
**Total**: **$10,000 USDC**

---

### Example 2: High Vulnerability

**Vulnerability**: Withdrawal without valid ZK proof  
**Report Quality**: Working PoC, clear reproduction  
**Base Reward**: $4,000  
**Bonus**: Elegant report (+$500)  
**Total**: **$4,500 USDC**

---

### Example 3: Medium Vulnerability

**Vulnerability**: Input validation bypass in deposit  
**Report Quality**: Clear description, no PoC  
**Base Reward**: $800  
**Total**: **$800 USDC**

---

### Example 4: Low Vulnerability

**Vulnerability**: Logging sensitive commitment data  
**Report Quality**: Brief description  
**Base Reward**: $200  
**Total**: **$200 USDC**

---

## Disputes

If you disagree with a bounty decision:

1. **Email**: security@privacylayer.io
2. **Subject**: `[Bounty Appeal] <Issue ID>`
3. **Include**: Reasoning, evidence, comparable reports

We will review within **14 days**.

---

## Tax Considerations

- Researchers are responsible for their own tax obligations
- We may require KYC for payments over $10,000
- USDC payments are recorded on-chain

---

## Contact

- **Security Email**: security@privacylayer.io
- **PGP Key**: [To be added]
- **Payment Inquiries**: payments@privacylayer.io

---

**Last Updated**: April 2026  
**Version**: 1.0

# 🔧 Immunefi Platform Setup Guide

This guide explains how to set up PrivacyLayer's bug bounty program on Immunefi.

## Prerequisites

Before starting:
- ✅ SECURITY.md created
- ✅ Bug bounty documentation complete
- ✅ Scope clearly defined
- ✅ Reward tiers determined
- ✅ Team availability confirmed

---

## Step 1: Create Immunefi Account

1. Visit **https://immunefi.com/**
2. Click **"Start a Program"**
3. Sign up with:
   - Email: security@privacylayer.io
   - Organization: PrivacyLayer
   - Website: https://privacylayer.io (or GitHub repo)

---

## Step 2: Program Setup

### Basic Information

```yaml
Program Name: PrivacyLayer
Tagline: First ZK-proof shielded pool on Stellar
Category: DeFi / Privacy
Network: Stellar Network

Description: |
  PrivacyLayer enables compliance-forward private transactions on Stellar. 
  Users deposit fixed-denomination XLM or USDC into a shielded pool, then 
  withdraw using a zero-knowledge proof — with no on-chain link between 
  deposit and withdrawal.
  
  Built with:
  - Noir ZK circuits (BN254, Poseidon hash)
  - Soroban smart contracts (Rust)
  - Protocol 25 native cryptographic primitives

Website: https://github.com/ANAVHEOBA/PrivacyLayer
Repository: https://github.com/ANAVHEOBA/PrivacyLayer
```

### Contact Information

```yaml
Security Email: security@privacylayer.io
Technical Contact: [Team Lead Email]
Program Manager: [PM Email]
Twitter: @PrivacyLayer (if available)
Discord: [Invite Link] (when available)
```

---

## Step 3: Define Scope

### In-Scope Assets

Add each asset individually:

#### Asset 1: Smart Contracts

```yaml
Name: Privacy Pool Contract
Type: Smart Contract
Network: Stellar Mainnet
Address: [Deployed Contract ID]
Importance: Critical
Description: Main privacy pool contract handling deposits and withdrawals

Code Locations:
  - contracts/privacy_pool/src/contract.rs
  - contracts/privacy_pool/src/core/deposit.rs
  - contracts/privacy_pool/src/core/withdraw.rs
  - contracts/privacy_pool/src/crypto/merkle.rs
  - contracts/privacy_pool/src/crypto/verifier.rs
```

#### Asset 2: ZK Circuits

```yaml
Name: Zero-Knowledge Circuits
Type: Cryptography
Network: N/A
Address: https://github.com/ANAVHEOBA/PrivacyLayer/tree/main/circuits
Importance: Critical
Description: Noir circuits for ZK proofs (commitment, withdrawal, Merkle)

Code Locations:
  - circuits/commitment/
  - circuits/withdraw/
  - circuits/merkle/
  - circuits/lib/
```

#### Asset 3: SDK

```yaml
Name: PrivacyLayer SDK
Type: Library/SDK
Network: N/A
Address: https://github.com/ANAVHEOBA/PrivacyLayer/tree/main/sdk
Importance: High
Description: TypeScript SDK for interacting with PrivacyLayer

Code Locations:
  - sdk/src/
```

### Out of Scope

```yaml
Out of Scope:
  - Social engineering attacks
  - DDoS attacks
  - Third-party dependencies
  - Testnet deployments
  - UI/UX bugs without security impact
```

---

## Step 4: Set Reward Tiers

### Immunefi Reward Structure

```yaml
Rewards:
  Critical:
    Minimum: $5,000 USDC
    Maximum: $10,000 USDC
    Examples:
      - Double-spending vulnerability
      - Nullifier collision
      - ZK soundness error
    
  High:
    Minimum: $2,000 USDC
    Maximum: $5,000 USDC
    Examples:
      - Withdrawal without valid proof
      - Merkle tree manipulation
      - Access control bypass
    
  Medium:
    Minimum: $500 USDC
    Maximum: $2,000 USDC
    Examples:
      - Input validation bypass
      - Denial of service
      - Race conditions
    
  Low:
    Minimum: $100 USDC
    Maximum: $500 USDC
    Examples:
      - Minor logic errors
      - Documentation issues
      - Gas optimizations
```

---

## Step 5: Customize Program Page

### Program Description

```markdown
# 🐛 PrivacyLayer Bug Bounty

Protecting privacy, securing funds.

## About PrivacyLayer

PrivacyLayer is the first ZK-proof shielded pool on Stellar Soroban, enabling 
compliance-forward private transactions using zero-knowledge proofs.

## Technology Stack

- **ZK Circuits**: Noir (BN254, Poseidon)
- **Smart Contracts**: Soroban (Rust)
- **Cryptographic Primitives**: Protocol 25 native (BN254, Poseidon2)

## Bounty Scope

We reward vulnerabilities in:
- ✅ Smart contracts (Soroban)
- ✅ ZK circuits (Noir)
- ✅ Cryptographic operations
- ✅ SDK and frontend

## Rewards

- **Critical**: $5,000 - $10,000 USDC
- **High**: $2,000 - $5,000 USDC
- **Medium**: $500 - $2,000 USDC
- **Low**: $100 - $500 USDC

## Contact

- Security Email: security@privacylayer.io
- GitHub: https://github.com/ANAVHEOBA/PrivacyLayer

[View Full Program Details →](https://immunefi.com/bounty/privacylayer)
```

---

## Step 6: Set Up Payment Method

### Configure Cryptocurrency Payments

```yaml
Payment Method: USDC on Stellar
Wallet Address: [Team's Stellar Wallet]
Payment Timeline: 7 days after fix deployment
Minimum KYC Threshold: $10,000
```

### Payment Process

1. Researcher provides Stellar wallet address
2. Team verifies vulnerability fix is deployed
3. Team initiates USDC transfer
4. Payment confirmed on-chain
5. Researcher notified

---

## Step 7: Configure Notifications

### Team Notifications

```yaml
Email Alerts:
  - New submission: security@privacylayer.io
  - Critical/High: +team-lead-email
  - Weekly digest: program-manager-email

Slack/Discord Integration:
  - New submission: #security-alerts
  - Critical issues: @security-team
```

### Researcher Notifications

```yaml
Auto-Reply:
  Template: |
    Thank you for your submission to PrivacyLayer's bug bounty program!
    
    We've received your report and will begin triage within 24-72 hours.
    
    Reference ID: [Auto-generated]
    
    We'll keep you updated on progress.
    
    - PrivacyLayer Security Team
```

---

## Step 8: Launch Program

### Pre-Launch Checklist

- [ ] All assets added and verified
- [ ] Reward tiers configured
- [ ] Contact information correct
- [ ] Team notifications set up
- [ ] Payment wallet funded
- [ ] SECURITY.md published
- [ ] Team availability confirmed

### Launch Process

1. Submit program for Immunefi review
2. Await approval (typically 2-5 days)
3. Address any feedback
4. Program goes live!

---

## Step 9: Program Management

### Weekly Tasks

- Review new submissions
- Triage and validate reports
- Communicate with researchers
- Update bounty status
- Process payments

### Monthly Tasks

- Update program scope
- Review bounty amounts
- Analyze submission trends
- Update documentation
- Recognize top researchers

---

## Step 10: Community Engagement

### Promote Program

```yaml
Channels:
  - Twitter: Announce launch
  - Discord: #security channel
  - GitHub: SECURITY.md link
  - Blog: Launch announcement
  - Forums: Stellar community
```

### Recognize Researchers

- Update Hall of Fame monthly
- Tweet about significant findings
- Provide references (if requested)
- Invite top researchers to private channels

---

## Additional Resources

### Immunefi Documentation

- [Getting Started Guide](https://docs.immunefi.com/)
- [Best Practices](https://docs.immunefi.com/program/best-practices)
- [Reward Guidelines](https://docs.immunefi.com/program/rewards)

### PrivacyLayer Resources

- **SECURITY.md**: [../SECURITY.md](../SECURITY.md)
- **Scope**: [scope.md](scope.md)
- **Rewards**: [rewards.md](rewards.md)
- **Submission Guide**: [submission.md](submission.md)

---

## Contact Immunefi Support

- **Email**: support@immunefi.com
- **Discord**: [Immunefi Discord](https://discord.gg/immunefi)
- **Help Center**: https://help.immunefi.com/

---

## Timeline Estimate

| Task | Duration |
|------|----------|
| Account Setup | 1 day |
| Program Configuration | 2-3 days |
| Immunefi Review | 2-5 days |
| Launch | 1 day |
| **Total** | **6-10 days** |

---

**Last Updated**: April 2026  
**Version**: 1.0  
**Status**: Ready for implementation

# Security Policy

## 🔒 Reporting Security Vulnerabilities

PrivacyLayer is a privacy-focused DeFi protocol handling user funds. We take security vulnerabilities seriously and appreciate responsible disclosure.

### How to Report

**🔐 Preferred Method**: Email

Send security reports to: **security@privacylayer.io**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Proof of concept (if available)
- Your contact information

**⏰ Response Time**

- **Initial Response**: Within 24 hours
- **Triage Confirmation**: Within 72 hours
- **Status Updates**: Every 7 days until resolution

### 🐛 Bug Bounty Program

PrivacyLayer runs an active bug bounty program with **USDC rewards** for valid security findings.

**💰 Reward Range**: $100 - $10,000 USDC

**📊 Scope**:
- ✅ Smart contracts (Soroban)
- ✅ ZK circuits (Noir)
- ✅ Cryptographic implementations
- ✅ SDK and frontend
- ✅ Integration vulnerabilities

**📋 Full Details**: See [bug-bounty/README.md](bug-bounty/README.md)

### 🚫 Out of Scope

The following are **NOT** eligible for rewards:
- Social engineering attacks
- DDoS attacks
- Spam or rate limiting issues
- Third-party dependencies (report to them directly)
- Vulnerabilities in test networks
- Issues requiring physical access
- UI/UX bugs without security impact

### 📜 Safe Harbor

We commit to:
- **No legal action** against researchers following responsible disclosure
- **Confidentiality** of your findings until fixed
- **Public recognition** (if desired) after resolution
- **Prompt payment** of bounties

### 🔧 Security Best Practices

For developers working on PrivacyLayer:

1. **Never commit secrets** (private keys, API tokens)
2. **Validate all inputs** (especially cryptographic operations)
3. **Use constant-time comparisons** for sensitive data
4. **Follow the principle of least privilege**
5. **Test edge cases** (zero values, max values, invalid inputs)
6. **Review cryptographic implementations** carefully
7. **Report suspicious findings** immediately

### 📚 Security Resources

- [Stellar Security Best Practices](https://developers.stellar.org/docs/learn/security)
- [Soroban Security Guidelines](https://soroban.stellar.org/docs/learn/security)
- [Noir Security Considerations](https://noir-lang.org/docs/how_to/write_circuits)
- [OWASP Smart Contract Top 10](https://owasp.org/www-project-smart-contract-top-10/)

### 🎯 Security Goals

PrivacyLayer aims to:
- ✅ Protect user privacy (zero-knowledge proofs)
- ✅ Secure user funds (audited contracts)
- ✅ Maintain decentralization (no admin backdoors)
- ✅ Ensure cryptographic correctness (BN254/Poseidon)
- ✅ Prevent double-spending (nullifier tracking)
- ✅ Resist front-running (commit-reveal schemes)

### 📞 Contact

- **Security Email**: security@privacylayer.io
- **PGP Key**: [To be added]
- **Bug Bounty**: [bug-bounty/README.md](bug-bounty/README.md)
- **General Questions**: [GitHub Issues](https://github.com/ANAVHEOBA/PrivacyLayer/issues)

---

## 🏆 Hall of Fame

We thank the following researchers for their responsible disclosure:

*No vulnerabilities reported yet. Be the first!*

---

**Last Updated**: April 2026  
**Version**: 1.0

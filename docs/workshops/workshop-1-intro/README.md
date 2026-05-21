# Workshop 1: Introduction to PrivacyLayer

**Duration:** 90 minutes  
**Level:** Beginner  
**Format:** Hands-on workshop  
**Max Participants:** 50

---

## Workshop Overview

This workshop introduces developers to PrivacyLayer, a privacy protocol on Stellar using zero-knowledge proofs. Participants will learn the basics and make their first private transaction.

### Learning Objectives

By the end of this workshop, participants will be able to:
- ✅ Explain what PrivacyLayer is and why privacy matters
- ✅ Set up a wallet and get testnet funds
- ✅ Make a deposit and withdraw privately
- ✅ Understand the basic ZK proof concept

### Prerequisites

- Laptop with Chrome/Firefox installed
- Basic understanding of blockchain/cryptocurrency
- No prior ZK knowledge required

---

## Agenda

| Time | Activity | Format |
|------|----------|--------|
| 0:00-0:10 | Welcome & Introductions | Presentation |
| 0:10-0:25 | What is PrivacyLayer? | Presentation + Demo |
| 0:25-0:40 | Setup: Wallet & Testnet | Hands-on |
| 0:40-1:00 | First Private Transaction | Hands-on |
| 1:00-1:15 | Q&A + Troubleshooting | Discussion |
| 1:15-1:30 | Next Steps & Resources | Presentation |

---

## Materials

### For Instructors

- [ ] Slides: `slides/intro-to-privacylayer.pdf`
- [ ] Demo environment: `demo.privacylayer.org`
- [ ] Troubleshooting guide: `instructor-guide.md`
- [ ] Participant checklist: `checklist.md`

### For Participants

- [ ] Setup guide: `setup-guide.md`
- [ ] Cheat sheet: `quick-reference.pdf`
- [ ] Recording: (will be shared post-workshop)
- [ ] Code examples: `examples/` folder

---

## Detailed Script

### 0:00-0:10 Welcome & Introductions

**Instructor:**
> "Welcome everyone! I'm [Name], and I'll be your instructor today.
>
> Quick show of hands:
> - Who has used Stellar before?
> - Who has heard of zero-knowledge proofs?
> - Who has used a privacy protocol?
>
> Great! This workshop is designed for all levels.
>
> **Housekeeping:**
> - Mute when not speaking
> - Use chat for questions
> - We'll have Q&A at the end
> - Recording will be shared"

### 0:10-0:25 What is PrivacyLayer?

**Key Points:**
1. Problem: Transparent blockchains expose everything
2. Solution: Shielded pool with ZK proofs
3. Demo: Show public vs. private transaction

**Demo Script:**
> "Let me show you the difference.
>
> [Open Stellar Expert]
> This is a public transaction—everyone can see sender, receiver, amount.
>
> [Open PrivacyLayer demo]
> Now with PrivacyLayer, you deposit to a pool, then withdraw privately.
> No link between deposit and withdrawal.
>
> Let me make a quick live deposit..."

### 0:25-0:40 Setup: Wallet & Testnet

**Step-by-step:**
1. Install Freighter: https://freighter.app
2. Create wallet (5 min)
3. Get testnet XLM: https://laboratory.stellar.org
4. Verify balance

**Common Issues:**
- Browser compatibility (Chrome/Firefox only)
- Ad blockers interfering
- Testnet faucet limits

### 0:40-1:00 First Private Transaction

**Guided Exercise:**

**Step 1: Connect Wallet**
```
1. Go to demo.privacylayer.org
2. Click "Connect Freighter"
3. Approve connection
```

**Step 2: Deposit**
```
1. Enter amount: 100 XLM
2. Click "Deposit"
3. Approve in Freighter
4. ⚠️ SAVE THE NOTE! (emphasize)
```

**Step 3: Withdraw**
```
1. Paste note
2. Enter recipient (new address for privacy)
3. Click "Withdraw"
4. Wait for proof generation
5. Approve in Freighter
```

**Instructor Role:**
- Monitor chat for issues
- Help participants stuck on any step
- Share troubleshooting tips

### 1:00-1:15 Q&A + Troubleshooting

**Common Questions:**
- "What if I lose my note?" → Funds lost, backup is critical
- "Is this really private?" → Yes, explain ZK proof briefly
- "Can I use on mainnet?" → Not yet, wait for audit
- "How much does it cost?" → Network fees only

### 1:15-1:30 Next Steps & Resources

**Learning Path:**
1. ✅ Complete this workshop
2. 📖 Read documentation: docs.privacylayer.org
3. 🎥 Watch advanced tutorial
4. 💻 Try SDK integration
5. 🏆 Participate in bounty program

**Resources:**
- Documentation: https://docs.privacylayer.org
- GitHub: https://github.com/ANAVHEOBA/PrivacyLayer
- Discord: https://discord.gg/privacylayer
- Bounty Issues: https://github.com/ANAVHEOBA/PrivacyLayer/issues?q=label:bounty

**Closing:**
> "Thanks everyone! You've made your first private transaction.
>
> Next steps:
> - Check your email for recording and materials
> - Join our Discord for ongoing support
> - Check out the bounty program if you want to contribute
>
> Stay private! 🙌"

---

## Assessment

### Quick Quiz (Optional)

1. What happens if you lose your note?
   - **Answer:** Funds are irrecoverable

2. What makes PrivacyLayer private?
   - **Answer:** Zero-knowledge proofs hide the link between deposit/withdrawal

3. Can you withdraw twice with the same note?
   - **Answer:** No, nullifier prevents double-spend

### Success Criteria

Participants successfully:
- [ ] Connected wallet
- [ ] Made a deposit
- [ ] Saved their note
- [ ] Made a withdrawal
- [ ] Verified transaction on explorer

---

## Follow-up

### Email Template (Post-Workshop)

```
Subject: PrivacyLayer Workshop - Recording & Resources

Hi everyone,

Thanks for attending today's workshop!

Here are the resources:
- Recording: [link]
- Slides: [link]
- Code examples: [link]
- Documentation: https://docs.privacylayer.org

Next workshop: [Date] - Advanced Privacy Techniques

Questions? Reply to this email or join our Discord.

Stay private!
[Your name]
```

### Feedback Survey

Send survey 24 hours post-workshop:
- Content quality (1-5)
- Pace (too fast/just right/too slow)
- Hands-on time (enough/not enough)
- What to improve
- Likelihood to recommend (NPS)

---

**Related:** [Workshop 2: Advanced Privacy Techniques](../workshop-2-advanced/README.md) | [Workshop 3: Developer Integration](../workshop-3-developers/README.md)

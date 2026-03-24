# Judging Rubric

> How hackathon projects are evaluated.

## Overview

Projects are scored across 4 categories with a total of 100 points.

## Category Breakdown

### 1. Privacy Implementation (30 points)

**How effectively does the project use PrivacyLayer?**

| Score | Criteria |
|-------|----------|
| 25-30 | Multiple privacy features, creative use of zk-SNARKs, handles edge cases |
| 18-24 | Solid privacy implementation, covers main use cases |
| 10-17 | Basic privacy features, some gaps in implementation |
| 0-9 | Privacy is superficial or missing key features |

**What judges look for:**
- Shield/unshield operations work correctly
- Private transactions hide sender/recipient/amount
- Proper nullifier handling (no double-spend)
- Viewing keys implemented for compliance
- Privacy is core to the application, not bolted on

### 2. Innovation (25 points)

**How novel is the application of privacy technology?**

| Score | Criteria |
|-------|----------|
| 21-25 | Unique use case we haven't seen before, creative problem solving |
| 15-20 | Interesting twist on existing concept, some originality |
| 8-14 | Standard use case, minor differentiation |
| 0-7 | Clone of existing project, no new ideas |

**What judges look for:**
- New vertical or industry application
- Combination with other technologies
- Novel UX patterns for private interactions
- Solves a real problem in an unexpected way

### 3. Functionality (25 points)

**Does the project actually work?**

| Score | Criteria |
|-------|----------|
| 21-25 | Fully functional, no bugs, polished UX, live demo works |
| 15-20 | Core features work, minor bugs, decent UX |
| 8-14 | Some features work, major bugs, basic UX |
| 0-7 | Broken or incomplete, doesn't demonstrate privacy |

**What judges look for:**
- Live demo that judges can try
- Real transactions on testnet
- No critical bugs or crashes
- Intuitive user experience
- Complete user flows (not just one feature)

### 4. Presentation (20 points)

**How well is the project presented?**

| Score | Criteria |
|-------|----------|
| 17-20 | Clear pitch, excellent documentation, compelling demo video |
| 12-16 | Good presentation, adequate docs, decent video |
| 6-11 | Okay pitch, minimal docs, no video or poor quality |
| 0-5 | Unclear what was built, no documentation |

**What judges look for:**
- Clear explanation of problem and solution
- Demo video shows actual functionality
- README with setup instructions
- Team can explain technical decisions
- Passion and enthusiasm for the project

## Bonus Points

Additional points awarded for:

| Achievement | Points |
|-------------|--------|
| Uses multiple PrivacyLayer features | +5 |
| Integrates with other Stellar protocols | +5 |
| Social impact or accessibility focus | +5 |
| Production-quality code | +5 |
| Creative UI/UX design | +3 |
| Comprehensive test coverage | +3 |

## Red Flags

Projects may lose points for:

- **Security issues:** Hardcoded keys, exposed secrets (-10)
- **Plagiarism:** Copied code without attribution (-20, disqualification)
- **No privacy:** Project doesn't actually use PrivacyLayer (-15)
- **Fake demo:** Demo video shows mockups not real app (-10)

## Example Scoring

### Project A: Private Donation Platform

| Category | Score | Notes |
|----------|-------|-------|
| Privacy | 26/30 | Full shield/unshield, viewing keys for nonprofits |
| Innovation | 22/25 | First private donation platform on Stellar |
| Functionality | 23/25 | Works end-to-end, minor UI polish needed |
| Presentation | 18/20 | Great video, clear README |
| **Bonus** | +10 | Soroban integration + accessibility |
| **Total** | **99/100** | Strong contender |

### Project B: Private Chat App

| Category | Score | Notes |
|----------|-------|-------|
| Privacy | 15/30 | Only uses privacy for payments, not messages |
| Innovation | 18/25 | Chat + payments is interesting |
| Functionality | 12/25 | Messages work, payments broken |
| Presentation | 10/20 | Okay pitch, no demo video |
| **Total** | **55/100** | Needs more privacy focus |

## Judging Process

1. **Initial Review:** All projects reviewed by 2+ judges
2. **Scoring:** Each judge scores independently
3. **Calibration:** Judges discuss borderline cases
4. **Final Ranking:** Average scores determine winners
5. **Verification:** Winners may be asked to demo live

## Tips for High Scores

### Privacy (30 pts)
- Use shield, unshield, AND private send
- Show you understand nullifiers
- Implement viewing keys
- Handle errors gracefully

### Innovation (25 pts)
- Don't just clone a DApp
- Think about who needs privacy
- Combine with unexpected tech
- Solve a real problem

### Functionality (25 pts)
- Test everything before submitting
- Have a backup plan if live demo fails
- Make it work for the judges
- Fix bugs, don't just document them

### Presentation (20 pts)
- Practice your pitch
- Make a video even if not required
- Document setup steps
- Be ready to answer questions

## Questions?

Ask in Discord #hackathon channel or email hackathon@privacylayer.io

---

**Good luck! May your privacy be strong and your demo work flawlessly. 🎯**

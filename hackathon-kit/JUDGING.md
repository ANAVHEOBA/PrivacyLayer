# 🏆 Judging Criteria

Projects are scored on a 100-point scale across five categories.

## Scoring Rubric

### 1. Privacy Innovation (30 points)

| Score | Criteria |
|-------|----------|
| 25-30 | Novel privacy primitive or significant improvement to existing approach |
| 18-24 | Creative use of ZK proofs with meaningful privacy guarantees |
| 10-17 | Standard privacy pattern implemented correctly |
| 0-9   | Minimal privacy consideration or broken guarantees |

**What judges look for:**
- Threat model clearly defined
- Privacy guarantees are provable, not just claimed
- Novel use of Noir circuits or PrivacyLayer features

### 2. Technical Implementation (25 points)

| Score | Criteria |
|-------|----------|
| 20-25 | Production-quality code, comprehensive tests, clean architecture |
| 14-19 | Working implementation with tests, minor issues |
| 7-13  | Functional prototype, limited testing |
| 0-6   | Incomplete or non-functional |

**What judges look for:**
- Code compiles and runs without errors
- Tests cover happy path and edge cases
- Circuit constraints are sound (no over/under-constrained)
- Smart contract handles all error cases

### 3. User Experience (20 points)

| Score | Criteria |
|-------|----------|
| 16-20 | Intuitive UX that makes privacy accessible to non-technical users |
| 11-15 | Clean interface with clear user flow |
| 6-10  | Basic UI/CLI that works |
| 0-5   | No user-facing interface |

**What judges look for:**
- Users don't need to understand ZK proofs to use the app
- Clear feedback on transaction status
- Error messages are helpful, not cryptic

### 4. Documentation (15 points)

| Score | Criteria |
|-------|----------|
| 12-15 | Comprehensive docs: setup, usage, architecture, threat model |
| 8-11  | Good README with setup instructions and examples |
| 4-7   | Basic README |
| 0-3   | No documentation |

**What judges look for:**
- README explains what, why, and how
- Architecture diagram included
- Threat model documented
- Setup instructions work on first try

### 5. Completeness & Polish (10 points)

| Score | Criteria |
|-------|----------|
| 8-10  | Demo-ready, handles edge cases, thoughtful details |
| 5-7   | Core features complete, some rough edges |
| 2-4   | MVP with significant gaps |
| 0-1   | Barely started |

## Bonus Points (up to +10)

- **Composability (+3)**: Integrates with existing DeFi/NFT protocols
- **Open Source (+2)**: Clean repo others can build on
- **Live Demo (+3)**: Deployed to devnet with working demo
- **Recursive Proofs (+2)**: Uses proof composition for advanced privacy

## Disqualification Criteria

- ❌ Plagiarized code without attribution
- ❌ Privacy claims that are demonstrably false
- ❌ Malicious code or backdoors
- ❌ Projects that don't use PrivacyLayer at all

## Tips for High Scores

1. **Start with the circuit** — get the ZK proof working first
2. **Write tests early** — judges run your tests
3. **Document your threat model** — shows you understand privacy deeply
4. **Keep scope small** — a polished small project beats an ambitious broken one
5. **Demo, demo, demo** — if judges can't run it, they can't score it

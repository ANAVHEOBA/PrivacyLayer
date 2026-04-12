# Privacy Score Calculator

A TypeScript module that calculates a privacy score (0-100) for pending withdrawals in PrivacyLayer's shielded pool. Helps users understand their privacy posture and provides actionable recommendations before executing a withdrawal.

## Motivation

In ZK-proof privacy pools, the degree of privacy depends on several factors beyond the proof itself. Users who withdraw immediately after depositing, use a linked address, or transact in a pool with few participants get weaker privacy despite valid proofs. This calculator quantifies that risk and guides users toward safer withdrawal timing and practices.

## Scoring Factors

The overall score is a weighted sum of four individual factors:

| Factor | Weight | Description |
|---|---|---|
| **Anonymity Set** | 35% | Number of deposits at the same denomination. Logarithmic scale. |
| **Time Elapsed** | 25% | Time between deposit and withdrawal. Square root curve (early hours matter most). |
| **Pool Diversity** | 15% | How many denomination types are active in the pool. |
| **Withdrawal Pattern** | 25% | Whether the withdrawal address is fresh (never seen on-chain) and unlinked. |

Weights are configurable.

## Privacy Levels

| Score Range | Level | Meaning |
|---|---|---|
| 0-19 | `CRITICAL` | Withdrawal would likely be linkable. Do not withdraw. |
| 20-39 | `LOW` | Weak privacy. Significant improvements needed. |
| 40-59 | `MEDIUM` | Moderate privacy. Follow recommendations. |
| 60-79 | `HIGH` | Good privacy. Minor improvements possible. |
| 80-100 | `MAXIMUM` | Strong privacy. Safe to withdraw. |

## Usage

### Basic Score Calculation

```typescript
import { calculatePrivacyScore, Denomination } from './privacy-score';

const result = calculatePrivacyScore({
  anonymitySetSize: 150,
  depositTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
  activeDenominations: 4,
  isFreshAddress: true,
  denomination: Denomination.Xlm100,
});

console.log(result.score);           // 72
console.log(result.level);           // "HIGH"
console.log(result.breakdown);       // { anonymitySet: 73, timeElapsed: 32, ... }
console.log(result.recommendations); // [{ message: "...", urgency: "RECOMMENDED" }]
```

### Historical Score Tracking

```typescript
import { PrivacyScoreTracker, Denomination } from './privacy-score';

const tracker = new PrivacyScoreTracker();

// Record scores periodically (e.g., every hour)
const result = tracker.trackScore('deposit-abc123', {
  anonymitySetSize: 80,
  depositTimestamp: Date.now() - 6 * 60 * 60 * 1000,
  activeDenominations: 3,
  isFreshAddress: true,
  denomination: Denomination.Usdc100,
});

// Check trend over time
const trend = tracker.getTrend('deposit-abc123'); // "improving" | "stable" | "declining"

// Export/import for persistence
const exported = tracker.exportHistory();
localStorage.setItem('privacy-history', JSON.stringify(exported));

// Later...
const imported = JSON.parse(localStorage.getItem('privacy-history')!);
tracker.importHistory(imported);
```

### Custom Weights

```typescript
const result = calculatePrivacyScore(input, {
  anonymitySet: 0.4,
  timeElapsed: 0.3,
  poolDiversity: 0.1,
  withdrawalPattern: 0.2,
});
```

### Individual Factor Functions

```typescript
import {
  scoreAnonymitySet,
  scoreTimeElapsed,
  scorePoolDiversity,
  scoreWithdrawalPattern,
} from './privacy-score';

scoreAnonymitySet(200);                          // 77
scoreTimeElapsed(Date.now() - 86400000);         // ~29
scorePoolDiversity(4, 5);                        // 80
scoreWithdrawalPattern(true, false);             // 100
```

## Recommendations Engine

The calculator generates prioritized recommendations:

- **REQUIRED** -- Issues that must be addressed before withdrawing (e.g., tiny anonymity set, linked address).
- **RECOMMENDED** -- Improvements that significantly boost privacy (e.g., wait longer, use a fresh address).
- **OPTIONAL** -- Nice-to-have optimizations (e.g., pool diversity, more withdrawal activity).

Each recommendation includes an `estimatedImpact` field (0-100) indicating the approximate score improvement if followed.

## API Reference

### `calculatePrivacyScore(input, weights?): PrivacyScoreResult`

Main entry point. Returns score, level, breakdown, and recommendations.

### `PrivacyScoreTracker`

Class for tracking scores over time with `trackScore()`, `getHistory()`, `getTrend()`, `exportHistory()`, and `importHistory()` methods.

### Types

- `PrivacyScoreInput` -- Input parameters for calculation
- `PrivacyScoreResult` -- Complete result including breakdown and recommendations
- `ScoreBreakdown` -- Individual factor scores
- `PrivacyRecommendation` -- Actionable recommendation with urgency and impact
- `ScoreHistoryEntry` -- Historical snapshot for tracking
- `Denomination` -- Pool denomination enum matching the Soroban contract
- `PrivacyLevel` -- Score classification enum
- `RecommendationUrgency` -- Recommendation priority enum

## Design Decisions

1. **Logarithmic anonymity scaling**: Mirrors real-world diminishing returns. Going from 10 to 100 deposits matters more than 1000 to 2000.
2. **Square root time curve**: Captures the insight that the first few hours of delay provide the most anti-correlation benefit.
3. **Binary withdrawal pattern**: Fresh vs. linked is the dominant factor. Partial credit for known-but-unlinked addresses.
4. **In-memory tracker**: No filesystem or network dependencies. Persistence via export/import lets the caller choose storage (localStorage, IndexedDB, file).

## Related

- [`sdk/cache/proof-cache.ts`](../cache/proof-cache.ts) -- Proof caching system
- [Soroban contract](../../contracts/privacy_pool/) -- On-chain pool logic
- [Issue #59](https://github.com/ANAVHEOBA/PrivacyLayer/issues/59) -- Feature request

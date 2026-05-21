/**
 * PrivacyLayer Privacy Score Calculator
 *
 * Calculates a privacy score (0-100) for pending withdrawals based on
 * anonymity set size, time elapsed since deposit, pool diversity, and
 * withdrawal address patterns. Provides actionable recommendations and
 * historical score tracking.
 *
 * @module privacy-score
 * @see https://github.com/ANAVHEOBA/PrivacyLayer/issues/59
 */

// ============================================================
// TYPES
// ============================================================

/** Supported pool denominations matching the Soroban contract */
export enum Denomination {
  Xlm10 = 'Xlm10',
  Xlm100 = 'Xlm100',
  Xlm1000 = 'Xlm1000',
  Usdc100 = 'Usdc100',
  Usdc1000 = 'Usdc1000',
}

/** Privacy risk level derived from the numeric score */
export enum PrivacyLevel {
  Critical = 'CRITICAL',
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  Maximum = 'MAXIMUM',
}

/** Urgency level for recommendations */
export enum RecommendationUrgency {
  Required = 'REQUIRED',
  Recommended = 'RECOMMENDED',
  Optional = 'OPTIONAL',
}

/** A single actionable recommendation to improve privacy */
export interface PrivacyRecommendation {
  /** Short identifier for the recommendation */
  id: string;
  /** Human-readable description */
  message: string;
  /** How critical this recommendation is */
  urgency: RecommendationUrgency;
  /** Estimated score improvement if followed (0-100) */
  estimatedImpact: number;
}

/** Breakdown of individual factor scores */
export interface ScoreBreakdown {
  /** Score from anonymity set size (0-100) */
  anonymitySet: number;
  /** Score from time elapsed since deposit (0-100) */
  timeElapsed: number;
  /** Score from pool denomination diversity (0-100) */
  poolDiversity: number;
  /** Score from withdrawal address pattern analysis (0-100) */
  withdrawalPattern: number;
}

/** Weights for each scoring factor (must sum to 1.0) */
export interface ScoreWeights {
  anonymitySet: number;
  timeElapsed: number;
  poolDiversity: number;
  withdrawalPattern: number;
}

/** Input parameters for calculating a privacy score */
export interface PrivacyScoreInput {
  /** Total number of deposits in the pool at the same denomination */
  anonymitySetSize: number;
  /** Unix timestamp (ms) when the deposit was made */
  depositTimestamp: number;
  /** Current Unix timestamp (ms) — defaults to Date.now() */
  currentTimestamp?: number;
  /** Number of distinct denominations with active deposits in the pool */
  activeDenominations: number;
  /** Total denominations supported by the protocol */
  totalDenominations?: number;
  /** Whether the withdrawal address has never appeared on-chain */
  isFreshAddress: boolean;
  /** Whether the withdrawal address has received deposits from the same depositor */
  hasLinkedHistory?: boolean;
  /** The denomination of this specific deposit */
  denomination: Denomination;
  /** Number of withdrawals that have occurred since this deposit */
  withdrawalsSinceDeposit?: number;
}

/** Complete result of a privacy score calculation */
export interface PrivacyScoreResult {
  /** Overall privacy score (0-100) */
  score: number;
  /** Privacy level classification */
  level: PrivacyLevel;
  /** Breakdown of individual factor scores */
  breakdown: ScoreBreakdown;
  /** Actionable recommendations sorted by urgency */
  recommendations: PrivacyRecommendation[];
  /** ISO 8601 timestamp of when this score was calculated */
  calculatedAt: string;
  /** Input parameters used for the calculation (for auditability) */
  input: PrivacyScoreInput;
}

/** A historical score record for tracking privacy over time */
export interface ScoreHistoryEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Overall score at this point in time */
  score: number;
  /** Privacy level at this point */
  level: PrivacyLevel;
  /** Factor breakdown */
  breakdown: ScoreBreakdown;
}

/** Configuration for the score tracker */
export interface ScoreTrackerConfig {
  /** Maximum number of history entries to retain per deposit (default: 100) */
  maxHistorySize: number;
  /** Custom scoring weights */
  weights?: Partial<ScoreWeights>;
}

// ============================================================
// CONSTANTS
// ============================================================

/** Default scoring weights — anonymity set is most important */
const DEFAULT_WEIGHTS: ScoreWeights = {
  anonymitySet: 0.35,
  timeElapsed: 0.25,
  poolDiversity: 0.15,
  withdrawalPattern: 0.25,
};

/**
 * Thresholds for anonymity set size scoring.
 * Based on research from Tornado Cash and Penumbra anonymity analysis.
 */
const ANONYMITY_THRESHOLDS = {
  /** Minimum deposits before any meaningful privacy */
  minimum: 5,
  /** Good privacy threshold */
  good: 50,
  /** Strong privacy threshold */
  strong: 200,
  /** Maximum score threshold (diminishing returns beyond this) */
  maximum: 1000,
} as const;

/**
 * Time thresholds in milliseconds.
 * Longer wait times make timing correlation attacks harder.
 */
const TIME_THRESHOLDS = {
  /** 1 hour — minimal privacy */
  minimum: 60 * 60 * 1000,
  /** 24 hours — reasonable privacy */
  good: 24 * 60 * 60 * 1000,
  /** 7 days — strong privacy */
  strong: 7 * 24 * 60 * 60 * 1000,
  /** 30 days — maximum time-based privacy */
  maximum: 30 * 24 * 60 * 60 * 1000,
} as const;

/** Total denomination types in the protocol */
const TOTAL_DENOMINATIONS = 5;

// ============================================================
// SCORING FUNCTIONS
// ============================================================

/**
 * Calculate the anonymity set score (0-100).
 *
 * Uses a logarithmic curve to model the diminishing returns
 * of larger anonymity sets. A set of 1 gives 0; a set of 1000+ gives 100.
 *
 * @param setSize - Number of deposits at the same denomination
 * @returns Score from 0 to 100
 */
export function scoreAnonymitySet(setSize: number): number {
  if (setSize <= 1) return 0;
  if (setSize >= ANONYMITY_THRESHOLDS.maximum) return 100;

  // Logarithmic scaling: score = 100 * ln(size) / ln(max)
  const logScore = (Math.log(setSize) / Math.log(ANONYMITY_THRESHOLDS.maximum)) * 100;
  return Math.min(100, Math.max(0, Math.round(logScore)));
}

/**
 * Calculate the time elapsed score (0-100).
 *
 * Models the privacy gain from waiting between deposit and withdrawal.
 * Immediate withdrawal is 0; waiting 30+ days is 100.
 * Uses a square root curve — early hours matter most.
 *
 * @param depositTimestamp - When the deposit was made (ms)
 * @param currentTimestamp - Current time (ms), defaults to now
 * @returns Score from 0 to 100
 */
export function scoreTimeElapsed(
  depositTimestamp: number,
  currentTimestamp: number = Date.now(),
): number {
  const elapsed = currentTimestamp - depositTimestamp;

  if (elapsed <= 0) return 0;
  if (elapsed >= TIME_THRESHOLDS.maximum) return 100;

  // Square root curve — first hours matter more than later days
  const ratio = elapsed / TIME_THRESHOLDS.maximum;
  const score = Math.sqrt(ratio) * 100;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate the pool diversity score (0-100).
 *
 * Higher diversity (more denomination types active) makes it harder
 * to correlate deposits and withdrawals by amount.
 *
 * @param activeDenominations - Number of denominations with active deposits
 * @param totalDenominations - Total possible denominations (default: 5)
 * @returns Score from 0 to 100
 */
export function scorePoolDiversity(
  activeDenominations: number,
  totalDenominations: number = TOTAL_DENOMINATIONS,
): number {
  if (totalDenominations <= 0) return 0;
  if (activeDenominations <= 0) return 0;

  const ratio = Math.min(activeDenominations, totalDenominations) / totalDenominations;
  return Math.round(ratio * 100);
}

/**
 * Calculate the withdrawal pattern score (0-100).
 *
 * Evaluates how well the withdrawal destination preserves privacy.
 * Fresh (never-seen) addresses are best. Addresses with linked
 * transaction history to the depositor are worst.
 *
 * @param isFreshAddress - Whether this address has never appeared on-chain
 * @param hasLinkedHistory - Whether this address can be linked to the depositor
 * @returns Score from 0 to 100
 */
export function scoreWithdrawalPattern(
  isFreshAddress: boolean,
  hasLinkedHistory: boolean = false,
): number {
  if (hasLinkedHistory) return 0;
  if (isFreshAddress) return 100;
  // Known address but no direct link — partial privacy
  return 50;
}

// ============================================================
// PRIVACY LEVEL CLASSIFICATION
// ============================================================

/**
 * Classify a numeric score into a privacy level.
 *
 * @param score - Privacy score (0-100)
 * @returns The corresponding privacy level
 */
export function classifyPrivacyLevel(score: number): PrivacyLevel {
  if (score < 20) return PrivacyLevel.Critical;
  if (score < 40) return PrivacyLevel.Low;
  if (score < 60) return PrivacyLevel.Medium;
  if (score < 80) return PrivacyLevel.High;
  return PrivacyLevel.Maximum;
}

// ============================================================
// RECOMMENDATIONS ENGINE
// ============================================================

/**
 * Generate actionable recommendations based on the score breakdown.
 *
 * Recommendations are sorted by urgency (REQUIRED first) and
 * provide estimated score impact to help users prioritize.
 *
 * @param breakdown - Individual factor scores
 * @param input - Original input parameters
 * @returns Sorted list of recommendations
 */
export function generateRecommendations(
  breakdown: ScoreBreakdown,
  input: PrivacyScoreInput,
): PrivacyRecommendation[] {
  const recommendations: PrivacyRecommendation[] = [];

  // --- Anonymity set recommendations ---
  if (breakdown.anonymitySet < 30) {
    recommendations.push({
      id: 'wait-for-deposits',
      message:
        `Anonymity set is very small (${input.anonymitySetSize} deposits). ` +
        `Wait for more deposits before withdrawing. At least 50 deposits recommended.`,
      urgency: RecommendationUrgency.Required,
      estimatedImpact: 25,
    });
  } else if (breakdown.anonymitySet < 60) {
    recommendations.push({
      id: 'more-deposits-helpful',
      message:
        `Anonymity set is moderate (${input.anonymitySetSize} deposits). ` +
        `Waiting for more deposits (200+) would improve privacy.`,
      urgency: RecommendationUrgency.Recommended,
      estimatedImpact: 15,
    });
  }

  // --- Time elapsed recommendations ---
  if (breakdown.timeElapsed < 20) {
    const hoursElapsed = input.currentTimestamp
      ? (input.currentTimestamp - input.depositTimestamp) / (60 * 60 * 1000)
      : (Date.now() - input.depositTimestamp) / (60 * 60 * 1000);

    recommendations.push({
      id: 'wait-longer',
      message:
        `Only ${hoursElapsed.toFixed(1)} hours since deposit. ` +
        `Wait at least 24 hours to reduce timing correlation risk. 7+ days is ideal.`,
      urgency: RecommendationUrgency.Required,
      estimatedImpact: 20,
    });
  } else if (breakdown.timeElapsed < 50) {
    recommendations.push({
      id: 'more-time-helpful',
      message:
        'Consider waiting a few more days. Longer delays between deposit and withdrawal ' +
        'make timing analysis significantly harder.',
      urgency: RecommendationUrgency.Recommended,
      estimatedImpact: 10,
    });
  }

  // --- Withdrawal pattern recommendations ---
  if (input.hasLinkedHistory) {
    recommendations.push({
      id: 'use-fresh-address',
      message:
        'CRITICAL: Withdrawal address has linked transaction history with the depositor. ' +
        'Use a completely fresh address that has never interacted with your other accounts.',
      urgency: RecommendationUrgency.Required,
      estimatedImpact: 25,
    });
  } else if (!input.isFreshAddress) {
    recommendations.push({
      id: 'prefer-fresh-address',
      message:
        'Withdrawal address has prior on-chain activity. Using a fresh address ' +
        'with no transaction history provides stronger privacy.',
      urgency: RecommendationUrgency.Recommended,
      estimatedImpact: 12,
    });
  }

  // --- Pool diversity recommendations ---
  if (breakdown.poolDiversity < 40) {
    recommendations.push({
      id: 'low-pool-diversity',
      message:
        'Few denomination types are active in the pool. Consider using a more ' +
        'popular denomination to blend with a larger crowd.',
      urgency: RecommendationUrgency.Optional,
      estimatedImpact: 8,
    });
  }

  // --- General best practices ---
  if (breakdown.anonymitySet >= 60 && breakdown.timeElapsed >= 50) {
    if (input.withdrawalsSinceDeposit !== undefined && input.withdrawalsSinceDeposit < 5) {
      recommendations.push({
        id: 'wait-for-withdrawals',
        message:
          'Few withdrawals have occurred since your deposit. More withdrawal ' +
          'activity helps obscure the link between your deposit and withdrawal.',
        urgency: RecommendationUrgency.Optional,
        estimatedImpact: 5,
      });
    }
  }

  // Sort by urgency priority: REQUIRED > RECOMMENDED > OPTIONAL
  const urgencyOrder = {
    [RecommendationUrgency.Required]: 0,
    [RecommendationUrgency.Recommended]: 1,
    [RecommendationUrgency.Optional]: 2,
  };

  recommendations.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  return recommendations;
}

// ============================================================
// MAIN CALCULATOR
// ============================================================

/**
 * Calculate the privacy score for a pending withdrawal.
 *
 * Combines four factors with configurable weights to produce an
 * overall score (0-100), a privacy level classification, a detailed
 * breakdown, and actionable recommendations.
 *
 * @param input - Parameters describing the deposit and withdrawal context
 * @param weights - Optional custom weights (must sum to 1.0)
 * @returns Complete privacy score result
 *
 * @example
 * ```typescript
 * const result = calculatePrivacyScore({
 *   anonymitySetSize: 150,
 *   depositTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
 *   activeDenominations: 4,
 *   isFreshAddress: true,
 *   denomination: Denomination.Xlm100,
 * });
 *
 * console.log(result.score);  // e.g. 72
 * console.log(result.level);  // "HIGH"
 * console.log(result.recommendations);
 * ```
 */
export function calculatePrivacyScore(
  input: PrivacyScoreInput,
  weights: Partial<ScoreWeights> = {},
): PrivacyScoreResult {
  const resolvedWeights: ScoreWeights = { ...DEFAULT_WEIGHTS, ...weights };

  // Validate weights sum to ~1.0
  const weightSum =
    resolvedWeights.anonymitySet +
    resolvedWeights.timeElapsed +
    resolvedWeights.poolDiversity +
    resolvedWeights.withdrawalPattern;

  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(
      `Score weights must sum to 1.0 (got ${weightSum.toFixed(4)}). ` +
      `Received: ${JSON.stringify(resolvedWeights)}`,
    );
  }

  const currentTimestamp = input.currentTimestamp ?? Date.now();
  const totalDenominations = input.totalDenominations ?? TOTAL_DENOMINATIONS;

  // Calculate individual factor scores
  const breakdown: ScoreBreakdown = {
    anonymitySet: scoreAnonymitySet(input.anonymitySetSize),
    timeElapsed: scoreTimeElapsed(input.depositTimestamp, currentTimestamp),
    poolDiversity: scorePoolDiversity(input.activeDenominations, totalDenominations),
    withdrawalPattern: scoreWithdrawalPattern(input.isFreshAddress, input.hasLinkedHistory),
  };

  // Calculate weighted overall score
  const score = Math.round(
    breakdown.anonymitySet * resolvedWeights.anonymitySet +
    breakdown.timeElapsed * resolvedWeights.timeElapsed +
    breakdown.poolDiversity * resolvedWeights.poolDiversity +
    breakdown.withdrawalPattern * resolvedWeights.withdrawalPattern,
  );

  const level = classifyPrivacyLevel(score);
  const recommendations = generateRecommendations(breakdown, {
    ...input,
    currentTimestamp,
    totalDenominations,
  });

  return {
    score,
    level,
    breakdown,
    recommendations,
    calculatedAt: new Date().toISOString(),
    input: { ...input, currentTimestamp, totalDenominations },
  };
}

// ============================================================
// HISTORICAL SCORE TRACKER
// ============================================================

/**
 * Tracks privacy scores over time for a deposit, enabling users
 * to monitor how their privacy improves as the pool grows and
 * time passes.
 *
 * Each deposit is identified by a unique key (e.g., commitment hash).
 * The tracker stores score snapshots and provides trend analysis.
 *
 * @example
 * ```typescript
 * const tracker = new PrivacyScoreTracker();
 *
 * // Record score snapshots periodically
 * const result = calculatePrivacyScore({ ... });
 * tracker.record('deposit-abc123', result);
 *
 * // Later, check the trend
 * const history = tracker.getHistory('deposit-abc123');
 * const trend = tracker.getTrend('deposit-abc123');
 * console.log(`Privacy is ${trend}`); // "improving"
 * ```
 */
export class PrivacyScoreTracker {
  private history: Map<string, ScoreHistoryEntry[]> = new Map();
  private config: ScoreTrackerConfig;

  constructor(config: Partial<ScoreTrackerConfig> = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 100,
      weights: config.weights,
    };
  }

  /**
   * Record a privacy score snapshot for a deposit.
   *
   * @param depositId - Unique identifier for the deposit (e.g., commitment hash)
   * @param result - The calculated privacy score result
   */
  record(depositId: string, result: PrivacyScoreResult): void {
    if (!this.history.has(depositId)) {
      this.history.set(depositId, []);
    }

    const entries = this.history.get(depositId)!;

    entries.push({
      timestamp: result.calculatedAt,
      score: result.score,
      level: result.level,
      breakdown: { ...result.breakdown },
    });

    // Trim to max size, keeping most recent entries
    if (entries.length > this.config.maxHistorySize) {
      entries.splice(0, entries.length - this.config.maxHistorySize);
    }
  }

  /**
   * Get the full score history for a deposit.
   *
   * @param depositId - Unique identifier for the deposit
   * @returns Array of historical score entries, oldest first
   */
  getHistory(depositId: string): ScoreHistoryEntry[] {
    return this.history.get(depositId) ?? [];
  }

  /**
   * Get the most recent score for a deposit.
   *
   * @param depositId - Unique identifier for the deposit
   * @returns The most recent score entry, or null if no history
   */
  getLatest(depositId: string): ScoreHistoryEntry | null {
    const entries = this.history.get(depositId);
    if (!entries || entries.length === 0) return null;
    return entries[entries.length - 1];
  }

  /**
   * Analyze the score trend for a deposit.
   *
   * Compares the average of the last 3 scores against the average
   * of the 3 scores before that. Returns a trend direction.
   *
   * @param depositId - Unique identifier for the deposit
   * @returns Trend direction string
   */
  getTrend(depositId: string): 'improving' | 'stable' | 'declining' | 'insufficient-data' {
    const entries = this.history.get(depositId);
    if (!entries || entries.length < 4) return 'insufficient-data';

    const recentCount = Math.min(3, Math.floor(entries.length / 2));
    const recent = entries.slice(-recentCount);
    const previous = entries.slice(-recentCount * 2, -recentCount);

    const recentAvg = recent.reduce((sum, e) => sum + e.score, 0) / recent.length;
    const previousAvg = previous.reduce((sum, e) => sum + e.score, 0) / previous.length;

    const delta = recentAvg - previousAvg;
    if (delta > 3) return 'improving';
    if (delta < -3) return 'declining';
    return 'stable';
  }

  /**
   * Calculate a real-time score for a deposit without recording it.
   *
   * Convenience method that creates a new score calculation
   * using the tracker's configured weights.
   *
   * @param input - Privacy score input parameters
   * @returns Complete privacy score result
   */
  calculateScore(input: PrivacyScoreInput): PrivacyScoreResult {
    return calculatePrivacyScore(input, this.config.weights);
  }

  /**
   * Calculate and record a score in one call.
   *
   * @param depositId - Unique identifier for the deposit
   * @param input - Privacy score input parameters
   * @returns The calculated privacy score result
   */
  trackScore(depositId: string, input: PrivacyScoreInput): PrivacyScoreResult {
    const result = this.calculateScore(input);
    this.record(depositId, result);
    return result;
  }

  /**
   * Remove all history for a deposit.
   * Call this after a successful withdrawal to minimize data retention.
   *
   * @param depositId - Unique identifier for the deposit
   */
  clearHistory(depositId: string): void {
    this.history.delete(depositId);
  }

  /**
   * Remove all tracked deposits and their history.
   */
  clearAll(): void {
    this.history.clear();
  }

  /**
   * Get the number of deposits being tracked.
   */
  get trackedDeposits(): number {
    return this.history.size;
  }

  /**
   * Export all history as a serializable object.
   * Useful for persistence (e.g., saving to localStorage or file).
   */
  exportHistory(): Record<string, ScoreHistoryEntry[]> {
    const result: Record<string, ScoreHistoryEntry[]> = {};
    for (const [key, entries] of this.history) {
      result[key] = entries.map((e) => ({ ...e, breakdown: { ...e.breakdown } }));
    }
    return result;
  }

  /**
   * Import previously exported history.
   * Merges with any existing history.
   *
   * @param data - Previously exported history data
   */
  importHistory(data: Record<string, ScoreHistoryEntry[]>): void {
    for (const [key, entries] of Object.entries(data)) {
      if (!this.history.has(key)) {
        this.history.set(key, []);
      }
      const existing = this.history.get(key)!;
      existing.push(...entries);

      // Deduplicate by timestamp
      const seen = new Set<string>();
      const deduped = existing.filter((e) => {
        if (seen.has(e.timestamp)) return false;
        seen.add(e.timestamp);
        return true;
      });

      // Sort chronologically and trim
      deduped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (deduped.length > this.config.maxHistorySize) {
        deduped.splice(0, deduped.length - this.config.maxHistorySize);
      }

      this.history.set(key, deduped);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  calculatePrivacyScore,
  scoreAnonymitySet,
  scoreTimeElapsed,
  scorePoolDiversity,
  scoreWithdrawalPattern,
  classifyPrivacyLevel,
  generateRecommendations,
  PrivacyScoreTracker,
};

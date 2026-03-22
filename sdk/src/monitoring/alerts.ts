// ============================================================
// PrivacyLayer — Alert System
// ============================================================
// Threshold-based and anomaly-detection alerting for SDK metrics.
// Evaluates alert rules against collected metrics and fires
// callbacks when conditions are met.
//
// Features:
//   - Configurable alert rules per operation type
//   - Cooldown to prevent alert storms
//   - Anomaly detection via standard deviation thresholds
//   - Alert acknowledgment and history
//   - Multiple callback subscribers
// ============================================================

import { MetricsCollector } from './metrics';
import {
  type AlertRule,
  type AlertEvent,
  type AlertCallback,
  AlertSeverity,
  AlertMetric,
  AlertCondition,
  OperationType,
} from './types';

/**
 * Generates a unique ID for alert events.
 */
function generateAlertId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `alert_${ts}_${rand}`;
}

/**
 * Default alert rules for PrivacyLayer SDK monitoring.
 * These provide sensible defaults for a privacy pool SDK.
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high-deposit-latency',
    name: 'High Deposit Latency',
    operation: OperationType.DEPOSIT,
    metric: AlertMetric.LATENCY_P95,
    condition: AlertCondition.GREATER_THAN,
    threshold: 10_000, // 10 seconds
    windowMs: 300_000, // 5 min window
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 600_000, // 10 min cooldown
  },
  {
    id: 'high-withdrawal-latency',
    name: 'High Withdrawal Latency',
    operation: OperationType.WITHDRAWAL,
    metric: AlertMetric.LATENCY_P95,
    condition: AlertCondition.GREATER_THAN,
    threshold: 15_000, // 15 seconds
    windowMs: 300_000,
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 600_000,
  },
  {
    id: 'zk-proof-slow',
    name: 'ZK Proof Generation Slow',
    operation: OperationType.ZK_PROOF_GENERATION,
    metric: AlertMetric.LATENCY_P95,
    condition: AlertCondition.GREATER_THAN,
    threshold: 30_000, // 30 seconds (proof gen can be slow)
    windowMs: 300_000,
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 600_000,
  },
  {
    id: 'high-error-rate',
    name: 'High Error Rate (All Operations)',
    operation: null,
    metric: AlertMetric.ERROR_RATE,
    condition: AlertCondition.GREATER_THAN,
    threshold: 0.1, // 10% error rate
    windowMs: 300_000,
    severity: AlertSeverity.ERROR,
    enabled: true,
    cooldownMs: 300_000,
  },
  {
    id: 'critical-error-rate',
    name: 'Critical Error Rate',
    operation: null,
    metric: AlertMetric.ERROR_RATE,
    condition: AlertCondition.GREATER_THAN,
    threshold: 0.5, // 50% error rate
    windowMs: 60_000, // 1 min window for fast detection
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldownMs: 120_000,
  },
  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    operation: null,
    metric: AlertMetric.MEMORY_HEAP,
    condition: AlertCondition.GREATER_THAN,
    threshold: 512 * 1024 * 1024, // 512 MB
    windowMs: 60_000,
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 300_000,
  },
  {
    id: 'rpc-latency-high',
    name: 'High RPC Latency',
    operation: null,
    metric: AlertMetric.RPC_LATENCY,
    condition: AlertCondition.GREATER_THAN,
    threshold: 5_000, // 5 seconds
    windowMs: 60_000,
    severity: AlertSeverity.WARNING,
    enabled: true,
    cooldownMs: 300_000,
  },
];

/**
 * AlertManager evaluates alert rules against collected metrics
 * and notifies subscribers when thresholds are breached.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 * const alertManager = new AlertManager(collector);
 *
 * // Subscribe to alerts
 * alertManager.onAlert((event) => {
 *   console.error(`[${event.severity}] ${event.message}`);
 * });
 *
 * // Add custom rule
 * alertManager.addRule({
 *   id: 'custom-rule',
 *   name: 'Custom Proof Timeout',
 *   operation: OperationType.ZK_PROOF_GENERATION,
 *   metric: AlertMetric.LATENCY_P99,
 *   condition: AlertCondition.GREATER_THAN,
 *   threshold: 60_000,
 *   windowMs: 120_000,
 *   severity: AlertSeverity.CRITICAL,
 *   enabled: true,
 *   cooldownMs: 300_000,
 * });
 *
 * // Evaluate rules periodically
 * alertManager.startEvaluation(10_000); // every 10s
 * ```
 */
export class AlertManager {
  private rules: AlertRule[];
  private readonly firedAlerts: AlertEvent[] = [];
  private readonly callbacks: AlertCallback[] = [];
  private readonly lastFiredAt: Map<string, number> = new Map();
  private readonly collector: MetricsCollector;
  private evaluationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(collector: MetricsCollector, rules: AlertRule[] = DEFAULT_ALERT_RULES) {
    this.collector = collector;
    this.rules = [...rules];
  }

  /**
   * Registers a callback that fires whenever an alert is triggered.
   *
   * @param callback - Function to call with the alert event
   * @returns A function to unsubscribe this callback
   */
  public onAlert(callback: AlertCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const idx = this.callbacks.indexOf(callback);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  /**
   * Adds a new alert rule.
   *
   * @param rule - The alert rule to add
   * @throws If a rule with the same ID already exists
   */
  public addRule(rule: AlertRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Alert rule with id '${rule.id}' already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * Removes an alert rule by ID.
   *
   * @param ruleId - The ID of the rule to remove
   * @returns true if the rule was found and removed
   */
  public removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx >= 0) {
      this.rules.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Enables or disables a rule by ID.
   *
   * @param ruleId - The rule ID
   * @param enabled - Whether the rule should be enabled
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      // Rules are readonly, so we replace the entry
      const idx = this.rules.indexOf(rule);
      this.rules[idx] = { ...rule, enabled };
    }
  }

  /**
   * Returns all configured alert rules.
   */
  public getRules(): readonly AlertRule[] {
    return this.rules;
  }

  /**
   * Returns all fired alert events.
   */
  public getAlertHistory(): readonly AlertEvent[] {
    return this.firedAlerts;
  }

  /**
   * Returns active (unacknowledged) alerts.
   */
  public getActiveAlerts(): AlertEvent[] {
    return this.firedAlerts.filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledges an alert by its ID.
   *
   * @param alertId - The alert event ID to acknowledge
   * @returns true if the alert was found and acknowledged
   */
  public acknowledge(alertId: string): boolean {
    const alert = this.firedAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Acknowledges all active alerts.
   *
   * @returns Number of alerts acknowledged
   */
  public acknowledgeAll(): number {
    let count = 0;
    for (const alert of this.firedAlerts) {
      if (!alert.acknowledged) {
        alert.acknowledged = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Evaluates all enabled alert rules against current metrics.
   * This is the core evaluation loop — call it periodically or on demand.
   *
   * @returns Array of newly fired alert events (may be empty)
   */
  public evaluate(): AlertEvent[] {
    const newAlerts: AlertEvent[] = [];
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastFired = this.lastFiredAt.get(rule.id) ?? 0;
      if (now - lastFired < rule.cooldownMs) continue;

      const currentValue = this.getMetricValue(rule);
      if (currentValue === null) continue;

      const triggered = this.evaluateCondition(currentValue, rule.condition, rule.threshold);

      if (triggered) {
        const event: AlertEvent = {
          id: generateAlertId(),
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: this.formatAlertMessage(rule, currentValue),
          currentValue,
          threshold: rule.threshold,
          timestamp: new Date().toISOString(),
          acknowledged: false,
        };

        this.firedAlerts.push(event);
        this.lastFiredAt.set(rule.id, now);
        newAlerts.push(event);

        // Notify all callbacks
        for (const callback of this.callbacks) {
          try {
            const result = callback(event);
            // Handle async callbacks (fire and forget)
            if (result instanceof Promise) {
              result.catch(() => {
                // Swallow errors from alert callbacks to prevent cascading failures
              });
            }
          } catch {
            // Swallow synchronous errors from callbacks
          }
        }
      }
    }

    return newAlerts;
  }

  /**
   * Performs simple anomaly detection using standard deviation.
   * Compares recent metrics against the historical baseline.
   *
   * @param operation - The operation to analyze
   * @param deviationMultiplier - Number of standard deviations to consider anomalous (default: 2)
   * @param recentWindowMs - Recent window to compare against baseline (default: 60s)
   * @param baselineWindowMs - Baseline window for computing mean/stddev (default: 5min)
   * @returns An alert event if an anomaly is detected, null otherwise
   */
  public detectAnomaly(
    operation: OperationType,
    deviationMultiplier = 2,
    recentWindowMs = 60_000,
    baselineWindowMs = 300_000,
  ): AlertEvent | null {
    const baseline = this.collector.aggregate(operation, baselineWindowMs);
    const recent = this.collector.aggregate(operation, recentWindowMs);

    if (baseline.totalCount < 10 || recent.totalCount < 3) {
      // Not enough data for anomaly detection
      return null;
    }

    // Compute standard deviation from the baseline entries
    const entries = this.collector.getEntriesByOperation(operation);
    const baselineStart = Date.now() - baselineWindowMs;
    const baselineEntries = entries.filter(
      (e) => new Date(e.timestamp).getTime() >= baselineStart,
    );
    const durations = baselineEntries.map((e) => e.durationMs);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
    const stddev = Math.sqrt(variance);

    const upperBound = mean + deviationMultiplier * stddev;

    if (recent.avgDurationMs > upperBound && stddev > 0) {
      const event: AlertEvent = {
        id: generateAlertId(),
        ruleId: `anomaly-${operation}`,
        ruleName: `Anomaly: ${operation}`,
        severity: AlertSeverity.WARNING,
        message:
          `Anomaly detected for ${operation}: recent avg ${recent.avgDurationMs.toFixed(1)}ms ` +
          `exceeds baseline ${mean.toFixed(1)}ms +${deviationMultiplier}σ (${upperBound.toFixed(1)}ms)`,
        currentValue: recent.avgDurationMs,
        threshold: upperBound,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      this.firedAlerts.push(event);
      for (const callback of this.callbacks) {
        try {
          const result = callback(event);
          if (result instanceof Promise) {
            result.catch(() => {});
          }
        } catch {
          // Swallow
        }
      }

      return event;
    }

    return null;
  }

  /**
   * Starts periodic alert evaluation.
   *
   * @param intervalMs - How often to evaluate rules (default: 10 seconds)
   */
  public startEvaluation(intervalMs = 10_000): void {
    this.stopEvaluation();
    this.evaluationTimer = setInterval(() => {
      this.evaluate();
    }, intervalMs);

    // Allow Node.js to exit
    if (typeof this.evaluationTimer === 'object' && 'unref' in this.evaluationTimer) {
      this.evaluationTimer.unref();
    }
  }

  /**
   * Stops periodic alert evaluation.
   */
  public stopEvaluation(): void {
    if (this.evaluationTimer !== null) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }

  /**
   * Stops evaluation and clears all state.
   */
  public destroy(): void {
    this.stopEvaluation();
    this.callbacks.length = 0;
    this.firedAlerts.length = 0;
    this.lastFiredAt.clear();
  }

  /**
   * Extracts the current value of a metric for rule evaluation.
   */
  private getMetricValue(rule: AlertRule): number | null {
    // System-level metrics (operation is null)
    if (rule.metric === AlertMetric.MEMORY_HEAP) {
      return this.collector.getSystemMetrics().heapUsedBytes;
    }
    if (rule.metric === AlertMetric.MEMORY_RSS) {
      return this.collector.getSystemMetrics().rssBytes;
    }
    if (rule.metric === AlertMetric.RPC_LATENCY) {
      return this.collector.getSystemMetrics().rpcLatencyMs;
    }

    // Operation-level metrics
    if (rule.operation === null) {
      // Aggregate across all operations
      const allMetrics = this.collector.aggregateAll(rule.windowMs);
      const totalOps = allMetrics.reduce((sum, m) => sum + m.totalCount, 0);
      if (totalOps === 0) return null;

      switch (rule.metric) {
        case AlertMetric.ERROR_RATE: {
          const totalErrors = allMetrics.reduce(
            (sum, m) => sum + m.failureCount + m.timeoutCount,
            0,
          );
          return totalErrors / totalOps;
        }
        case AlertMetric.THROUGHPUT:
          return allMetrics.reduce((sum, m) => sum + m.throughputPerSec, 0);
        case AlertMetric.LATENCY_AVG: {
          const weighted = allMetrics.reduce(
            (sum, m) => sum + m.avgDurationMs * m.totalCount,
            0,
          );
          return weighted / totalOps;
        }
        default:
          return null;
      }
    }

    const agg = this.collector.aggregate(rule.operation, rule.windowMs);
    if (agg.totalCount === 0) return null;

    switch (rule.metric) {
      case AlertMetric.LATENCY_AVG:
        return agg.avgDurationMs;
      case AlertMetric.LATENCY_P95:
        return agg.p95DurationMs;
      case AlertMetric.LATENCY_P99:
        return agg.p99DurationMs;
      case AlertMetric.ERROR_RATE:
        return agg.errorRate;
      case AlertMetric.THROUGHPUT:
        return agg.throughputPerSec;
      default:
        return null;
    }
  }

  /**
   * Evaluates a comparison condition.
   */
  private evaluateCondition(
    value: number,
    condition: AlertCondition,
    threshold: number,
  ): boolean {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return value > threshold;
      case AlertCondition.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case AlertCondition.LESS_THAN:
        return value < threshold;
      case AlertCondition.LESS_THAN_OR_EQUAL:
        return value <= threshold;
      case AlertCondition.EQUAL:
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Formats a human-readable alert message.
   */
  private formatAlertMessage(rule: AlertRule, currentValue: number): string {
    const opStr = rule.operation ? ` for ${rule.operation}` : '';
    const condStr = this.conditionToString(rule.condition);
    const valueStr = this.formatMetricValue(rule.metric, currentValue);
    const thresholdStr = this.formatMetricValue(rule.metric, rule.threshold);
    return `${rule.name}: ${rule.metric}${opStr} is ${valueStr} (${condStr} threshold ${thresholdStr})`;
  }

  /**
   * Converts a condition enum to a readable string.
   */
  private conditionToString(condition: AlertCondition): string {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return '>';
      case AlertCondition.GREATER_THAN_OR_EQUAL:
        return '>=';
      case AlertCondition.LESS_THAN:
        return '<';
      case AlertCondition.LESS_THAN_OR_EQUAL:
        return '<=';
      case AlertCondition.EQUAL:
        return '==';
    }
  }

  /**
   * Formats a metric value with appropriate units.
   */
  private formatMetricValue(metric: AlertMetric, value: number): string {
    switch (metric) {
      case AlertMetric.LATENCY_AVG:
      case AlertMetric.LATENCY_P95:
      case AlertMetric.LATENCY_P99:
      case AlertMetric.RPC_LATENCY:
        return `${value.toFixed(1)}ms`;
      case AlertMetric.ERROR_RATE:
        return `${(value * 100).toFixed(1)}%`;
      case AlertMetric.THROUGHPUT:
        return `${value.toFixed(2)} ops/s`;
      case AlertMetric.MEMORY_HEAP:
      case AlertMetric.MEMORY_RSS:
        return `${(value / 1024 / 1024).toFixed(1)}MB`;
      default:
        return value.toFixed(2);
    }
  }
}

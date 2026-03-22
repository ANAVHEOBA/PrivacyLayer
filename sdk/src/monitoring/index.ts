// ============================================================
// PrivacyLayer — Performance Monitoring Module
// ============================================================
// Public API surface for the monitoring system.
//
// Provides:
//   - MetricsCollector: Records and aggregates operation metrics
//   - AlertManager: Threshold-based and anomaly alerting
//   - MonitoringDashboard: CLI and API dashboard views
//   - createMonitoring(): Convenience factory function
//
// All types are re-exported for consumer convenience.
// ============================================================

export { MetricsCollector } from './metrics';
export { AlertManager, DEFAULT_ALERT_RULES } from './alerts';
export { MonitoringDashboard } from './dashboard';

export {
  // Enums
  OperationType,
  AlertSeverity,
  MetricStatus,
  AlertMetric,
  AlertCondition,
  // Interfaces
  type MetricEntry,
  type AggregatedMetrics,
  type SystemMetrics,
  type AlertRule,
  type AlertEvent,
  type AlertCallback,
  type MetricsCollectorConfig,
  type DashboardConfig,
  type MonitoringSnapshot,
  // Defaults
  DEFAULT_METRICS_CONFIG,
  DEFAULT_DASHBOARD_CONFIG,
} from './types';

import { MetricsCollector } from './metrics';
import { AlertManager } from './alerts';
import { MonitoringDashboard } from './dashboard';
import type { MetricsCollectorConfig, DashboardConfig, AlertRule } from './types';

/**
 * Options for the monitoring factory function.
 */
export interface CreateMonitoringOptions {
  /** Configuration for the metrics collector */
  metrics?: Partial<MetricsCollectorConfig>;
  /** Custom alert rules (replaces defaults if provided) */
  alertRules?: AlertRule[];
  /** Dashboard configuration */
  dashboard?: Partial<DashboardConfig>;
  /** Interval in ms for alert rule evaluation (default: 10000) */
  alertEvaluationIntervalMs?: number;
}

/**
 * The assembled monitoring system returned by the factory.
 */
export interface MonitoringSystem {
  /** The metrics collector — record and query metrics */
  readonly collector: MetricsCollector;
  /** The alert manager — configure and evaluate alert rules */
  readonly alerts: AlertManager;
  /** The dashboard — render CLI/API views */
  readonly dashboard: MonitoringDashboard;
  /** Cleanly shuts down all monitoring components */
  destroy(): void;
}

/**
 * Factory function to create a fully configured monitoring system.
 * This is the recommended way to set up monitoring.
 *
 * @param options - Configuration options
 * @returns A fully initialized MonitoringSystem
 *
 * @example
 * ```typescript
 * import { createMonitoring, OperationType, MetricStatus } from './monitoring';
 *
 * const monitoring = createMonitoring({
 *   metrics: { maxEntries: 50_000 },
 *   alertEvaluationIntervalMs: 5_000,
 * });
 *
 * // Record metrics
 * const end = monitoring.collector.startTimer(OperationType.DEPOSIT);
 * await performDeposit();
 * end(MetricStatus.SUCCESS);
 *
 * // Subscribe to alerts
 * monitoring.alerts.onAlert((event) => {
 *   sendToSlack(`[${event.severity}] ${event.message}`);
 * });
 *
 * // Render dashboard
 * console.log(monitoring.dashboard.render());
 *
 * // Cleanup on shutdown
 * process.on('SIGINT', () => monitoring.destroy());
 * ```
 */
export function createMonitoring(options: CreateMonitoringOptions = {}): MonitoringSystem {
  const collector = new MetricsCollector(options.metrics);
  const alerts = new AlertManager(collector, options.alertRules);
  const dashboard = new MonitoringDashboard(collector, alerts, options.dashboard);

  // Start alert evaluation if configured
  const evalInterval = options.alertEvaluationIntervalMs ?? 10_000;
  if (evalInterval > 0) {
    alerts.startEvaluation(evalInterval);
  }

  return {
    collector,
    alerts,
    dashboard,
    destroy() {
      alerts.destroy();
      collector.destroy();
    },
  };
}

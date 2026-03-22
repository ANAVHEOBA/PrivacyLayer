// ============================================================
// PrivacyLayer — Monitoring Dashboard
// ============================================================
// Provides CLI-formatted and API-ready views of monitoring data.
// Renders real-time metric summaries, alert status, and system
// health for operators and integrators.
//
// Usage:
//   - CLI: call render() for a formatted text dashboard
//   - API: call snapshot() for structured JSON data
//   - Prometheus: call the collector's toPrometheus() method
// ============================================================

import { MetricsCollector } from './metrics';
import { AlertManager } from './alerts';
import {
  type DashboardConfig,
  type MonitoringSnapshot,
  type AggregatedMetrics,
  AlertSeverity,
  MetricStatus,
  OperationType,
  DEFAULT_DASHBOARD_CONFIG,
} from './types';

/**
 * MonitoringDashboard composes metrics and alerts into
 * human-readable (CLI) and machine-readable (API) formats.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 * const alertManager = new AlertManager(collector);
 * const dashboard = new MonitoringDashboard(collector, alertManager);
 *
 * // CLI output
 * console.log(dashboard.render());
 *
 * // API/JSON output
 * const data = dashboard.snapshot();
 *
 * // Prometheus scrape endpoint
 * app.get('/metrics', (req, res) => {
 *   res.set('Content-Type', 'text/plain');
 *   res.send(collector.toPrometheus());
 * });
 * ```
 */
export class MonitoringDashboard {
  private readonly collector: MetricsCollector;
  private readonly alertManager: AlertManager;
  private readonly config: DashboardConfig;
  private readonly startTime: number;

  constructor(
    collector: MetricsCollector,
    alertManager: AlertManager,
    config: Partial<DashboardConfig> = {},
  ) {
    this.collector = collector;
    this.alertManager = alertManager;
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
    this.startTime = Date.now();
  }

  /**
   * Returns a structured snapshot of all monitoring data.
   * Suitable for JSON API responses.
   *
   * @returns Complete monitoring state snapshot
   */
  public snapshot(): MonitoringSnapshot {
    const operationMetrics = this.getFilteredAggregates();
    const systemMetrics = this.collector.getSystemMetrics();
    const activeAlerts = this.alertManager.getActiveAlerts();

    return {
      operationMetrics,
      systemMetrics,
      activeAlerts,
      totalMetricsCollected: this.collector.getTotalRecorded(),
      monitoringUptimeSeconds: (Date.now() - this.startTime) / 1000,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Renders a CLI-formatted text dashboard.
   * Intended for terminal output or log files.
   *
   * @returns Formatted string representation of the dashboard
   */
  public render(): string {
    const lines: string[] = [];
    const divider = '='.repeat(72);
    const thinDivider = '-'.repeat(72);

    lines.push(divider);
    lines.push('  PRIVACYLAYER PERFORMANCE MONITOR');
    lines.push(`  ${new Date().toISOString()}`);
    lines.push(divider);
    lines.push('');

    // System Health
    lines.push(this.renderSystemHealth());
    lines.push('');

    // Operation Metrics
    lines.push(this.renderOperationMetrics());
    lines.push('');

    // Active Alerts
    lines.push(this.renderAlerts());
    lines.push('');

    // Recent Activity
    lines.push(this.renderRecentActivity());
    lines.push('');

    lines.push(thinDivider);
    lines.push(`  Total metrics: ${this.collector.getTotalRecorded()}`);
    lines.push(`  Uptime: ${this.formatUptime((Date.now() - this.startTime) / 1000)}`);
    lines.push(thinDivider);

    return lines.join('\n');
  }

  /**
   * Renders a compact one-line status string.
   * Useful for status bars or brief health checks.
   *
   * @returns Single-line status summary
   */
  public renderCompact(): string {
    const sys = this.collector.getSystemMetrics();
    const activeAlerts = this.alertManager.getActiveAlerts();
    const allMetrics = this.collector.aggregateAll(this.config.aggregationWindowMs);

    const totalOps = allMetrics.reduce((sum, m) => sum + m.totalCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.failureCount + m.timeoutCount, 0);
    const errorRate = totalOps > 0 ? ((totalErrors / totalOps) * 100).toFixed(1) : '0.0';

    const rpcStatus = sys.rpcConnectionHealthy ? 'OK' : 'DOWN';
    const memMB = (sys.heapUsedBytes / 1024 / 1024).toFixed(0);
    const alertCount = activeAlerts.length;
    const criticalCount = activeAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length;

    let alertStr = `alerts:${alertCount}`;
    if (criticalCount > 0) alertStr += `(${criticalCount} CRITICAL)`;

    return `[PrivacyLayer] ops:${totalOps} err:${errorRate}% rpc:${rpcStatus} mem:${memMB}MB ${alertStr}`;
  }

  /**
   * Returns metrics for a specific operation, formatted as a summary object.
   *
   * @param operation - The operation type to summarize
   * @returns Formatted summary or null if no data
   */
  public getOperationSummary(operation: OperationType): {
    operation: string;
    count: number;
    successRate: string;
    avgLatency: string;
    p95Latency: string;
    throughput: string;
  } | null {
    const agg = this.collector.aggregate(operation, this.config.aggregationWindowMs);
    if (agg.totalCount === 0) return null;

    return {
      operation: agg.operation,
      count: agg.totalCount,
      successRate: `${((agg.successCount / agg.totalCount) * 100).toFixed(1)}%`,
      avgLatency: `${agg.avgDurationMs.toFixed(1)}ms`,
      p95Latency: `${agg.p95DurationMs.toFixed(1)}ms`,
      throughput: `${agg.throughputPerSec.toFixed(2)} ops/s`,
    };
  }

  // ── Private rendering helpers ──────────────────────────────

  private renderSystemHealth(): string {
    const lines: string[] = [];
    const sys = this.collector.getSystemMetrics();

    lines.push('  SYSTEM HEALTH');
    lines.push('  ' + '-'.repeat(40));
    lines.push(`  RPC Connection:  ${sys.rpcConnectionHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    lines.push(`  RPC Latency:     ${sys.rpcLatencyMs.toFixed(1)}ms`);
    lines.push(`  Heap Memory:     ${(sys.heapUsedBytes / 1024 / 1024).toFixed(1)}MB / ${(sys.heapTotalBytes / 1024 / 1024).toFixed(1)}MB`);
    lines.push(`  RSS Memory:      ${(sys.rssBytes / 1024 / 1024).toFixed(1)}MB`);
    lines.push(`  Uptime:          ${this.formatUptime(sys.uptimeSeconds)}`);

    return lines.join('\n');
  }

  private renderOperationMetrics(): string {
    const lines: string[] = [];
    const aggregates = this.getFilteredAggregates();

    lines.push('  OPERATION METRICS (last ' + this.formatDuration(this.config.aggregationWindowMs) + ')');
    lines.push('  ' + '-'.repeat(40));

    const activeOps = aggregates.filter((a) => a.totalCount > 0);
    if (activeOps.length === 0) {
      lines.push('  No operations recorded in this window.');
      return lines.join('\n');
    }

    // Table header
    lines.push(
      '  ' +
        this.padRight('Operation', 24) +
        this.padRight('Count', 8) +
        this.padRight('Avg', 10) +
        this.padRight('P95', 10) +
        this.padRight('Err%', 8) +
        'Ops/s',
    );
    lines.push('  ' + '-'.repeat(68));

    for (const agg of activeOps) {
      lines.push(
        '  ' +
          this.padRight(agg.operation, 24) +
          this.padRight(String(agg.totalCount), 8) +
          this.padRight(`${agg.avgDurationMs.toFixed(1)}ms`, 10) +
          this.padRight(`${agg.p95DurationMs.toFixed(1)}ms`, 10) +
          this.padRight(`${(agg.errorRate * 100).toFixed(1)}%`, 8) +
          agg.throughputPerSec.toFixed(2),
      );
    }

    return lines.join('\n');
  }

  private renderAlerts(): string {
    const lines: string[] = [];
    const activeAlerts = this.alertManager.getActiveAlerts();

    lines.push('  ACTIVE ALERTS');
    lines.push('  ' + '-'.repeat(40));

    if (activeAlerts.length === 0) {
      lines.push('  No active alerts.');
      return lines.join('\n');
    }

    for (const alert of activeAlerts) {
      const severityTag = this.formatSeverity(alert.severity);
      lines.push(`  ${severityTag} ${alert.ruleName}`);
      lines.push(`    ${alert.message}`);
      lines.push(`    Fired: ${alert.timestamp}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderRecentActivity(): string {
    const lines: string[] = [];
    const entries = this.collector.getEntries();
    const recent = entries.slice(-this.config.displayLimit);

    lines.push('  RECENT ACTIVITY');
    lines.push('  ' + '-'.repeat(40));

    if (recent.length === 0) {
      lines.push('  No recent activity.');
      return lines.join('\n');
    }

    // Show last N entries
    const displayed = recent.slice(-10);
    for (const entry of displayed) {
      const statusIcon = entry.status === MetricStatus.SUCCESS ? 'OK' : 'FAIL';
      const time = entry.timestamp.substring(11, 23); // HH:mm:ss.SSS
      lines.push(
        `  [${time}] ${this.padRight(entry.operation, 22)} ${this.padRight(statusIcon, 6)} ${entry.durationMs.toFixed(1)}ms`,
      );
    }

    if (recent.length > 10) {
      lines.push(`  ... and ${recent.length - 10} more entries`);
    }

    return lines.join('\n');
  }

  private getFilteredAggregates(): AggregatedMetrics[] {
    const all = this.collector.aggregateAll(this.config.aggregationWindowMs);
    if (this.config.filterOperations.length === 0) return all;
    return all.filter((a) => this.config.filterOperations.includes(a.operation));
  }

  private formatSeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.INFO:
        return '[INFO]    ';
      case AlertSeverity.WARNING:
        return '[WARNING] ';
      case AlertSeverity.ERROR:
        return '[ERROR]   ';
      case AlertSeverity.CRITICAL:
        return '[CRITICAL]';
    }
  }

  private formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  private formatDuration(ms: number): string {
    if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(0)}h`;
    if (ms >= 60_000) return `${(ms / 60_000).toFixed(0)}m`;
    return `${(ms / 1000).toFixed(0)}s`;
  }

  private padRight(str: string, len: number): string {
    return str.length >= len ? str : str + ' '.repeat(len - str.length);
  }
}

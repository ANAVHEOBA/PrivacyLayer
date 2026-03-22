// ============================================================
// PrivacyLayer — Performance Monitoring Types
// ============================================================
// Type definitions for the performance monitoring system.
// Covers metrics, alerts, dashboard configuration, and events.
// ============================================================

/**
 * Categories of operations tracked by the monitoring system.
 * Maps directly to PrivacyLayer SDK operations.
 */
export enum OperationType {
  /** Deposit into the privacy pool */
  DEPOSIT = 'deposit',
  /** Withdrawal from the privacy pool */
  WITHDRAWAL = 'withdrawal',
  /** Zero-knowledge proof generation (Groth16/Noir) */
  ZK_PROOF_GENERATION = 'zk_proof_generation',
  /** Zero-knowledge proof verification */
  ZK_PROOF_VERIFICATION = 'zk_proof_verification',
  /** Merkle tree synchronization from chain */
  MERKLE_SYNC = 'merkle_sync',
  /** Note generation (nullifier + secret + commitment) */
  NOTE_GENERATION = 'note_generation',
  /** Soroban contract call (generic) */
  CONTRACT_CALL = 'contract_call',
  /** RPC connection health check */
  CONNECTION_CHECK = 'connection_check',
}

/**
 * Severity levels for alerts, ordered from least to most critical.
 */
export enum AlertSeverity {
  /** Informational — no action required */
  INFO = 'info',
  /** Warning — potential issue, should be investigated */
  WARNING = 'warning',
  /** Error — operation failed, needs attention */
  ERROR = 'error',
  /** Critical — system-level failure, immediate action required */
  CRITICAL = 'critical',
}

/**
 * Status of an individual metric measurement.
 */
export enum MetricStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
}

/**
 * A single recorded metric data point.
 */
export interface MetricEntry {
  /** Unique identifier for this metric entry */
  readonly id: string;
  /** The operation that was measured */
  readonly operation: OperationType;
  /** Execution duration in milliseconds */
  readonly durationMs: number;
  /** Whether the operation succeeded, failed, or timed out */
  readonly status: MetricStatus;
  /** ISO 8601 timestamp when the measurement was taken */
  readonly timestamp: string;
  /** Optional metadata (e.g. tx hash, error message, proof size) */
  readonly metadata?: Record<string, unknown>;
  /** Memory usage snapshot in bytes at time of measurement */
  readonly memoryUsageBytes?: number;
}

/**
 * Aggregated statistics for a specific operation type.
 */
export interface AggregatedMetrics {
  /** The operation type these stats describe */
  readonly operation: OperationType;
  /** Total number of recorded measurements */
  readonly totalCount: number;
  /** Number of successful operations */
  readonly successCount: number;
  /** Number of failed operations */
  readonly failureCount: number;
  /** Number of timed-out operations */
  readonly timeoutCount: number;
  /** Average duration in milliseconds */
  readonly avgDurationMs: number;
  /** Minimum duration in milliseconds */
  readonly minDurationMs: number;
  /** Maximum duration in milliseconds */
  readonly maxDurationMs: number;
  /** Median (p50) duration in milliseconds */
  readonly p50DurationMs: number;
  /** 95th percentile duration in milliseconds */
  readonly p95DurationMs: number;
  /** 99th percentile duration in milliseconds */
  readonly p99DurationMs: number;
  /** Operations per second (throughput) */
  readonly throughputPerSec: number;
  /** Error rate as a fraction (0.0 to 1.0) */
  readonly errorRate: number;
  /** Time window start (ISO 8601) */
  readonly windowStart: string;
  /** Time window end (ISO 8601) */
  readonly windowEnd: string;
}

/**
 * System-level health metrics beyond individual operations.
 */
export interface SystemMetrics {
  /** Heap memory used in bytes (process.memoryUsage().heapUsed) */
  readonly heapUsedBytes: number;
  /** Heap total allocated in bytes */
  readonly heapTotalBytes: number;
  /** RSS (resident set size) in bytes */
  readonly rssBytes: number;
  /** External memory in bytes (C++ objects bound to JS) */
  readonly externalBytes: number;
  /** Process uptime in seconds */
  readonly uptimeSeconds: number;
  /** Whether the Soroban RPC connection is healthy */
  readonly rpcConnectionHealthy: boolean;
  /** Soroban RPC latency in milliseconds (last check) */
  readonly rpcLatencyMs: number;
  /** ISO 8601 timestamp of this snapshot */
  readonly timestamp: string;
}

/**
 * Configuration for an alert rule.
 */
export interface AlertRule {
  /** Unique identifier for this rule */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Which operation type to monitor (null = all operations) */
  readonly operation: OperationType | null;
  /** The metric to evaluate */
  readonly metric: AlertMetric;
  /** Comparison operator */
  readonly condition: AlertCondition;
  /** Threshold value to compare against */
  readonly threshold: number;
  /** How long the condition must persist before firing (ms) */
  readonly windowMs: number;
  /** Severity when this alert fires */
  readonly severity: AlertSeverity;
  /** Whether this rule is currently active */
  readonly enabled: boolean;
  /** Minimum time between repeated firings (ms) */
  readonly cooldownMs: number;
}

/**
 * Metrics that can be used as alert triggers.
 */
export enum AlertMetric {
  /** Average latency in milliseconds */
  LATENCY_AVG = 'latency_avg',
  /** P95 latency in milliseconds */
  LATENCY_P95 = 'latency_p95',
  /** P99 latency in milliseconds */
  LATENCY_P99 = 'latency_p99',
  /** Error rate as a fraction (0.0 to 1.0) */
  ERROR_RATE = 'error_rate',
  /** Operations per second */
  THROUGHPUT = 'throughput',
  /** Heap memory used in bytes */
  MEMORY_HEAP = 'memory_heap',
  /** RSS memory in bytes */
  MEMORY_RSS = 'memory_rss',
  /** RPC latency in milliseconds */
  RPC_LATENCY = 'rpc_latency',
}

/**
 * Comparison operators for alert conditions.
 */
export enum AlertCondition {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUAL = 'eq',
}

/**
 * A fired alert event.
 */
export interface AlertEvent {
  /** Unique identifier for this alert event */
  readonly id: string;
  /** The rule that triggered this alert */
  readonly ruleId: string;
  /** The rule name */
  readonly ruleName: string;
  /** Alert severity */
  readonly severity: AlertSeverity;
  /** Human-readable description of what triggered the alert */
  readonly message: string;
  /** The current metric value that triggered the alert */
  readonly currentValue: number;
  /** The threshold that was exceeded */
  readonly threshold: number;
  /** ISO 8601 timestamp when the alert fired */
  readonly timestamp: string;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}

/**
 * Callback function signature for alert notifications.
 */
export type AlertCallback = (event: AlertEvent) => void | Promise<void>;

/**
 * Configuration for the metrics collector.
 */
export interface MetricsCollectorConfig {
  /** Maximum number of metric entries to retain in memory */
  readonly maxEntries: number;
  /** Whether to capture memory snapshots with each metric */
  readonly captureMemory: boolean;
  /** Interval in ms for system metrics collection (0 = disabled) */
  readonly systemMetricsIntervalMs: number;
  /** Whether to enable Prometheus-format export */
  readonly enablePrometheusExport: boolean;
  /** Custom labels to include in Prometheus metrics */
  readonly prometheusLabels?: Record<string, string>;
}

/**
 * Configuration for the monitoring dashboard.
 */
export interface DashboardConfig {
  /** Refresh interval in milliseconds for real-time updates */
  readonly refreshIntervalMs: number;
  /** Number of recent entries to display */
  readonly displayLimit: number;
  /** Which operations to include (empty = all) */
  readonly filterOperations: OperationType[];
  /** Time window for aggregations in milliseconds */
  readonly aggregationWindowMs: number;
}

/**
 * Snapshot of the full monitoring state, used by the dashboard.
 */
export interface MonitoringSnapshot {
  /** Aggregated metrics per operation type */
  readonly operationMetrics: AggregatedMetrics[];
  /** Current system health metrics */
  readonly systemMetrics: SystemMetrics;
  /** Active (unacknowledged) alerts */
  readonly activeAlerts: AlertEvent[];
  /** Total metrics collected since startup */
  readonly totalMetricsCollected: number;
  /** Monitoring system uptime in seconds */
  readonly monitoringUptimeSeconds: number;
  /** ISO 8601 timestamp of this snapshot */
  readonly timestamp: string;
}

/**
 * Default configuration values.
 */
export const DEFAULT_METRICS_CONFIG: MetricsCollectorConfig = {
  maxEntries: 10_000,
  captureMemory: true,
  systemMetricsIntervalMs: 30_000,
  enablePrometheusExport: true,
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  refreshIntervalMs: 5_000,
  displayLimit: 50,
  filterOperations: [],
  aggregationWindowMs: 300_000, // 5 minutes
};

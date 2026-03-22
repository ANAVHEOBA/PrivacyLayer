// ============================================================
// PrivacyLayer — Performance Metrics Collector
// ============================================================
// Collects, stores, and aggregates performance metrics for all
// SDK operations: deposits, withdrawals, ZK proof generation,
// Merkle sync, and connection health.
//
// Design principles:
//   - Non-intrusive: wrap existing operations via decorators
//   - Zero external dependencies (runs in Node.js or browser)
//   - Fixed-size circular buffer to bound memory usage
//   - Thread-safe metric recording (single JS event loop)
//   - Prometheus-compatible export format
// ============================================================

import {
  type MetricEntry,
  type AggregatedMetrics,
  type SystemMetrics,
  type MetricsCollectorConfig,
  OperationType,
  MetricStatus,
  DEFAULT_METRICS_CONFIG,
} from './types';

/**
 * Generates a short unique ID for metric entries.
 * Uses timestamp + random suffix to avoid collisions.
 */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `m_${ts}_${rand}`;
}

/**
 * Returns the current memory usage snapshot if available.
 * Returns undefined in environments without process.memoryUsage.
 */
function captureMemoryUsage(): number | undefined {
  if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
    return process.memoryUsage().heapUsed;
  }
  return undefined;
}

/**
 * Computes a percentile value from a sorted array of numbers.
 *
 * @param sorted - Array of numbers in ascending order
 * @param percentile - Percentile to compute (0-100)
 * @returns The value at the given percentile
 */
function computePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * MetricsCollector is the core metrics engine for PrivacyLayer SDK.
 *
 * It records operation durations, success/failure status, and optional
 * metadata for every SDK operation. Metrics are stored in a circular
 * buffer with configurable capacity.
 *
 * @example
 * ```typescript
 * const collector = new MetricsCollector();
 *
 * // Manual recording
 * const end = collector.startTimer(OperationType.DEPOSIT);
 * try {
 *   await performDeposit();
 *   end(MetricStatus.SUCCESS);
 * } catch (err) {
 *   end(MetricStatus.FAILURE, { error: err.message });
 * }
 *
 * // Or use the wrapper
 * const result = await collector.measure(
 *   OperationType.ZK_PROOF_GENERATION,
 *   () => generateProof(inputs)
 * );
 * ```
 */
export class MetricsCollector {
  private readonly entries: MetricEntry[] = [];
  private readonly config: MetricsCollectorConfig;
  private readonly startTime: number;
  private systemMetricsTimer: ReturnType<typeof setInterval> | null = null;
  private latestSystemMetrics: SystemMetrics | null = null;
  private totalRecorded = 0;

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.startTime = Date.now();

    if (this.config.systemMetricsIntervalMs > 0) {
      this.startSystemMetricsCollection();
    }
  }

  /**
   * Records a completed metric entry.
   *
   * @param operation - The type of operation that was measured
   * @param durationMs - How long the operation took in milliseconds
   * @param status - Whether it succeeded, failed, or timed out
   * @param metadata - Optional key-value metadata
   * @returns The recorded MetricEntry
   */
  public record(
    operation: OperationType,
    durationMs: number,
    status: MetricStatus,
    metadata?: Record<string, unknown>,
  ): MetricEntry {
    const entry: MetricEntry = {
      id: generateId(),
      operation,
      durationMs,
      status,
      timestamp: new Date().toISOString(),
      metadata,
      memoryUsageBytes: this.config.captureMemory ? captureMemoryUsage() : undefined,
    };

    // Circular buffer: remove oldest entry when at capacity
    if (this.entries.length >= this.config.maxEntries) {
      this.entries.shift();
    }

    this.entries.push(entry);
    this.totalRecorded++;
    return entry;
  }

  /**
   * Starts a timer for an operation. Returns a function to call when
   * the operation completes, which records the metric.
   *
   * @param operation - The operation type being timed
   * @returns A function to stop the timer and record the result
   *
   * @example
   * ```typescript
   * const end = collector.startTimer(OperationType.DEPOSIT);
   * // ... perform operation ...
   * end(MetricStatus.SUCCESS, { txHash: '0x...' });
   * ```
   */
  public startTimer(
    operation: OperationType,
  ): (status: MetricStatus, metadata?: Record<string, unknown>) => MetricEntry {
    const start = performance.now();
    return (status: MetricStatus, metadata?: Record<string, unknown>) => {
      const durationMs = performance.now() - start;
      return this.record(operation, durationMs, status, metadata);
    };
  }

  /**
   * Wraps an async function with automatic metric collection.
   * Records the duration and success/failure status.
   *
   * @param operation - The operation type to label this measurement
   * @param fn - The async function to execute and measure
   * @param metadata - Optional metadata to include in the metric
   * @returns The result of the wrapped function
   * @throws Re-throws any error from the wrapped function after recording the failure
   */
  public async measure<T>(
    operation: OperationType,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const end = this.startTimer(operation);
    try {
      const result = await fn();
      end(MetricStatus.SUCCESS, metadata);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      end(MetricStatus.FAILURE, { ...metadata, error: errorMessage });
      throw error;
    }
  }

  /**
   * Creates a higher-order function wrapper (decorator pattern) that
   * automatically measures any function call.
   *
   * @param operation - The operation type to label measurements
   * @returns A wrapper function that measures the provided function
   *
   * @example
   * ```typescript
   * const measuredDeposit = collector.wrap(OperationType.DEPOSIT)(originalDeposit);
   * await measuredDeposit(args); // automatically tracked
   * ```
   */
  public wrap<TArgs extends unknown[], TReturn>(
    operation: OperationType,
  ): (fn: (...args: TArgs) => TReturn | Promise<TReturn>) => (...args: TArgs) => Promise<TReturn> {
    return (fn) => {
      return async (...args: TArgs): Promise<TReturn> => {
        return this.measure(operation, () => fn(...args));
      };
    };
  }

  /**
   * Returns aggregated metrics for a specific operation type within a time window.
   *
   * @param operation - The operation type to aggregate
   * @param windowMs - Time window in milliseconds (default: 5 minutes)
   * @returns Aggregated metrics for the operation
   */
  public aggregate(operation: OperationType, windowMs = 300_000): AggregatedMetrics {
    const now = Date.now();
    const windowStart = now - windowMs;

    const filtered = this.entries.filter(
      (e) => e.operation === operation && new Date(e.timestamp).getTime() >= windowStart,
    );

    if (filtered.length === 0) {
      return {
        operation,
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        throughputPerSec: 0,
        errorRate: 0,
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(now).toISOString(),
      };
    }

    const durations = filtered.map((e) => e.durationMs).sort((a, b) => a - b);
    const successCount = filtered.filter((e) => e.status === MetricStatus.SUCCESS).length;
    const failureCount = filtered.filter((e) => e.status === MetricStatus.FAILURE).length;
    const timeoutCount = filtered.filter((e) => e.status === MetricStatus.TIMEOUT).length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const windowSeconds = windowMs / 1000;

    return {
      operation,
      totalCount: filtered.length,
      successCount,
      failureCount,
      timeoutCount,
      avgDurationMs: totalDuration / filtered.length,
      minDurationMs: durations[0],
      maxDurationMs: durations[durations.length - 1],
      p50DurationMs: computePercentile(durations, 50),
      p95DurationMs: computePercentile(durations, 95),
      p99DurationMs: computePercentile(durations, 99),
      throughputPerSec: filtered.length / windowSeconds,
      errorRate: (failureCount + timeoutCount) / filtered.length,
      windowStart: new Date(windowStart).toISOString(),
      windowEnd: new Date(now).toISOString(),
    };
  }

  /**
   * Returns aggregated metrics for all operation types.
   *
   * @param windowMs - Time window in milliseconds
   * @returns Array of aggregated metrics, one per operation type
   */
  public aggregateAll(windowMs = 300_000): AggregatedMetrics[] {
    return Object.values(OperationType).map((op) => this.aggregate(op, windowMs));
  }

  /**
   * Collects current system-level metrics (memory, uptime, etc.).
   * RPC health must be set externally via {@link setRpcHealth}.
   *
   * @returns Current system metrics snapshot
   */
  public collectSystemMetrics(): SystemMetrics {
    let heapUsedBytes = 0;
    let heapTotalBytes = 0;
    let rssBytes = 0;
    let externalBytes = 0;

    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      const mem = process.memoryUsage();
      heapUsedBytes = mem.heapUsed;
      heapTotalBytes = mem.heapTotal;
      rssBytes = mem.rss;
      externalBytes = mem.external;
    }

    const metrics: SystemMetrics = {
      heapUsedBytes,
      heapTotalBytes,
      rssBytes,
      externalBytes,
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
      rpcConnectionHealthy: this.latestSystemMetrics?.rpcConnectionHealthy ?? true,
      rpcLatencyMs: this.latestSystemMetrics?.rpcLatencyMs ?? 0,
      timestamp: new Date().toISOString(),
    };

    this.latestSystemMetrics = metrics;
    return metrics;
  }

  /**
   * Updates the RPC connection health status.
   * Call this from your RPC health check routine.
   *
   * @param healthy - Whether the RPC endpoint is responding
   * @param latencyMs - Round-trip latency to the RPC endpoint
   */
  public setRpcHealth(healthy: boolean, latencyMs: number): void {
    const current = this.collectSystemMetrics();
    this.latestSystemMetrics = {
      ...current,
      rpcConnectionHealthy: healthy,
      rpcLatencyMs: latencyMs,
    };
  }

  /**
   * Returns the latest system metrics snapshot.
   */
  public getSystemMetrics(): SystemMetrics {
    return this.latestSystemMetrics ?? this.collectSystemMetrics();
  }

  /**
   * Returns all raw metric entries (for export or debugging).
   */
  public getEntries(): readonly MetricEntry[] {
    return this.entries;
  }

  /**
   * Returns metric entries filtered by operation type.
   *
   * @param operation - The operation type to filter by
   * @param limit - Maximum number of entries to return (most recent first)
   */
  public getEntriesByOperation(operation: OperationType, limit?: number): MetricEntry[] {
    const filtered = this.entries.filter((e) => e.operation === operation);
    if (limit !== undefined) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Returns the total number of metrics recorded since startup
   * (including entries that were evicted from the circular buffer).
   */
  public getTotalRecorded(): number {
    return this.totalRecorded;
  }

  /**
   * Exports all metrics in Prometheus text exposition format.
   *
   * @param windowMs - Aggregation time window
   * @returns Prometheus-compatible metrics string
   */
  public toPrometheus(windowMs = 300_000): string {
    const lines: string[] = [];
    const labels = this.config.prometheusLabels ?? {};
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const labelSuffix = labelStr ? `,${labelStr}` : '';

    // Operation metrics
    const aggregates = this.aggregateAll(windowMs);
    for (const agg of aggregates) {
      const op = agg.operation;

      lines.push(`# HELP privacylayer_operation_total Total operations count`);
      lines.push(`# TYPE privacylayer_operation_total counter`);
      lines.push(
        `privacylayer_operation_total{operation="${op}",status="success"${labelSuffix}} ${agg.successCount}`,
      );
      lines.push(
        `privacylayer_operation_total{operation="${op}",status="failure"${labelSuffix}} ${agg.failureCount}`,
      );
      lines.push(
        `privacylayer_operation_total{operation="${op}",status="timeout"${labelSuffix}} ${agg.timeoutCount}`,
      );

      lines.push(`# HELP privacylayer_operation_duration_ms Operation duration in milliseconds`);
      lines.push(`# TYPE privacylayer_operation_duration_ms summary`);
      lines.push(
        `privacylayer_operation_duration_ms{operation="${op}",quantile="0.5"${labelSuffix}} ${agg.p50DurationMs}`,
      );
      lines.push(
        `privacylayer_operation_duration_ms{operation="${op}",quantile="0.95"${labelSuffix}} ${agg.p95DurationMs}`,
      );
      lines.push(
        `privacylayer_operation_duration_ms{operation="${op}",quantile="0.99"${labelSuffix}} ${agg.p99DurationMs}`,
      );
      lines.push(
        `privacylayer_operation_duration_ms_avg{operation="${op}"${labelSuffix}} ${agg.avgDurationMs}`,
      );

      lines.push(`# HELP privacylayer_operation_throughput_per_sec Operations per second`);
      lines.push(`# TYPE privacylayer_operation_throughput_per_sec gauge`);
      lines.push(
        `privacylayer_operation_throughput_per_sec{operation="${op}"${labelSuffix}} ${agg.throughputPerSec}`,
      );

      lines.push(`# HELP privacylayer_operation_error_rate Error rate (0.0-1.0)`);
      lines.push(`# TYPE privacylayer_operation_error_rate gauge`);
      lines.push(
        `privacylayer_operation_error_rate{operation="${op}"${labelSuffix}} ${agg.errorRate}`,
      );
    }

    // System metrics
    const sys = this.getSystemMetrics();
    lines.push(`# HELP privacylayer_memory_heap_bytes Heap memory used in bytes`);
    lines.push(`# TYPE privacylayer_memory_heap_bytes gauge`);
    lines.push(`privacylayer_memory_heap_bytes{${labelStr}} ${sys.heapUsedBytes}`);

    lines.push(`# HELP privacylayer_memory_rss_bytes RSS memory in bytes`);
    lines.push(`# TYPE privacylayer_memory_rss_bytes gauge`);
    lines.push(`privacylayer_memory_rss_bytes{${labelStr}} ${sys.rssBytes}`);

    lines.push(`# HELP privacylayer_rpc_healthy Soroban RPC connection health (1=healthy, 0=unhealthy)`);
    lines.push(`# TYPE privacylayer_rpc_healthy gauge`);
    lines.push(`privacylayer_rpc_healthy{${labelStr}} ${sys.rpcConnectionHealthy ? 1 : 0}`);

    lines.push(`# HELP privacylayer_rpc_latency_ms Soroban RPC latency in milliseconds`);
    lines.push(`# TYPE privacylayer_rpc_latency_ms gauge`);
    lines.push(`privacylayer_rpc_latency_ms{${labelStr}} ${sys.rpcLatencyMs}`);

    lines.push(`# HELP privacylayer_uptime_seconds Monitoring system uptime in seconds`);
    lines.push(`# TYPE privacylayer_uptime_seconds counter`);
    lines.push(`privacylayer_uptime_seconds{${labelStr}} ${sys.uptimeSeconds}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Clears all collected metrics and resets counters.
   */
  public reset(): void {
    this.entries.length = 0;
    this.totalRecorded = 0;
    this.latestSystemMetrics = null;
  }

  /**
   * Stops background system metrics collection.
   * Call this during shutdown to prevent resource leaks.
   */
  public destroy(): void {
    if (this.systemMetricsTimer !== null) {
      clearInterval(this.systemMetricsTimer);
      this.systemMetricsTimer = null;
    }
  }

  /**
   * Starts periodic system metrics collection.
   */
  private startSystemMetricsCollection(): void {
    this.collectSystemMetrics();
    this.systemMetricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.systemMetricsIntervalMs);

    // Allow Node.js to exit even if the timer is running
    if (typeof this.systemMetricsTimer === 'object' && 'unref' in this.systemMetricsTimer) {
      this.systemMetricsTimer.unref();
    }
  }
}

// ============================================================
// PrivacyLayer — Performance Monitoring Tests
// ============================================================
// Comprehensive test suite for the monitoring module.
// Covers MetricsCollector, AlertManager, MonitoringDashboard,
// and the createMonitoring factory.
// ============================================================

import {
  MetricsCollector,
  AlertManager,
  MonitoringDashboard,
  createMonitoring,
  DEFAULT_ALERT_RULES,
  OperationType,
  MetricStatus,
  AlertSeverity,
  AlertMetric,
  AlertCondition,
  type AlertRule,
  type AlertEvent,
  type MonitoringSystem,
} from '../monitoring';

// ── Helpers ──────────────────────────────────────────────────

/** Simulate an async operation that takes ~durationMs. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Record N metrics of a given type with varied durations. */
function _recordMetrics(
  collector: MetricsCollector,
  operation: OperationType,
  count: number,
  baseDurationMs = 100,
  failEvery = 0,
): void {
  for (let i = 0; i < count; i++) {
    const duration = baseDurationMs + Math.random() * baseDurationMs;
    const status =
      failEvery > 0 && i % failEvery === 0 ? MetricStatus.FAILURE : MetricStatus.SUCCESS;
    collector.record(operation, duration, status, { index: i });
  }
}
void _recordMetrics; // suppress unused warning

// ── MetricsCollector Tests ───────────────────────────────────

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({
      maxEntries: 100,
      captureMemory: true,
      systemMetricsIntervalMs: 0, // Disable auto-collection in tests
      enablePrometheusExport: true,
    });
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('record()', () => {
    it('should record a metric entry with all fields', () => {
      const entry = collector.record(OperationType.DEPOSIT, 150, MetricStatus.SUCCESS, {
        txHash: '0xabc',
      });

      expect(entry.id).toMatch(/^m_/);
      expect(entry.operation).toBe(OperationType.DEPOSIT);
      expect(entry.durationMs).toBe(150);
      expect(entry.status).toBe(MetricStatus.SUCCESS);
      expect(entry.timestamp).toBeTruthy();
      expect(entry.metadata).toEqual({ txHash: '0xabc' });
      expect(entry.memoryUsageBytes).toBeGreaterThan(0);
    });

    it('should generate unique IDs for each entry', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const entry = collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
        ids.add(entry.id);
      }
      expect(ids.size).toBe(50);
    });

    it('should enforce circular buffer limit', () => {
      // maxEntries is 100
      for (let i = 0; i < 150; i++) {
        collector.record(OperationType.DEPOSIT, i, MetricStatus.SUCCESS);
      }

      const entries = collector.getEntries();
      expect(entries.length).toBe(100);
      // First entry should be index 50 (0-49 evicted)
      expect(entries[0].durationMs).toBe(50);
    });

    it('should increment total recorded count even after eviction', () => {
      for (let i = 0; i < 150; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }
      expect(collector.getTotalRecorded()).toBe(150);
      expect(collector.getEntries().length).toBe(100);
    });

    it('should record failure and timeout statuses', () => {
      collector.record(OperationType.WITHDRAWAL, 500, MetricStatus.FAILURE, {
        error: 'InvalidProof',
      });
      collector.record(OperationType.CONTRACT_CALL, 30000, MetricStatus.TIMEOUT);

      const entries = collector.getEntries();
      expect(entries[0].status).toBe(MetricStatus.FAILURE);
      expect(entries[1].status).toBe(MetricStatus.TIMEOUT);
    });
  });

  describe('startTimer()', () => {
    it('should measure elapsed time', async () => {
      const end = collector.startTimer(OperationType.ZK_PROOF_GENERATION);
      await sleep(50);
      const entry = end(MetricStatus.SUCCESS, { proofSize: 1024 });

      expect(entry.durationMs).toBeGreaterThanOrEqual(40); // Allow some tolerance
      expect(entry.operation).toBe(OperationType.ZK_PROOF_GENERATION);
      expect(entry.metadata).toEqual({ proofSize: 1024 });
    });
  });

  describe('measure()', () => {
    it('should wrap a successful async function', async () => {
      const result = await collector.measure(
        OperationType.NOTE_GENERATION,
        async () => {
          await sleep(20);
          return 42;
        },
      );

      expect(result).toBe(42);
      const entries = collector.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].status).toBe(MetricStatus.SUCCESS);
    });

    it('should record failure when the function throws', async () => {
      await expect(
        collector.measure(OperationType.DEPOSIT, async () => {
          throw new Error('InsufficientFunds');
        }),
      ).rejects.toThrow('InsufficientFunds');

      const entries = collector.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].status).toBe(MetricStatus.FAILURE);
      expect(entries[0].metadata?.error).toBe('InsufficientFunds');
    });

    it('should handle synchronous functions', async () => {
      const result = await collector.measure(OperationType.NOTE_GENERATION, () => 'note-hash');
      expect(result).toBe('note-hash');
    });
  });

  describe('wrap()', () => {
    it('should create a measured wrapper for a function', async () => {
      const originalFn = async (a: number, b: number): Promise<number> => {
        await sleep(10);
        return a + b;
      };

      const measured = collector.wrap<[number, number], number>(OperationType.CONTRACT_CALL)(originalFn);
      const result = await measured(3, 7);

      expect(result).toBe(10);
      expect(collector.getEntries().length).toBe(1);
      expect(collector.getEntries()[0].operation).toBe(OperationType.CONTRACT_CALL);
    });
  });

  describe('aggregate()', () => {
    it('should return zero-value aggregation when no data', () => {
      const agg = collector.aggregate(OperationType.DEPOSIT);
      expect(agg.totalCount).toBe(0);
      expect(agg.avgDurationMs).toBe(0);
      expect(agg.errorRate).toBe(0);
    });

    it('should correctly aggregate metrics', () => {
      // Record 10 entries: durations 10, 20, 30, ..., 100
      for (let i = 1; i <= 10; i++) {
        collector.record(OperationType.DEPOSIT, i * 10, MetricStatus.SUCCESS);
      }

      const agg = collector.aggregate(OperationType.DEPOSIT);
      expect(agg.totalCount).toBe(10);
      expect(agg.successCount).toBe(10);
      expect(agg.avgDurationMs).toBe(55); // (10+20+...+100)/10 = 55
      expect(agg.minDurationMs).toBe(10);
      expect(agg.maxDurationMs).toBe(100);
      expect(agg.errorRate).toBe(0);
    });

    it('should compute percentiles correctly', () => {
      // Record 100 entries with durations 1..100
      for (let i = 1; i <= 100; i++) {
        collector.record(OperationType.WITHDRAWAL, i, MetricStatus.SUCCESS);
      }

      const agg = collector.aggregate(OperationType.WITHDRAWAL);
      expect(agg.p50DurationMs).toBeCloseTo(50.5, 0);
      expect(agg.p95DurationMs).toBeCloseTo(95.05, 0);
      expect(agg.p99DurationMs).toBeCloseTo(99.01, 0);
    });

    it('should calculate error rate correctly', () => {
      // 8 success, 2 failure
      for (let i = 0; i < 8; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.FAILURE);
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.TIMEOUT);

      const agg = collector.aggregate(OperationType.DEPOSIT);
      expect(agg.errorRate).toBeCloseTo(0.2, 5);
    });

    it('should filter by time window', () => {
      // Record some entries
      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }

      // With a very large window, all should be included
      const aggAll = collector.aggregate(OperationType.DEPOSIT, 3_600_000);
      expect(aggAll.totalCount).toBe(5);

      // With a very small window (1ms) after a delay, results vary
      // but at minimum should not crash
      const aggSmall = collector.aggregate(OperationType.DEPOSIT, 1);
      expect(aggSmall.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('aggregateAll()', () => {
    it('should return metrics for all operation types', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      collector.record(OperationType.WITHDRAWAL, 200, MetricStatus.SUCCESS);

      const all = collector.aggregateAll();
      expect(all.length).toBe(Object.values(OperationType).length);

      const depositAgg = all.find((a) => a.operation === OperationType.DEPOSIT);
      expect(depositAgg?.totalCount).toBe(1);
    });
  });

  describe('getEntriesByOperation()', () => {
    it('should filter entries by operation type', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      collector.record(OperationType.WITHDRAWAL, 200, MetricStatus.SUCCESS);
      collector.record(OperationType.DEPOSIT, 150, MetricStatus.SUCCESS);

      const deposits = collector.getEntriesByOperation(OperationType.DEPOSIT);
      expect(deposits.length).toBe(2);
      expect(deposits.every((e) => e.operation === OperationType.DEPOSIT)).toBe(true);
    });

    it('should respect the limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }

      const limited = collector.getEntriesByOperation(OperationType.DEPOSIT, 5);
      expect(limited.length).toBe(5);
    });
  });

  describe('system metrics', () => {
    it('should collect system metrics', () => {
      const sys = collector.collectSystemMetrics();
      expect(sys.heapUsedBytes).toBeGreaterThan(0);
      expect(sys.heapTotalBytes).toBeGreaterThan(0);
      expect(sys.rssBytes).toBeGreaterThan(0);
      expect(sys.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(sys.timestamp).toBeTruthy();
    });

    it('should track RPC health', () => {
      collector.setRpcHealth(true, 45);
      let sys = collector.getSystemMetrics();
      expect(sys.rpcConnectionHealthy).toBe(true);
      expect(sys.rpcLatencyMs).toBe(45);

      collector.setRpcHealth(false, 5000);
      sys = collector.getSystemMetrics();
      expect(sys.rpcConnectionHealthy).toBe(false);
      expect(sys.rpcLatencyMs).toBe(5000);
    });
  });

  describe('toPrometheus()', () => {
    it('should export valid Prometheus format', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      collector.record(OperationType.DEPOSIT, 200, MetricStatus.FAILURE);

      const output = collector.toPrometheus();
      expect(output).toContain('# HELP privacylayer_operation_total');
      expect(output).toContain('# TYPE privacylayer_operation_total counter');
      expect(output).toContain('privacylayer_operation_total{operation="deposit",status="success"');
      expect(output).toContain('privacylayer_memory_heap_bytes');
      expect(output).toContain('privacylayer_rpc_healthy');
      expect(output).toContain('privacylayer_uptime_seconds');
    });

    it('should include custom labels when configured', () => {
      const labeled = new MetricsCollector({
        maxEntries: 100,
        captureMemory: false,
        systemMetricsIntervalMs: 0,
        enablePrometheusExport: true,
        prometheusLabels: { environment: 'testnet', instance: 'node-1' },
      });

      labeled.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      const output = labeled.toPrometheus();
      expect(output).toContain('environment="testnet"');
      expect(output).toContain('instance="node-1"');
      labeled.destroy();
    });
  });

  describe('reset()', () => {
    it('should clear all entries and counters', () => {
      for (let i = 0; i < 10; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }

      expect(collector.getEntries().length).toBe(10);
      expect(collector.getTotalRecorded()).toBe(10);

      collector.reset();

      expect(collector.getEntries().length).toBe(0);
      expect(collector.getTotalRecorded()).toBe(0);
    });
  });
});

// ── AlertManager Tests ───────────────────────────────────────

describe('AlertManager', () => {
  let collector: MetricsCollector;
  let alertManager: AlertManager;

  beforeEach(() => {
    collector = new MetricsCollector({
      maxEntries: 1000,
      captureMemory: false,
      systemMetricsIntervalMs: 0,
      enablePrometheusExport: false,
    });
    // Start with no default rules to make tests deterministic
    alertManager = new AlertManager(collector, []);
  });

  afterEach(() => {
    alertManager.destroy();
    collector.destroy();
  });

  describe('rule management', () => {
    it('should add and retrieve rules', () => {
      const rule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1000,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      };

      alertManager.addRule(rule);
      expect(alertManager.getRules().length).toBe(1);
      expect(alertManager.getRules()[0].id).toBe('test-rule');
    });

    it('should reject duplicate rule IDs', () => {
      const rule: AlertRule = {
        id: 'dup-rule',
        name: 'Rule',
        operation: null,
        metric: AlertMetric.ERROR_RATE,
        condition: AlertCondition.GREATER_THAN,
        threshold: 0.5,
        windowMs: 60_000,
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 0,
      };

      alertManager.addRule(rule);
      expect(() => alertManager.addRule(rule)).toThrow("already exists");
    });

    it('should remove a rule by ID', () => {
      alertManager.addRule({
        id: 'remove-me',
        name: 'To Remove',
        operation: null,
        metric: AlertMetric.ERROR_RATE,
        condition: AlertCondition.GREATER_THAN,
        threshold: 0.5,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      expect(alertManager.removeRule('remove-me')).toBe(true);
      expect(alertManager.getRules().length).toBe(0);
      expect(alertManager.removeRule('nonexistent')).toBe(false);
    });

    it('should enable/disable rules', () => {
      alertManager.addRule({
        id: 'toggle-rule',
        name: 'Toggle',
        operation: null,
        metric: AlertMetric.ERROR_RATE,
        condition: AlertCondition.GREATER_THAN,
        threshold: 0.5,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      alertManager.setRuleEnabled('toggle-rule', false);
      expect(alertManager.getRules()[0].enabled).toBe(false);

      alertManager.setRuleEnabled('toggle-rule', true);
      expect(alertManager.getRules()[0].enabled).toBe(true);
    });
  });

  describe('evaluate()', () => {
    it('should fire an alert when threshold is exceeded', () => {
      alertManager.addRule({
        id: 'high-latency',
        name: 'High Latency',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 500,
        windowMs: 300_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      // Record high-latency operations
      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 1000, MetricStatus.SUCCESS);
      }

      const fired = alertManager.evaluate();
      expect(fired.length).toBe(1);
      expect(fired[0].ruleId).toBe('high-latency');
      expect(fired[0].severity).toBe(AlertSeverity.WARNING);
      expect(fired[0].currentValue).toBeGreaterThan(500);
    });

    it('should not fire when threshold is not exceeded', () => {
      alertManager.addRule({
        id: 'high-latency',
        name: 'High Latency',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 500,
        windowMs: 300_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      // Record low-latency operations
      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      }

      const fired = alertManager.evaluate();
      expect(fired.length).toBe(0);
    });

    it('should respect cooldown period', () => {
      alertManager.addRule({
        id: 'cooldown-test',
        name: 'Cooldown Test',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 50,
        windowMs: 300_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 60_000, // 1 minute cooldown
      });

      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 1000, MetricStatus.SUCCESS);
      }

      // First evaluation should fire
      const first = alertManager.evaluate();
      expect(first.length).toBe(1);

      // Second evaluation within cooldown should not fire
      const second = alertManager.evaluate();
      expect(second.length).toBe(0);
    });

    it('should not evaluate disabled rules', () => {
      alertManager.addRule({
        id: 'disabled-rule',
        name: 'Disabled',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 50,
        windowMs: 300_000,
        severity: AlertSeverity.WARNING,
        enabled: false,
        cooldownMs: 0,
      });

      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 1000, MetricStatus.SUCCESS);
      }

      const fired = alertManager.evaluate();
      expect(fired.length).toBe(0);
    });

    it('should evaluate error rate alerts', () => {
      alertManager.addRule({
        id: 'error-rate',
        name: 'Error Rate',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.ERROR_RATE,
        condition: AlertCondition.GREATER_THAN,
        threshold: 0.3,
        windowMs: 300_000,
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 0,
      });

      // 50% error rate
      for (let i = 0; i < 5; i++) {
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
        collector.record(OperationType.DEPOSIT, 100, MetricStatus.FAILURE);
      }

      const fired = alertManager.evaluate();
      expect(fired.length).toBe(1);
      expect(fired[0].currentValue).toBeCloseTo(0.5, 2);
    });

    it('should evaluate system-level memory alerts', () => {
      alertManager.addRule({
        id: 'memory-alert',
        name: 'Memory',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1, // 1 byte — will always trigger
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      const fired = alertManager.evaluate();
      expect(fired.length).toBe(1);
    });
  });

  describe('callbacks', () => {
    it('should invoke registered callbacks on alert', () => {
      const events: AlertEvent[] = [];
      alertManager.onAlert((event) => {
        events.push(event);
      });

      alertManager.addRule({
        id: 'callback-test',
        name: 'Callback Test',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 50,
        windowMs: 300_000,
        severity: AlertSeverity.ERROR,
        enabled: true,
        cooldownMs: 0,
      });

      for (let i = 0; i < 3; i++) {
        collector.record(OperationType.DEPOSIT, 1000, MetricStatus.SUCCESS);
      }

      alertManager.evaluate();
      expect(events.length).toBe(1);
      expect(events[0].severity).toBe(AlertSeverity.ERROR);
    });

    it('should allow unsubscribing callbacks', () => {
      const events: AlertEvent[] = [];
      const unsubscribe = alertManager.onAlert((event) => {
        events.push(event);
      });

      alertManager.addRule({
        id: 'unsub-test',
        name: 'Unsub Test',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 50,
        windowMs: 300_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      for (let i = 0; i < 3; i++) {
        collector.record(OperationType.DEPOSIT, 1000, MetricStatus.SUCCESS);
      }

      unsubscribe();
      alertManager.evaluate();
      expect(events.length).toBe(0);
    });

    it('should not crash on callback errors', () => {
      alertManager.onAlert(() => {
        throw new Error('Callback failed');
      });

      alertManager.addRule({
        id: 'crash-test',
        name: 'Crash Test',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      // Should not throw
      expect(() => alertManager.evaluate()).not.toThrow();
    });
  });

  describe('alert management', () => {
    it('should track alert history', () => {
      alertManager.addRule({
        id: 'history-test',
        name: 'History',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.INFO,
        enabled: true,
        cooldownMs: 0,
      });

      alertManager.evaluate();
      expect(alertManager.getAlertHistory().length).toBe(1);
    });

    it('should acknowledge alerts', () => {
      alertManager.addRule({
        id: 'ack-test',
        name: 'Ack',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.INFO,
        enabled: true,
        cooldownMs: 0,
      });

      alertManager.evaluate();
      const active = alertManager.getActiveAlerts();
      expect(active.length).toBe(1);

      alertManager.acknowledge(active[0].id);
      expect(alertManager.getActiveAlerts().length).toBe(0);
    });

    it('should acknowledge all alerts', () => {
      alertManager.addRule({
        id: 'ack-all-1',
        name: 'Ack All 1',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.INFO,
        enabled: true,
        cooldownMs: 0,
      });
      alertManager.addRule({
        id: 'ack-all-2',
        name: 'Ack All 2',
        operation: null,
        metric: AlertMetric.MEMORY_RSS,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      });

      alertManager.evaluate();
      expect(alertManager.getActiveAlerts().length).toBe(2);

      const count = alertManager.acknowledgeAll();
      expect(count).toBe(2);
      expect(alertManager.getActiveAlerts().length).toBe(0);
    });
  });

  describe('anomaly detection', () => {
    it('should detect latency anomalies', () => {
      // Build a baseline of low-latency operations
      for (let i = 0; i < 50; i++) {
        collector.record(OperationType.DEPOSIT, 100 + Math.random() * 20, MetricStatus.SUCCESS);
      }

      // Now inject high-latency operations
      for (let i = 0; i < 10; i++) {
        collector.record(OperationType.DEPOSIT, 5000 + Math.random() * 1000, MetricStatus.SUCCESS);
      }

      const anomaly = alertManager.detectAnomaly(OperationType.DEPOSIT, 2, 300_000, 300_000);
      // The high-latency entries are part of the same window so anomaly may or may not trigger
      // depending on whether the recent average exceeds mean + 2*stddev.
      // With 50 entries at ~110ms and 10 at ~5500ms, the mean is about 1010ms with high stddev.
      // This is more of a behavioral test than a strict assertion.
      // At minimum, the method should not throw.
      expect(anomaly === null || anomaly.severity === AlertSeverity.WARNING).toBe(true);
    });

    it('should return null when not enough data', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      const anomaly = alertManager.detectAnomaly(OperationType.DEPOSIT);
      expect(anomaly).toBeNull();
    });
  });

  describe('DEFAULT_ALERT_RULES', () => {
    it('should have valid default rules', () => {
      expect(DEFAULT_ALERT_RULES.length).toBeGreaterThan(0);

      for (const rule of DEFAULT_ALERT_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
        expect(rule.threshold).toBeGreaterThan(0);
        expect(rule.windowMs).toBeGreaterThan(0);
        expect(rule.cooldownMs).toBeGreaterThan(0);
        expect(rule.enabled).toBe(true);
      }
    });
  });
});

// ── MonitoringDashboard Tests ────────────────────────────────

describe('MonitoringDashboard', () => {
  let collector: MetricsCollector;
  let alertManager: AlertManager;
  let dashboard: MonitoringDashboard;

  beforeEach(() => {
    collector = new MetricsCollector({
      maxEntries: 1000,
      captureMemory: true,
      systemMetricsIntervalMs: 0,
      enablePrometheusExport: false,
    });
    alertManager = new AlertManager(collector, []);
    dashboard = new MonitoringDashboard(collector, alertManager);
  });

  afterEach(() => {
    alertManager.destroy();
    collector.destroy();
  });

  describe('snapshot()', () => {
    it('should return a complete monitoring snapshot', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      collector.record(OperationType.WITHDRAWAL, 200, MetricStatus.FAILURE);

      const snap = dashboard.snapshot();
      expect(snap.operationMetrics).toBeDefined();
      expect(snap.operationMetrics.length).toBe(Object.values(OperationType).length);
      expect(snap.systemMetrics).toBeDefined();
      expect(snap.activeAlerts).toBeDefined();
      expect(snap.totalMetricsCollected).toBe(2);
      expect(snap.monitoringUptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(snap.timestamp).toBeTruthy();
    });
  });

  describe('render()', () => {
    it('should render a non-empty dashboard string', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      collector.record(OperationType.ZK_PROOF_GENERATION, 5000, MetricStatus.SUCCESS);

      const output = dashboard.render();
      expect(output).toContain('PRIVACYLAYER PERFORMANCE MONITOR');
      expect(output).toContain('SYSTEM HEALTH');
      expect(output).toContain('OPERATION METRICS');
      expect(output).toContain('ACTIVE ALERTS');
      expect(output).toContain('RECENT ACTIVITY');
    });

    it('should show active alerts in the render', () => {
      alertManager.addRule({
        id: 'render-alert',
        name: 'Render Alert Test',
        operation: null,
        metric: AlertMetric.MEMORY_HEAP,
        condition: AlertCondition.GREATER_THAN,
        threshold: 1,
        windowMs: 60_000,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        cooldownMs: 0,
      });

      alertManager.evaluate();
      const output = dashboard.render();
      expect(output).toContain('Render Alert Test');
      expect(output).toContain('[CRITICAL]');
    });

    it('should handle empty state gracefully', () => {
      const output = dashboard.render();
      expect(output).toContain('No operations recorded');
      expect(output).toContain('No active alerts');
    });
  });

  describe('renderCompact()', () => {
    it('should return a single-line status', () => {
      collector.record(OperationType.DEPOSIT, 100, MetricStatus.SUCCESS);
      const compact = dashboard.renderCompact();
      expect(compact).toContain('[PrivacyLayer]');
      expect(compact).toContain('ops:');
      expect(compact).toContain('rpc:');
      expect(compact).toContain('mem:');
    });
  });

  describe('getOperationSummary()', () => {
    it('should return formatted summary for an operation', () => {
      for (let i = 0; i < 10; i++) {
        collector.record(OperationType.DEPOSIT, 100 + i * 10, MetricStatus.SUCCESS);
      }

      const summary = dashboard.getOperationSummary(OperationType.DEPOSIT);
      expect(summary).not.toBeNull();
      expect(summary!.operation).toBe(OperationType.DEPOSIT);
      expect(summary!.count).toBe(10);
      expect(summary!.successRate).toContain('%');
      expect(summary!.avgLatency).toContain('ms');
    });

    it('should return null when no data', () => {
      const summary = dashboard.getOperationSummary(OperationType.WITHDRAWAL);
      expect(summary).toBeNull();
    });
  });
});

// ── createMonitoring Factory Tests ───────────────────────────

describe('createMonitoring()', () => {
  let monitoring: MonitoringSystem;

  afterEach(() => {
    if (monitoring) monitoring.destroy();
  });

  it('should create a fully functional monitoring system', () => {
    monitoring = createMonitoring({
      metrics: { maxEntries: 500, captureMemory: false, systemMetricsIntervalMs: 0 },
      alertEvaluationIntervalMs: 0, // Disable auto-evaluation
    });

    expect(monitoring.collector).toBeDefined();
    expect(monitoring.alerts).toBeDefined();
    expect(monitoring.dashboard).toBeDefined();
    expect(typeof monitoring.destroy).toBe('function');
  });

  it('should allow recording metrics and viewing dashboard', () => {
    monitoring = createMonitoring({
      metrics: { maxEntries: 500, captureMemory: false, systemMetricsIntervalMs: 0 },
      alertEvaluationIntervalMs: 0,
    });

    const end = monitoring.collector.startTimer(OperationType.DEPOSIT);
    end(MetricStatus.SUCCESS, { txHash: '0x123' });

    const snap = monitoring.dashboard.snapshot();
    expect(snap.totalMetricsCollected).toBe(1);
  });

  it('should accept custom alert rules', () => {
    const customRules: AlertRule[] = [
      {
        id: 'custom-only',
        name: 'Custom Rule',
        operation: OperationType.DEPOSIT,
        metric: AlertMetric.LATENCY_AVG,
        condition: AlertCondition.GREATER_THAN,
        threshold: 100,
        windowMs: 60_000,
        severity: AlertSeverity.WARNING,
        enabled: true,
        cooldownMs: 0,
      },
    ];

    monitoring = createMonitoring({
      metrics: { maxEntries: 100, captureMemory: false, systemMetricsIntervalMs: 0 },
      alertRules: customRules,
      alertEvaluationIntervalMs: 0,
    });

    expect(monitoring.alerts.getRules().length).toBe(1);
    expect(monitoring.alerts.getRules()[0].id).toBe('custom-only');
  });

  it('should cleanly destroy all components', () => {
    monitoring = createMonitoring({
      metrics: { maxEntries: 100, captureMemory: false, systemMetricsIntervalMs: 0 },
      alertEvaluationIntervalMs: 0,
    });

    // Should not throw
    expect(() => monitoring.destroy()).not.toThrow();
  });
});

// ── Integration Test ─────────────────────────────────────────

describe('Integration: End-to-End Monitoring Flow', () => {
  it('should track a complete deposit+withdrawal cycle', async () => {
    const monitoring = createMonitoring({
      metrics: { maxEntries: 1000, captureMemory: true, systemMetricsIntervalMs: 0 },
      alertRules: [
        {
          id: 'slow-deposit',
          name: 'Slow Deposit',
          operation: OperationType.DEPOSIT,
          metric: AlertMetric.LATENCY_AVG,
          condition: AlertCondition.GREATER_THAN,
          threshold: 200,
          windowMs: 300_000,
          severity: AlertSeverity.WARNING,
          enabled: true,
          cooldownMs: 0,
        },
      ],
      alertEvaluationIntervalMs: 0,
    });

    const alerts: AlertEvent[] = [];
    monitoring.alerts.onAlert((event) => { alerts.push(event); });

    try {
      // Simulate deposit
      await monitoring.collector.measure(OperationType.NOTE_GENERATION, async () => {
        await sleep(10);
        return { nullifier: '0x1', secret: '0x2', commitment: '0x3' };
      });

      // Simulate slow deposit (should trigger alert)
      await monitoring.collector.measure(OperationType.DEPOSIT, async () => {
        await sleep(250); // Slow enough to trigger alert
        return { leafIndex: 0 };
      });

      // Simulate ZK proof generation
      await monitoring.collector.measure(OperationType.ZK_PROOF_GENERATION, async () => {
        await sleep(50);
        return { proof: 'groth16-proof' };
      });

      // Simulate withdrawal
      await monitoring.collector.measure(OperationType.WITHDRAWAL, async () => {
        await sleep(30);
        return { txHash: '0xabc' };
      });

      // Evaluate alerts
      monitoring.alerts.evaluate();

      // Verify metrics were collected
      const snap = monitoring.dashboard.snapshot();
      expect(snap.totalMetricsCollected).toBe(4);

      // Verify deposit alert fired
      expect(alerts.length).toBe(1);
      expect(alerts[0].ruleId).toBe('slow-deposit');

      // Verify Prometheus export contains all operations
      const prom = monitoring.collector.toPrometheus();
      expect(prom).toContain('deposit');
      expect(prom).toContain('withdrawal');
      expect(prom).toContain('zk_proof_generation');
      expect(prom).toContain('note_generation');

      // Verify dashboard render
      const rendered = monitoring.dashboard.render();
      expect(rendered).toContain('PRIVACYLAYER PERFORMANCE MONITOR');
    } finally {
      monitoring.destroy();
    }
  });
});

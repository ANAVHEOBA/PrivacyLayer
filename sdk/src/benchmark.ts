/**
 * Proving Performance Benchmarks
 *
 * Measures proving time, memory usage, and other performance metrics
 * for different proving backends and proof flows.
 */

import { ProvingBackend } from './proof';
import { WithdrawalRequest, generateWithdrawalProof } from './withdraw';

/**
 * Performance metrics for a single proof generation.
 */
export interface ProofMetrics {
  // Timing metrics
  witnessPreparationMs: number;
  proofGenerationMs: number;
  totalMs: number;

  // Memory metrics
  memoryUsedMB: number;
  peakMemoryMB: number;

  // Proof size
  proofSizeBytes: number;

  // Environment context
  environment: 'node' | 'browser';
  backendName: string;
  artifactVersion: string;
  scenario: BenchmarkScenario;
  timestamp: string;
}

/**
 * Benchmark scenarios captured for release rehearsal.
 */
export type BenchmarkScenario = 'cold-start' | 'warm-start' | 'throughput' | 'memory';

export type BenchmarkRuntime = 'node' | 'browser';

export interface BenchmarkSummary {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface BenchmarkThresholds {
  witnessPreparationMs: number;
  proofGenerationMs: number;
  totalMs: number;
  memoryUsedMB: number;
  peakMemoryMB: number;
  proofSizeBytes: number;
  proofsPerSecond: number;
}

/**
 * Benchmark baseline for regression detection.
 */
export interface BenchmarkBaseline {
  artifactVersion: string;
  backendName: string;
  runtime: BenchmarkRuntime;
  scenario: BenchmarkScenario;
  timestamp: string;
  environment: 'node' | 'browser';
  metrics: {
    witnessPreparationMs: BenchmarkSummary;
    proofGenerationMs: BenchmarkSummary;
    totalMs: BenchmarkSummary;
    memoryUsedMB: BenchmarkSummary;
    peakMemoryMB: BenchmarkSummary;
    proofSizeBytes: BenchmarkSummary;
    proofsPerSecond: BenchmarkSummary;
  };
  thresholds: BenchmarkThresholds;
}

export interface BenchmarkArchive {
  schemaVersion: number;
  generatedAt: string;
  baselines: Record<string, BenchmarkBaseline>;
}

export interface BenchmarkRegressionReport {
  hasRegression: boolean;
  report: string;
  changes: Record<string, number>;
}

/**
 * Benchmarking suite for withdrawal proof generation.
 */
export class ProofBenchmark {
  constructor(
    private backend: ProvingBackend,
    private backendName: string = 'unknown',
    private artifactVersion: string = '1',
    private runtime: BenchmarkRuntime = this.getEnvironment()
  ) {}

  /**
   * Benchmark a single withdrawal proof generation.
   *
   * Measures:
   * - Witness preparation time
   * - Proof generation time
   * - Memory usage (Node.js only)
   * - Proof size
   *
   * @param request The withdrawal parameters
   * @returns Detailed performance metrics
   */
  async benchmarkWithdrawal(request: WithdrawalRequest): Promise<ProofMetrics> {
    const startTotal = performance.now();
    const initialMemory = this.getMemoryUsage();

    // Step 1: Prepare witness
    const { ProofGenerator } = await import('./proof');
    const startWitness = performance.now();
    const witness = await ProofGenerator.prepareWitness(
      request.note,
      request.merkleProof,
      request.recipient,
      request.relayer,
      request.fee
    );
    const witnessPreparationMs = performance.now() - startWitness;

    // Step 2: Generate proof
    const startProof = performance.now();
    const proof = await this.backend.generateProof(witness);
    const proofGenerationMs = performance.now() - startProof;

    const finalMemory = this.getMemoryUsage();
    const totalMs = performance.now() - startTotal;

    return {
      witnessPreparationMs: Math.round(witnessPreparationMs * 10) / 10,
      proofGenerationMs: Math.round(proofGenerationMs * 10) / 10,
      totalMs: Math.round(totalMs * 10) / 10,
      memoryUsedMB: Math.round((finalMemory.used - initialMemory.used) * 100) / 100,
      peakMemoryMB: Math.round(finalMemory.heapUsed / 1024 / 1024 * 100) / 100,
      proofSizeBytes: proof.length,
      environment: this.getEnvironment(),
      backendName: this.backendName,
      artifactVersion: this.artifactVersion,
      scenario: 'warm-start',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run multiple iterations of the benchmark and compute statistics.
   *
   * @param request The withdrawal parameters
   * @param iterations Number of proof generations to benchmark
   * @returns Array of metrics for each iteration plus computed baseline
   */
  async benchmarkIterations(
    request: WithdrawalRequest,
    iterations: number = 3,
    scenario: BenchmarkScenario = 'warm-start'
  ): Promise<{
    metrics: ProofMetrics[];
    baseline: BenchmarkBaseline;
  }> {
    const metrics: ProofMetrics[] = [];

    console.log(
      `Running ${iterations} iterations of withdrawal proof benchmark (${this.backendName})...`
    );

    for (let i = 0; i < iterations; i++) {
      console.log(`  Iteration ${i + 1}/${iterations}...`);
      const result = await this.benchmarkWithdrawal(request);
      result.scenario = scenario;
      metrics.push(result);
    }

    const baseline = this.computeBaseline(metrics, scenario);
    return { metrics, baseline };
  }

  /**
   * Compute statistical baseline from benchmark results.
   */
  private computeBaseline(metrics: ProofMetrics[], scenario: BenchmarkScenario): BenchmarkBaseline {
    const proofTimes = metrics.map((m) => m.proofGenerationMs);
    const witnessTimes = metrics.map((m) => m.witnessPreparationMs);
    const totalTimes = metrics.map((m) => m.totalMs);
    const memoryUsage = metrics.map((m) => m.memoryUsedMB);
    const peakMemoryUsage = metrics.map((m) => m.peakMemoryMB);
    const proofSizes = metrics.map((m) => m.proofSizeBytes);
    const throughput = metrics.map((m) => this.proofsPerSecond(m.proofGenerationMs));

    return {
      artifactVersion: this.artifactVersion,
      backendName: this.backendName,
      runtime: this.runtime,
      scenario,
      timestamp: new Date().toISOString(),
      environment: metrics[0].environment,
      metrics: {
        witnessPreparationMs: this.summary(witnessTimes),
        proofGenerationMs: {
          ...this.summary(proofTimes),
        },
        totalMs: this.summary(totalTimes),
        memoryUsedMB: this.summary(memoryUsage),
        peakMemoryMB: this.summary(peakMemoryUsage),
        proofSizeBytes: this.summary(proofSizes),
        proofsPerSecond: this.summary(throughput),
      },
      thresholds: this.defaultThresholds(),
    };
  }

  /**
   * Detect performance regression by comparing current results to baseline.
   *
   * @param current Current benchmark baseline
   * @param previous Previous benchmark baseline
   * @param threshold Regression threshold (default: 10%)
   * @returns Regression analysis report
   */
  static detectRegression(
    current: BenchmarkBaseline,
    previous: BenchmarkBaseline,
    thresholds: Partial<BenchmarkThresholds> = {}
  ): BenchmarkRegressionReport {
    const resolvedThresholds = { ...current.thresholds, ...thresholds };
    const changes: Record<string, number> = {};

    const proofGenerationChange = ProofBenchmark.relativeChange(
      current.metrics.proofGenerationMs.mean,
      previous.metrics.proofGenerationMs.mean
    );
    const memoryChange = ProofBenchmark.relativeChange(current.metrics.memoryUsedMB.mean, previous.metrics.memoryUsedMB.mean);
    const totalChange = ProofBenchmark.relativeChange(current.metrics.totalMs.mean, previous.metrics.totalMs.mean);
    const peakMemoryChange = ProofBenchmark.relativeChange(current.metrics.peakMemoryMB.mean, previous.metrics.peakMemoryMB.mean);
    const proofSizeChange = ProofBenchmark.relativeChange(current.metrics.proofSizeBytes.mean, previous.metrics.proofSizeBytes.mean);
    const throughputChange = ProofBenchmark.relativeChange(current.metrics.proofsPerSecond.mean, previous.metrics.proofsPerSecond.mean);
    const witnessChange = ProofBenchmark.relativeChange(
      current.metrics.witnessPreparationMs.mean,
      previous.metrics.witnessPreparationMs.mean
    );

    changes.proofGenerationMs = proofGenerationChange;
    changes.memoryUsedMB = memoryChange;
    changes.totalMs = totalChange;
    changes.peakMemoryMB = peakMemoryChange;
    changes.proofSizeBytes = proofSizeChange;
    changes.proofsPerSecond = throughputChange;
    changes.witnessPreparationMs = witnessChange;

    const hasRegression =
      proofGenerationChange > resolvedThresholds.proofGenerationMs ||
      memoryChange > resolvedThresholds.memoryUsedMB ||
      totalChange > resolvedThresholds.totalMs ||
      peakMemoryChange > resolvedThresholds.peakMemoryMB ||
      proofSizeChange > resolvedThresholds.proofSizeBytes ||
      witnessChange > resolvedThresholds.witnessPreparationMs ||
      throughputChange < -resolvedThresholds.proofsPerSecond;

    const report = [
      `Performance Regression Report (${current.backendName}, ${current.runtime}, ${current.scenario})`,
      '========================================',
      `Artifact Version: ${current.artifactVersion}`,
      `Proof Generation Time: ${(proofGenerationChange * 100).toFixed(2)}% ${proofGenerationChange > 0 ? 'slower' : 'faster'}`,
      `  Previous: ${previous.metrics.proofGenerationMs.mean.toFixed(2)}ms`,
      `  Current:  ${current.metrics.proofGenerationMs.mean.toFixed(2)}ms`,
      '',
      `Witness Preparation: ${(witnessChange * 100).toFixed(2)}% ${witnessChange > 0 ? 'slower' : 'faster'}`,
      `  Previous: ${previous.metrics.witnessPreparationMs.mean.toFixed(2)}ms`,
      `  Current:  ${current.metrics.witnessPreparationMs.mean.toFixed(2)}ms`,
      '',
      `Total Time: ${(totalChange * 100).toFixed(2)}% ${totalChange > 0 ? 'slower' : 'faster'}`,
      `  Previous: ${previous.metrics.totalMs.mean.toFixed(2)}ms`,
      `  Current:  ${current.metrics.totalMs.mean.toFixed(2)}ms`,
      '',
      `Throughput: ${(throughputChange * 100).toFixed(2)}% ${throughputChange > 0 ? 'faster' : 'slower'}`,
      `  Previous: ${previous.metrics.proofsPerSecond.mean.toFixed(2)} proofs/s`,
      `  Current:  ${current.metrics.proofsPerSecond.mean.toFixed(2)} proofs/s`,
      '',
      `Memory Usage: ${(memoryChange * 100).toFixed(2)}% ${memoryChange > 0 ? 'higher' : 'lower'}`,
      `  Previous: ${previous.metrics.memoryUsedMB.mean.toFixed(2)}MB`,
      `  Current:  ${current.metrics.memoryUsedMB.mean.toFixed(2)}MB`,
      '',
      `Peak Memory: ${(peakMemoryChange * 100).toFixed(2)}% ${peakMemoryChange > 0 ? 'higher' : 'lower'}`,
      `  Previous: ${previous.metrics.peakMemoryMB.mean.toFixed(2)}MB`,
      `  Current:  ${current.metrics.peakMemoryMB.mean.toFixed(2)}MB`,
      '',
      `Proof Size: ${(proofSizeChange * 100).toFixed(2)}% ${proofSizeChange > 0 ? 'larger' : 'smaller'}`,
      `  Previous: ${previous.metrics.proofSizeBytes.mean.toFixed(2)} bytes`,
      `  Current:  ${current.metrics.proofSizeBytes.mean.toFixed(2)} bytes`,
      '',
      `Regression Detected: ${hasRegression ? 'YES' : 'NO'}`,
    ].join('\n');

    return { hasRegression, report, changes };
  }

  /**
   * Format benchmark metrics as a human-readable report.
   */
  static formatReport(metrics: ProofMetrics[]): string {
    const lines = [
      `Benchmark Report (${metrics[0].backendName})`,
      '========================================',
      `Environment: ${metrics[0].environment}`,
      `Artifact Version: ${metrics[0].artifactVersion}`,
      `Scenario: ${metrics[0].scenario}`,
      `Runs: ${metrics.length}`,
      '',
      'Timing Metrics:',
      `  Witness Preparation: ${(metrics[0].witnessPreparationMs).toFixed(2)}ms`,
      `  Proof Generation:    ${(metrics[0].proofGenerationMs).toFixed(2)}ms (avg: ${(metrics.reduce((a, m) => a + m.proofGenerationMs, 0) / metrics.length).toFixed(2)}ms)`,
      `  Total:              ${(metrics[0].totalMs).toFixed(2)}ms`,
      '',
      'Memory Metrics:',
      `  Used: ${(metrics[0].memoryUsedMB).toFixed(2)}MB`,
      `  Peak: ${(metrics[0].peakMemoryMB).toFixed(2)}MB`,
      '',
      'Proof Size:',
      `  ${metrics[0].proofSizeBytes} bytes`,
    ];

    return lines.join('\n');
  }

  static benchmarkKey(baseline: BenchmarkBaseline): string {
    return [baseline.artifactVersion, baseline.backendName, baseline.runtime, baseline.scenario].join('::');
  }

  static createArchive(baselines: BenchmarkBaseline[]): BenchmarkArchive {
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      baselines: Object.fromEntries(baselines.map((baseline) => [ProofBenchmark.benchmarkKey(baseline), baseline])),
    };
  }

  // Helper methods
  private getMemoryUsage(): { used: number; heapUsed: number } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        used: mem.heapUsed / 1024 / 1024,
        heapUsed: mem.heapUsed,
      };
    }
    // Browser environment: return dummy values
    return { used: 0, heapUsed: 0 };
  }

  private getEnvironment(): 'node' | 'browser' {
    return typeof process !== 'undefined' && process.versions ? 'node' : 'browser';
  }

  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private stdDev(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private min(values: number[]): number {
    return Math.min(...values);
  }

  private max(values: number[]): number {
    return Math.max(...values);
  }

  private summary(values: number[]): BenchmarkSummary {
    return {
      mean: this.mean(values),
      stdDev: this.stdDev(values),
      min: this.min(values),
      max: this.max(values),
    };
  }

  private proofsPerSecond(proofGenerationMs: number): number {
    if (proofGenerationMs <= 0) {
      return 0;
    }

    return 1000 / proofGenerationMs;
  }

  private defaultThresholds(): BenchmarkThresholds {
    return {
      witnessPreparationMs: 0.1,
      proofGenerationMs: 0.1,
      totalMs: 0.1,
      memoryUsedMB: 0.1,
      peakMemoryMB: 0.1,
      proofSizeBytes: 0,
      proofsPerSecond: 0.1,
    };
  }

  private static relativeChange(current: number, previous: number): number {
    if (previous === 0) {
      return current === 0 ? 0 : 1;
    }

    return (current - previous) / previous;
  }
}

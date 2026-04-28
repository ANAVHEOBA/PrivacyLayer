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
  timestamp: string;
}

/**
 * Benchmark baseline for regression detection.
 */
export interface BenchmarkBaseline {
  version: string;
  timestamp: string;
  environment: 'node' | 'browser';
  metrics: {
    proofGenerationMs: { mean: number; stdDev: number };
    memoryUsedMB: { mean: number; stdDev: number };
    proofSizeBytes: number;
  };
}

/**
 * Benchmarking suite for withdrawal proof generation.
 */
export class ProofBenchmark {
  constructor(
    private backend: ProvingBackend,
    private backendName: string = 'unknown'
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
    iterations: number = 3
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
      metrics.push(result);
    }

    const baseline = this.computeBaseline(metrics);
    return { metrics, baseline };
  }

  /**
   * Compute statistical baseline from benchmark results.
   */
  private computeBaseline(metrics: ProofMetrics[]): BenchmarkBaseline {
    const proofTimes = metrics.map((m) => m.proofGenerationMs);
    const memoryUsage = metrics.map((m) => m.memoryUsedMB);
    const proofSizes = metrics.map((m) => m.proofSizeBytes);

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: metrics[0].environment,
      metrics: {
        proofGenerationMs: {
          mean: this.mean(proofTimes),
          stdDev: this.stdDev(proofTimes),
        },
        memoryUsedMB: {
          mean: this.mean(memoryUsage),
          stdDev: this.stdDev(memoryUsage),
        },
        proofSizeBytes: proofSizes[0], // Should be consistent across runs
      },
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
    threshold: number = 0.1
  ): {
    hasRegression: boolean;
    proofGenerationChange: number;
    memoryChange: number;
    report: string;
  } {
    const proofChange =
      (current.metrics.proofGenerationMs.mean - previous.metrics.proofGenerationMs.mean) /
      previous.metrics.proofGenerationMs.mean;
    const memoryChange =
      (current.metrics.memoryUsedMB.mean - previous.metrics.memoryUsedMB.mean) /
      previous.metrics.memoryUsedMB.mean;

    const hasRegression = Math.abs(proofChange) > threshold || Math.abs(memoryChange) > threshold;

    const report = [
      `Performance Regression Report (${current.environment})`,
      '========================================',
      `Proof Generation Time: ${(proofChange * 100).toFixed(2)}% ${proofChange > 0 ? 'slower' : 'faster'}`,
      `  Previous: ${previous.metrics.proofGenerationMs.mean.toFixed(2)}ms`,
      `  Current:  ${current.metrics.proofGenerationMs.mean.toFixed(2)}ms`,
      '',
      `Memory Usage: ${(memoryChange * 100).toFixed(2)}% ${memoryChange > 0 ? 'higher' : 'lower'}`,
      `  Previous: ${previous.metrics.memoryUsedMB.mean.toFixed(2)}MB`,
      `  Current:  ${current.metrics.memoryUsedMB.mean.toFixed(2)}MB`,
      '',
      `Regression Detected: ${hasRegression ? 'YES' : 'NO'}`,
    ].join('\n');

    return {
      hasRegression,
      proofGenerationChange: proofChange,
      memoryChange,
      report,
    };
  }

  /**
   * Format benchmark metrics as a human-readable report.
   */
  static formatReport(metrics: ProofMetrics[]): string {
    const lines = [
      `Benchmark Report (${metrics[0].backendName})`,
      '========================================',
      `Environment: ${metrics[0].environment}`,
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
}

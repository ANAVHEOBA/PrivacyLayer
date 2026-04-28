import { BenchmarkBaseline, ProofBenchmark } from '../src/benchmark';

function buildBaseline(overrides: Partial<BenchmarkBaseline> = {}): BenchmarkBaseline {
  return {
    artifactVersion: '1',
    backendName: 'nargo/noir',
    runtime: 'node',
    scenario: 'warm-start',
    timestamp: '2026-04-27T00:00:00.000Z',
    environment: 'node',
    metrics: {
      witnessPreparationMs: { mean: 10, stdDev: 1, min: 9, max: 11 },
      proofGenerationMs: { mean: 20, stdDev: 2, min: 18, max: 22 },
      totalMs: { mean: 30, stdDev: 3, min: 27, max: 33 },
      memoryUsedMB: { mean: 40, stdDev: 4, min: 36, max: 44 },
      peakMemoryMB: { mean: 50, stdDev: 5, min: 45, max: 55 },
      proofSizeBytes: { mean: 512, stdDev: 0, min: 512, max: 512 },
      proofsPerSecond: { mean: 50, stdDev: 5, min: 45, max: 55 },
    },
    thresholds: {
      witnessPreparationMs: 0.1,
      proofGenerationMs: 0.1,
      totalMs: 0.1,
      memoryUsedMB: 0.1,
      peakMemoryMB: 0.1,
      proofSizeBytes: 0,
      proofsPerSecond: 0.1,
    },
    ...overrides,
  };
}

describe('Benchmark release baselines', () => {
  it('keys archive entries by version backend runtime and scenario', () => {
    const baseline = buildBaseline();
    const archive = ProofBenchmark.createArchive([baseline]);

    expect(ProofBenchmark.benchmarkKey(baseline)).toBe('1::nargo/noir::node::warm-start');
    expect(archive.schemaVersion).toBe(1);
    expect(Object.keys(archive.baselines)).toEqual(['1::nargo/noir::node::warm-start']);
  });

  it('flags regressions when latency and memory exceed thresholds', () => {
    const previous = buildBaseline();
    const current = buildBaseline({
      metrics: {
        witnessPreparationMs: { mean: 12, stdDev: 1, min: 11, max: 13 },
        proofGenerationMs: { mean: 26, stdDev: 2, min: 24, max: 28 },
        totalMs: { mean: 36, stdDev: 3, min: 33, max: 39 },
        memoryUsedMB: { mean: 48, stdDev: 4, min: 44, max: 52 },
        peakMemoryMB: { mean: 59, stdDev: 5, min: 54, max: 64 },
        proofSizeBytes: { mean: 520, stdDev: 0, min: 520, max: 520 },
        proofsPerSecond: { mean: 38, stdDev: 3, min: 35, max: 41 },
      },
    });

    const result = ProofBenchmark.detectRegression(current, previous, {
      witnessPreparationMs: 0.05,
      proofGenerationMs: 0.05,
      totalMs: 0.05,
      memoryUsedMB: 0.05,
      peakMemoryMB: 0.05,
      proofSizeBytes: 0,
      proofsPerSecond: 0.05,
    });

    expect(result.hasRegression).toBe(true);
    expect(result.changes.proofGenerationMs).toBeGreaterThan(0);
    expect(result.report).toContain('Regression Detected: YES');
  });
});

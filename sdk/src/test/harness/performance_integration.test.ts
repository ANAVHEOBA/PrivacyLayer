/**
 * Integration tests for performance metrics collection in WithdrawHarness
 * 
 * **Validates: Requirements 2.3, 12.3, 12.5**
 * 
 * @module performance_integration.test
 */

import { WithdrawHarness } from './harness';
import { MockProvingBackend } from './mock_backend';
import type { HarnessConfig } from './types';

describe('WithdrawHarness Performance Metrics Integration', () => {
  describe('Performance metrics with mock test results', () => {
    it('should calculate performance statistics from test results', async () => {
      // **Validates: Requirement 2.3** - Calculate p95 and p99 latencies
      const { calculatePerformanceStats, generateBackendPerformanceComparison } = await import('./performance');
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });

      // Create mock test results with realistic timing data
      const testResults: any[] = [
        {
          testName: 'test1',
          scenario: 'happy-path',
          passed: true,
          metrics: {
            witnessPreparationTime: 10,
            proofGenerationTime: 50,
            contractExecutionTime: 100,
            totalTime: 160,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
        {
          testName: 'test2',
          scenario: 'proof-failure',
          passed: true,
          metrics: {
            witnessPreparationTime: 12,
            proofGenerationTime: 55,
            contractExecutionTime: 105,
            totalTime: 172,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
        {
          testName: 'test3',
          scenario: 'root-failure',
          passed: true,
          metrics: {
            witnessPreparationTime: 11,
            proofGenerationTime: 52,
            contractExecutionTime: 102,
            totalTime: 165,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
        {
          testName: 'test4',
          scenario: 'nullifier-failure',
          passed: true,
          metrics: {
            witnessPreparationTime: 13,
            proofGenerationTime: 58,
            contractExecutionTime: 108,
            totalTime: 179,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
      ];

      // Calculate performance statistics
      const proofTimes = testResults.map(r => r.metrics.proofGenerationTime);
      const proofStats = calculatePerformanceStats(proofTimes);

      // Verify statistics are calculated correctly
      expect(proofStats.sampleCount).toBe(4);
      expect(proofStats.min).toBe(50);
      expect(proofStats.max).toBe(58);
      expect(proofStats.average).toBeCloseTo(53.75, 1);
      expect(proofStats.p95).toBeGreaterThan(55);
      expect(proofStats.p99).toBeGreaterThan(57);

      // Generate backend performance comparison
      const comparison = generateBackendPerformanceComparison(testResults, mockBackend);

      expect(comparison.backendType).toBe('mock');
      expect(comparison.proofGeneration.sampleCount).toBe(4);
      expect(comparison.proofGeneration.p95).toBeGreaterThan(0);
      expect(comparison.proofGeneration.p99).toBeGreaterThan(0);
      expect(comparison.contractExecution.sampleCount).toBe(4);
      expect(comparison.contractExecution.p95).toBeGreaterThan(0);
      expect(comparison.contractExecution.p99).toBeGreaterThan(0);
    });

    it('should generate performance report from mock results', async () => {
      // **Validates: Requirement 12.5** - Generate performance report
      const { generateBackendPerformanceComparison, generatePerformanceReport } = await import('./performance');
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });

      const testResults: any[] = [
        {
          testName: 'test1',
          scenario: 'happy-path',
          passed: true,
          metrics: {
            witnessPreparationTime: 10,
            proofGenerationTime: 50,
            contractExecutionTime: 100,
            totalTime: 160,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
      ];

      const comparison = generateBackendPerformanceComparison(testResults, mockBackend);
      const report = generatePerformanceReport(comparison);

      expect(report).toContain('PERFORMANCE REPORT');
      expect(report).toContain('Backend Type: mock');
      expect(report).toContain('Proof Generation:');
      expect(report).toContain('p95:');
      expect(report).toContain('p99:');
      expect(report).toContain('Performance Insights:');
    });

    it('should compare mock vs real backend performance', async () => {
      // **Validates: Requirement 12.3** - Compare mock vs real backend performance
      const { generateBackendPerformanceComparison, compareBackendPerformance } = await import('./performance');
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });
      const slowMockBackend = new MockProvingBackend({ generateValidProofs: true, simulateDelay: 200 });

      const mockResults: any[] = [
        {
          testName: 'test1',
          scenario: 'happy-path',
          passed: true,
          metrics: {
            witnessPreparationTime: 10,
            proofGenerationTime: 50,
            contractExecutionTime: 100,
            totalTime: 160,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
      ];

      const realResults: any[] = [
        {
          testName: 'test1',
          scenario: 'happy-path',
          passed: true,
          metrics: {
            witnessPreparationTime: 100,
            proofGenerationTime: 5000,
            contractExecutionTime: 100,
            totalTime: 5200,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
      ];

      const mockComparison = generateBackendPerformanceComparison(mockResults, mockBackend);
      const realComparison = generateBackendPerformanceComparison(realResults, slowMockBackend);
      const comparison = compareBackendPerformance(mockComparison, realComparison);

      expect(comparison).toContain('BACKEND PERFORMANCE COMPARISON');
      expect(comparison).toContain('Mock Backend vs Real Backend');
      expect(comparison).toContain('Proof Generation:');
      expect(comparison).toContain('Mock Average: 50.00ms');
      expect(comparison).toContain('Real Average: 5000.00ms');
      expect(comparison).toContain('Speedup: 100.0x faster with mock backend');
      expect(comparison).toContain('Mock p95:');
      expect(comparison).toContain('Real p95:');
    });
  });
});

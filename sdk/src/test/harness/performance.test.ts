/**
 * Tests for Performance Metrics Collection and Analysis
 * 
 * **Validates: Requirements 2.3, 12.3, 12.5**
 * 
 * @module performance.test
 */

import {
  calculatePerformanceStats,
  getBackendType,
  generateBackendPerformanceComparison,
  formatPerformanceStats,
  generatePerformanceReport,
  compareBackendPerformance,
} from './performance';
import { MockProvingBackend } from './mock_backend';
import type { TestResult, PerformanceStats, BackendPerformanceComparison } from './types';

describe('Performance Metrics', () => {
  describe('calculatePerformanceStats', () => {
    it('should calculate statistics for a set of measurements', () => {
      // **Validates: Requirement 2.3** - Calculate p95 and p99 latencies
      const measurements = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      const stats = calculatePerformanceStats(measurements);
      
      expect(stats.sampleCount).toBe(10);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.average).toBe(55);
      expect(stats.median).toBe(55);
      expect(stats.p95).toBeGreaterThan(90);
      expect(stats.p99).toBeGreaterThan(95);
    });

    it('should handle empty measurements', () => {
      const stats = calculatePerformanceStats([]);
      
      expect(stats.sampleCount).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.p95).toBe(0);
      expect(stats.p99).toBe(0);
    });

    it('should handle single measurement', () => {
      const stats = calculatePerformanceStats([42]);
      
      expect(stats.sampleCount).toBe(1);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.average).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.p95).toBe(42);
      expect(stats.p99).toBe(42);
    });

    it('should calculate correct percentiles for larger dataset', () => {
      // Create 100 measurements from 1 to 100
      const measurements = Array.from({ length: 100 }, (_, i) => i + 1);
      
      const stats = calculatePerformanceStats(measurements);
      
      expect(stats.sampleCount).toBe(100);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(100);
      expect(stats.average).toBe(50.5);
      expect(stats.median).toBeCloseTo(50.5, 1);
      expect(stats.p95).toBeCloseTo(95, 1);
      expect(stats.p99).toBeCloseTo(99, 1);
    });

    it('should handle measurements with outliers', () => {
      // Most measurements are fast, but a few are very slow
      const measurements = [10, 15, 20, 25, 30, 35, 40, 45, 50, 1000];
      
      const stats = calculatePerformanceStats(measurements);
      
      expect(stats.sampleCount).toBe(10);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(1000);
      expect(stats.median).toBe(32.5); // Not affected by outlier
      expect(stats.p95).toBeGreaterThan(500); // Captures outlier
      expect(stats.p99).toBeGreaterThan(900); // Captures outlier
    });
  });

  describe('getBackendType', () => {
    it('should identify mock backend', () => {
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });
      
      const backendType = getBackendType(mockBackend);
      
      expect(backendType).toBe('mock');
    });

    it('should return unknown for unrecognized backend', () => {
      // Create a minimal backend that doesn't match known types
      const unknownBackend = {
        generateProof: async () => new Uint8Array(256),
      } as any;
      
      const backendType = getBackendType(unknownBackend);
      
      expect(backendType).toBe('unknown');
    });
  });

  describe('generateBackendPerformanceComparison', () => {
    it('should generate performance comparison from test results', () => {
      // **Validates: Requirement 12.3** - Compare mock vs real backend performance
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });
      
      const testResults: TestResult[] = [
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
            witnessPreparationTime: 15,
            proofGenerationTime: 60,
            contractExecutionTime: 110,
            totalTime: 185,
          },
          proofSize: 256,
          publicInputCount: 8,
        },
      ];
      
      const comparison = generateBackendPerformanceComparison(testResults, mockBackend);
      
      expect(comparison.backendType).toBe('mock');
      expect(comparison.proofGeneration.sampleCount).toBe(2);
      expect(comparison.proofGeneration.average).toBe(55);
      expect(comparison.contractExecution.sampleCount).toBe(2);
      expect(comparison.contractExecution.average).toBe(105);
      expect(comparison.totalExecution.sampleCount).toBe(2);
      expect(comparison.totalExecution.average).toBe(172.5);
    });

    it('should handle empty test results', () => {
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });
      
      const comparison = generateBackendPerformanceComparison([], mockBackend);
      
      expect(comparison.backendType).toBe('mock');
      expect(comparison.proofGeneration.sampleCount).toBe(0);
      expect(comparison.contractExecution.sampleCount).toBe(0);
      expect(comparison.totalExecution.sampleCount).toBe(0);
    });

    it('should filter out zero timing values', () => {
      const mockBackend = new MockProvingBackend({ generateValidProofs: true });
      
      const testResults: TestResult[] = [
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
          passed: false,
          metrics: {
            witnessPreparationTime: 0,
            proofGenerationTime: 0,
            contractExecutionTime: 0,
            totalTime: 0,
          },
          proofSize: 0,
          publicInputCount: 0,
        },
      ];
      
      const comparison = generateBackendPerformanceComparison(testResults, mockBackend);
      
      // Should only count the first test result
      expect(comparison.proofGeneration.sampleCount).toBe(1);
      expect(comparison.proofGeneration.average).toBe(50);
      expect(comparison.contractExecution.sampleCount).toBe(1);
      expect(comparison.contractExecution.average).toBe(100);
    });
  });

  describe('formatPerformanceStats', () => {
    it('should format performance statistics as human-readable string', () => {
      const stats: PerformanceStats = {
        min: 10,
        max: 100,
        average: 55,
        median: 50,
        p95: 90,
        p99: 95,
        sampleCount: 10,
      };
      
      const formatted = formatPerformanceStats(stats, 'Test Metric');
      
      expect(formatted).toContain('Test Metric:');
      expect(formatted).toContain('Samples: 10');
      expect(formatted).toContain('Min: 10.00ms');
      expect(formatted).toContain('Max: 100.00ms');
      expect(formatted).toContain('Average: 55.00ms');
      expect(formatted).toContain('Median (p50): 50.00ms');
      expect(formatted).toContain('p95: 90.00ms');
      expect(formatted).toContain('p99: 95.00ms');
    });

    it('should handle empty statistics', () => {
      const stats: PerformanceStats = {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        sampleCount: 0,
      };
      
      const formatted = formatPerformanceStats(stats, 'Empty Metric');
      
      expect(formatted).toBe('Empty Metric: No data');
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', () => {
      // **Validates: Requirement 12.5** - Generate performance report
      const comparison: BackendPerformanceComparison = {
        backendType: 'mock',
        proofGeneration: {
          min: 40,
          max: 60,
          average: 50,
          median: 50,
          p95: 58,
          p99: 59,
          sampleCount: 10,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 10,
        },
        totalExecution: {
          min: 140,
          max: 180,
          average: 160,
          median: 160,
          p95: 175,
          p99: 178,
          sampleCount: 10,
        },
      };
      
      const report = generatePerformanceReport(comparison);
      
      expect(report).toContain('PERFORMANCE REPORT');
      expect(report).toContain('Backend Type: mock');
      expect(report).toContain('Proof Generation:');
      expect(report).toContain('Contract Execution:');
      expect(report).toContain('Total Execution:');
      expect(report).toContain('Performance Insights:');
      expect(report).toContain('Mock backend is performing well');
    });

    it('should include warnings for slow performance', () => {
      const comparison: BackendPerformanceComparison = {
        backendType: 'real',
        proofGeneration: {
          min: 5000,
          max: 35000,
          average: 20000,
          median: 18000,
          p95: 30000,
          p99: 33000,
          sampleCount: 10,
        },
        contractExecution: {
          min: 900,
          max: 1100,
          average: 1000,
          median: 1000,
          p95: 1080,
          p99: 1090,
          sampleCount: 10,
        },
        totalExecution: {
          min: 6000,
          max: 36000,
          average: 21000,
          median: 19000,
          p95: 31000,
          p99: 34000,
          sampleCount: 10,
        },
      };
      
      const report = generatePerformanceReport(comparison);
      
      expect(report).toContain('Real backend proof generation is moderate');
    });

    it('should detect high p99 latency', () => {
      const comparison: BackendPerformanceComparison = {
        backendType: 'mock',
        proofGeneration: {
          min: 40,
          max: 500,
          average: 60,
          median: 50,
          p95: 80,
          p99: 450, // Much higher than average
          sampleCount: 100,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 100,
        },
        totalExecution: {
          min: 140,
          max: 600,
          average: 170,
          median: 160,
          p95: 200,
          p99: 550,
          sampleCount: 100,
        },
      };
      
      const report = generatePerformanceReport(comparison);
      
      expect(report).toContain('High p99 latency detected');
      expect(report).toContain('some proofs are taking much longer');
    });
  });

  describe('compareBackendPerformance', () => {
    it('should compare performance between mock and real backends', () => {
      // **Validates: Requirement 12.3** - Compare mock vs real backend performance
      const mockComparison: BackendPerformanceComparison = {
        backendType: 'mock',
        proofGeneration: {
          min: 40,
          max: 60,
          average: 50,
          median: 50,
          p95: 58,
          p99: 59,
          sampleCount: 10,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 10,
        },
        totalExecution: {
          min: 140,
          max: 180,
          average: 160,
          median: 160,
          p95: 175,
          p99: 178,
          sampleCount: 10,
        },
      };

      const realComparison: BackendPerformanceComparison = {
        backendType: 'real',
        proofGeneration: {
          min: 5000,
          max: 7000,
          average: 6000,
          median: 6000,
          p95: 6800,
          p99: 6900,
          sampleCount: 10,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 10,
        },
        totalExecution: {
          min: 5100,
          max: 7100,
          average: 6100,
          median: 6100,
          p95: 6900,
          p99: 7000,
          sampleCount: 10,
        },
      };
      
      const comparison = compareBackendPerformance(mockComparison, realComparison);
      
      expect(comparison).toContain('BACKEND PERFORMANCE COMPARISON');
      expect(comparison).toContain('Mock Backend vs Real Backend');
      expect(comparison).toContain('Proof Generation:');
      expect(comparison).toContain('Mock Average: 50.00ms');
      expect(comparison).toContain('Real Average: 6000.00ms');
      expect(comparison).toContain('Speedup: 120.0x faster with mock backend');
      expect(comparison).toContain('Contract Execution:');
      expect(comparison).toContain('Total Execution:');
    });

    it('should show p95 and p99 comparisons', () => {
      const mockComparison: BackendPerformanceComparison = {
        backendType: 'mock',
        proofGeneration: {
          min: 40,
          max: 60,
          average: 50,
          median: 50,
          p95: 58,
          p99: 59,
          sampleCount: 10,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 10,
        },
        totalExecution: {
          min: 140,
          max: 180,
          average: 160,
          median: 160,
          p95: 175,
          p99: 178,
          sampleCount: 10,
        },
      };

      const realComparison: BackendPerformanceComparison = {
        backendType: 'real',
        proofGeneration: {
          min: 5000,
          max: 7000,
          average: 6000,
          median: 6000,
          p95: 6800,
          p99: 6900,
          sampleCount: 10,
        },
        contractExecution: {
          min: 90,
          max: 110,
          average: 100,
          median: 100,
          p95: 108,
          p99: 109,
          sampleCount: 10,
        },
        totalExecution: {
          min: 5100,
          max: 7100,
          average: 6100,
          median: 6100,
          p95: 6900,
          p99: 7000,
          sampleCount: 10,
        },
      };
      
      const comparison = compareBackendPerformance(mockComparison, realComparison);
      
      expect(comparison).toContain('Mock p95: 58.00ms');
      expect(comparison).toContain('Real p95: 6800.00ms');
      expect(comparison).toContain('Mock p99: 59.00ms');
      expect(comparison).toContain('Real p99: 6900.00ms');
    });
  });
});

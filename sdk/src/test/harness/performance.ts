/**
 * Performance Metrics Collection and Analysis
 * 
 * This module provides utilities for collecting, analyzing, and reporting
 * performance metrics from test executions. It calculates statistical measures
 * including p95 and p99 latencies, and compares performance between mock and
 * real backends.
 * 
 * **Validates: Requirements 2.3, 12.3, 12.5**
 * 
 * @module performance
 */

import type { PerformanceStats, BackendPerformanceComparison, TestResult } from './types';
import { ProvingBackend } from '../../backends';
import { NoirBackend } from '../../backends/noir';

/**
 * Calculates performance statistics from a set of measurements
 * 
 * **Validates: Requirement 2.3** - Calculate p95 and p99 latencies
 * 
 * @param measurements Array of time measurements in milliseconds
 * @returns Performance statistics including min, max, average, median, p95, p99
 */
export function calculatePerformanceStats(measurements: number[]): PerformanceStats {
  if (measurements.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      p95: 0,
      p99: 0,
      sampleCount: 0,
    };
  }

  // Sort measurements for percentile calculations
  const sorted = [...measurements].sort((a, b) => a - b);
  const count = sorted.length;

  // Calculate basic statistics
  const min = sorted[0];
  const max = sorted[count - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const average = sum / count;

  // Calculate percentiles
  const median = calculatePercentile(sorted, 50);
  const p95 = calculatePercentile(sorted, 95);
  const p99 = calculatePercentile(sorted, 99);

  return {
    min,
    max,
    average,
    median,
    p95,
    p99,
    sampleCount: count,
  };
}

/**
 * Calculates a specific percentile from sorted measurements
 * 
 * Uses linear interpolation between values when the percentile
 * falls between two measurements.
 * 
 * @param sortedMeasurements Sorted array of measurements
 * @param percentile Percentile to calculate (0-100)
 * @returns Percentile value
 */
function calculatePercentile(sortedMeasurements: number[], percentile: number): number {
  if (sortedMeasurements.length === 0) {
    return 0;
  }

  if (sortedMeasurements.length === 1) {
    return sortedMeasurements[0];
  }

  // Calculate the index for the percentile
  const index = (percentile / 100) * (sortedMeasurements.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  // If the index is an integer, return the value at that index
  if (lowerIndex === upperIndex) {
    return sortedMeasurements[lowerIndex];
  }

  // Otherwise, interpolate between the two nearest values
  const lowerValue = sortedMeasurements[lowerIndex];
  const upperValue = sortedMeasurements[upperIndex];
  const fraction = index - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * fraction;
}

/**
 * Determines the backend type from a ProvingBackend instance
 * 
 * @param backend Proving backend instance
 * @returns Backend type ('mock', 'real', or 'unknown')
 */
export function getBackendType(backend: ProvingBackend): 'mock' | 'real' | 'unknown' {
  // Check if it's a NoirBackend (real backend)
  if (backend instanceof NoirBackend) {
    return 'real';
  }

  // Check if it's a MockProvingBackend by checking for mock-specific properties
  // MockProvingBackend has a 'config' property with 'generateValidProofs'
  const backendAny = backend as any;
  if (backendAny.config && typeof backendAny.config.generateValidProofs === 'boolean') {
    return 'mock';
  }

  return 'unknown';
}

/**
 * Generates backend performance comparison from test results
 * 
 * **Validates: Requirement 12.3** - Compare mock vs real backend performance
 * 
 * @param results Test results to analyze
 * @param backend Proving backend used for tests
 * @returns Backend performance comparison
 */
export function generateBackendPerformanceComparison(
  results: TestResult[],
  backend: ProvingBackend
): BackendPerformanceComparison {
  const backendType = getBackendType(backend);

  // Extract timing measurements from results
  const proofGenerationTimes = results
    .map(r => r.metrics.proofGenerationTime)
    .filter(t => t > 0);

  const contractExecutionTimes = results
    .map(r => r.metrics.contractExecutionTime)
    .filter(t => t > 0);

  const totalExecutionTimes = results
    .map(r => r.metrics.totalTime)
    .filter(t => t > 0);

  return {
    backendType,
    proofGeneration: calculatePerformanceStats(proofGenerationTimes),
    contractExecution: calculatePerformanceStats(contractExecutionTimes),
    totalExecution: calculatePerformanceStats(totalExecutionTimes),
  };
}

/**
 * Formats a performance statistics object as a human-readable string
 * 
 * @param stats Performance statistics
 * @param label Label for the statistics (e.g., "Proof Generation")
 * @returns Formatted string
 */
export function formatPerformanceStats(stats: PerformanceStats, label: string): string {
  if (stats.sampleCount === 0) {
    return `${label}: No data`;
  }

  const lines = [
    `${label}:`,
    `  Samples: ${stats.sampleCount}`,
    `  Min: ${stats.min.toFixed(2)}ms`,
    `  Max: ${stats.max.toFixed(2)}ms`,
    `  Average: ${stats.average.toFixed(2)}ms`,
    `  Median (p50): ${stats.median.toFixed(2)}ms`,
    `  p95: ${stats.p95.toFixed(2)}ms`,
    `  p99: ${stats.p99.toFixed(2)}ms`,
  ];

  return lines.join('\n');
}

/**
 * Generates a comprehensive performance report
 * 
 * **Validates: Requirement 12.5** - Generate performance report
 * 
 * @param comparison Backend performance comparison
 * @returns Formatted performance report
 */
export function generatePerformanceReport(comparison: BackendPerformanceComparison): string {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '  PERFORMANCE REPORT',
    '═══════════════════════════════════════════════════════════',
    '',
    `Backend Type: ${comparison.backendType}`,
    '',
    formatPerformanceStats(comparison.proofGeneration, 'Proof Generation'),
    '',
    formatPerformanceStats(comparison.contractExecution, 'Contract Execution'),
    '',
    formatPerformanceStats(comparison.totalExecution, 'Total Execution'),
    '',
  ];

  // Add performance insights
  lines.push('Performance Insights:');

  // Proof generation insights
  if (comparison.proofGeneration.sampleCount > 0) {
    const avgProofTime = comparison.proofGeneration.average;
    const p99ProofTime = comparison.proofGeneration.p99;

    if (comparison.backendType === 'mock') {
      if (avgProofTime < 100) {
        lines.push('  ✓ Mock backend is performing well (< 100ms average)');
      } else {
        lines.push(`  ⚠ Mock backend is slower than expected (${avgProofTime.toFixed(0)}ms average)`);
      }
    } else if (comparison.backendType === 'real') {
      if (avgProofTime < 5000) {
        lines.push('  ✓ Real backend proof generation is fast (< 5s average)');
      } else if (avgProofTime < 30000) {
        lines.push(`  ⚠ Real backend proof generation is moderate (${(avgProofTime / 1000).toFixed(1)}s average)`);
      } else {
        lines.push(`  ⚠ Real backend proof generation is slow (${(avgProofTime / 1000).toFixed(1)}s average)`);
      }
    }

    // Check p99 latency
    if (p99ProofTime > avgProofTime * 2) {
      lines.push(`  ⚠ High p99 latency detected (${p99ProofTime.toFixed(0)}ms) - some proofs are taking much longer`);
    }
  }

  // Contract execution insights
  if (comparison.contractExecution.sampleCount > 0) {
    const avgContractTime = comparison.contractExecution.average;
    const p99ContractTime = comparison.contractExecution.p99;

    if (avgContractTime < 1000) {
      lines.push('  ✓ Contract execution is fast (< 1s average)');
    } else if (avgContractTime < 5000) {
      lines.push(`  ⚠ Contract execution is moderate (${(avgContractTime / 1000).toFixed(1)}s average)`);
    } else {
      lines.push(`  ⚠ Contract execution is slow (${(avgContractTime / 1000).toFixed(1)}s average)`);
    }

    // Check p99 latency
    if (p99ContractTime > avgContractTime * 2) {
      lines.push(`  ⚠ High p99 latency detected (${p99ContractTime.toFixed(0)}ms) - some executions are taking much longer`);
    }
  }

  // Overall performance
  if (comparison.totalExecution.sampleCount > 0) {
    const avgTotalTime = comparison.totalExecution.average;

    if (comparison.backendType === 'mock' && avgTotalTime < 5000) {
      lines.push('  ✓ Overall test execution is fast with mock backend (< 5s average)');
    } else if (comparison.backendType === 'real' && avgTotalTime < 60000) {
      lines.push('  ✓ Overall test execution is acceptable with real backend (< 60s average)');
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Compares performance between two backend types
 * 
 * **Validates: Requirement 12.3** - Compare mock vs real backend performance
 * 
 * @param mockComparison Performance comparison for mock backend
 * @param realComparison Performance comparison for real backend
 * @returns Formatted comparison report
 */
export function compareBackendPerformance(
  mockComparison: BackendPerformanceComparison,
  realComparison: BackendPerformanceComparison
): string {
  const lines = [
    '═══════════════════════════════════════════════════════════',
    '  BACKEND PERFORMANCE COMPARISON',
    '═══════════════════════════════════════════════════════════',
    '',
    'Mock Backend vs Real Backend',
    '',
  ];

  // Compare proof generation
  if (mockComparison.proofGeneration.sampleCount > 0 && realComparison.proofGeneration.sampleCount > 0) {
    const mockAvg = mockComparison.proofGeneration.average;
    const realAvg = realComparison.proofGeneration.average;
    const speedup = realAvg / mockAvg;

    lines.push('Proof Generation:');
    lines.push(`  Mock Average: ${mockAvg.toFixed(2)}ms`);
    lines.push(`  Real Average: ${realAvg.toFixed(2)}ms`);
    lines.push(`  Speedup: ${speedup.toFixed(1)}x faster with mock backend`);
    lines.push('');

    lines.push(`  Mock p95: ${mockComparison.proofGeneration.p95.toFixed(2)}ms`);
    lines.push(`  Real p95: ${realComparison.proofGeneration.p95.toFixed(2)}ms`);
    lines.push('');

    lines.push(`  Mock p99: ${mockComparison.proofGeneration.p99.toFixed(2)}ms`);
    lines.push(`  Real p99: ${realComparison.proofGeneration.p99.toFixed(2)}ms`);
    lines.push('');
  }

  // Compare contract execution
  if (mockComparison.contractExecution.sampleCount > 0 && realComparison.contractExecution.sampleCount > 0) {
    const mockAvg = mockComparison.contractExecution.average;
    const realAvg = realComparison.contractExecution.average;
    const difference = realAvg - mockAvg;

    lines.push('Contract Execution:');
    lines.push(`  Mock Average: ${mockAvg.toFixed(2)}ms`);
    lines.push(`  Real Average: ${realAvg.toFixed(2)}ms`);
    lines.push(`  Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}ms`);
    lines.push('');

    lines.push(`  Mock p95: ${mockComparison.contractExecution.p95.toFixed(2)}ms`);
    lines.push(`  Real p95: ${realComparison.contractExecution.p95.toFixed(2)}ms`);
    lines.push('');

    lines.push(`  Mock p99: ${mockComparison.contractExecution.p99.toFixed(2)}ms`);
    lines.push(`  Real p99: ${realComparison.contractExecution.p99.toFixed(2)}ms`);
    lines.push('');
  }

  // Compare total execution
  if (mockComparison.totalExecution.sampleCount > 0 && realComparison.totalExecution.sampleCount > 0) {
    const mockAvg = mockComparison.totalExecution.average;
    const realAvg = realComparison.totalExecution.average;
    const speedup = realAvg / mockAvg;

    lines.push('Total Execution:');
    lines.push(`  Mock Average: ${mockAvg.toFixed(2)}ms`);
    lines.push(`  Real Average: ${realAvg.toFixed(2)}ms`);
    lines.push(`  Speedup: ${speedup.toFixed(1)}x faster with mock backend`);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

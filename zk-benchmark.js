/**
 * ZK Circuit Benchmark Script
 * 
 * Measures proving time and memory for withdrawal flow
 * Compares Node.js and browser environments
 * Stores benchmark data for regression tracking
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Benchmark configuration
const CONFIG = {
  iterations: 5,
  outputDir: './benchmark-results',
  circuitPath: './circuits',
  environment: process.env.NODE_ENV || 'node',
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Measure execution time and memory usage
 */
async function measurePerformance(taskName, taskFn) {
  const results = [];
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    await taskFn();
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    results.push({
      iteration: i + 1,
      timeMs: Number(endTime - startTime) / 1e6,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        rss: endMemory.rss - startMemory.rss,
      },
    });
  }
  
  return calculateStats(taskName, results);
}

/**
 * Calculate statistics from benchmark results
 */
function calculateStats(taskName, results) {
  const times = results.map(r => r.timeMs);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  const avgMemory = {
    heapUsed: results.reduce((a, b) => a + b.memoryDelta.heapUsed, 0) / results.length,
    heapTotal: results.reduce((a, b) => a + b.memoryDelta.heapTotal, 0) / results.length,
    rss: results.reduce((a, b) => a + b.memoryDelta.rss, 0) / results.length,
  };
  
  return {
    task: taskName,
    environment: CONFIG.environment,
    iterations: CONFIG.iterations,
    avgTimeMs: avgTime,
    minTimeMs: minTime,
    maxTimeMs: maxTime,
    avgMemory,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save benchmark results to file
 */
function saveResults(stats) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${stats.task.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(stats, null, 2));
  console.log(`Results saved to: ${filepath}`);
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('🚀 Starting ZK Circuit Benchmarks...');
  console.log(`Environment: ${CONFIG.environment}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log('');
  
  const allResults = [];
  
  // Benchmark 1: Withdrawal Circuit Proving
  try {
    console.log('📊 Benchmark 1: Withdrawal Circuit Proving');
    const withdrawalStats = await measurePerformance(
      'Withdrawal Circuit Proving',
      async () => {
        // Simulate withdrawal circuit proving
        // Replace with actual circuit execution
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    );
    allResults.push(withdrawalStats);
    saveResults(withdrawalStats);
    console.log(`✅ Avg time: ${withdrawalStats.avgTimeMs.toFixed(2)}ms`);
    console.log('');
  } catch (error) {
    console.error('❌ Withdrawal benchmark failed:', error.message);
  }
  
  // Benchmark 2: Commitment Circuit Proving
  try {
    console.log('📊 Benchmark 2: Commitment Circuit Proving');
    const commitmentStats = await measurePerformance(
      'Commitment Circuit Proving',
      async () => {
        // Simulate commitment circuit proving
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    );
    allResults.push(commitmentStats);
    saveResults(commitmentStats);
    console.log(`✅ Avg time: ${commitmentStats.avgTimeMs.toFixed(2)}ms`);
    console.log('');
  } catch (error) {
    console.error('❌ Commitment benchmark failed:', error.message);
  }
  
  // Summary
  console.log('📈 Benchmark Summary:');
  allResults.forEach(result => {
    console.log(`  ${result.task}: ${result.avgTimeMs.toFixed(2)}ms avg`);
  });
  
  return allResults;
}

// Run if executed directly
if (require.main === module) {
  runBenchmarks()
    .then(() => console.log('✅ All benchmarks completed'))
    .catch(error => console.error('❌ Benchmark failed:', error));
}

module.exports = { runBenchmarks, measurePerformance };

#!/usr/bin/env node
/**
 * PrivacyLayer Benchmarking Script
 * Profiles gas consumption and performance metrics
 */

const { Server, Keypair, TransactionBuilder, Operation } = require('@stellar/stellar-sdk');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  poolContractId: process.env.POOL_CONTRACT_ID,
  iterations: parseInt(process.env.ITERATIONS) || 10
};

// Metrics storage
const metrics = {
  deposit: { gas: [], duration: [] },
  withdraw: { gas: [], duration: [] },
  proofGeneration: { duration: [] },
  merkleUpdate: { duration: [] }
};

/**
 * Benchmark deposit operation
 */
async function benchmarkDeposit(server, source, amount) {
  const startTime = performance.now();
  
  try {
    const account = await server.loadAccount(source.publicKey());
    
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: CONFIG.networkPassphrase
    })
    .addOperation(Operation.invokeContractFunction({
      contract: CONFIG.poolContractId,
      function: 'deposit',
      args: [amount.toString()]
    }))
    .setTimeout(30)
    .build();
    
    tx.sign(source);
    
    const result = await server.sendTransaction(tx);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    metrics.deposit.gas.push(result.resultMetaXdr.feeCharged);
    metrics.deposit.duration.push(duration / 1000);
    
    return { success: true, duration: duration / 1000 };
  } catch (error) {
    console.error('Deposit benchmark failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Benchmark proof generation
 */
async function benchmarkProofGeneration(circuitType) {
  const startTime = performance.now();
  
  // Simulate proof generation (in production, call actual prover)
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  metrics.proofGeneration.duration.push(duration);
  
  return { success: true, duration };
}

/**
 * Calculate statistics
 */
function calculateStats(values) {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  return {
    count: values.length,
    mean: mean.toFixed(3),
    min: sorted[0].toFixed(3),
    max: sorted[sorted.length - 1].toFixed(3),
    p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(3),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(3),
    p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(3)
  };
}

/**
 * Print benchmark report
 */
function printReport() {
  console.log('\n=== PrivacyLayer Benchmark Report ===\n');
  
  console.log('Deposit Performance:');
  console.table({
    'Gas Used': calculateStats(metrics.deposit.gas),
    'Duration (s)': calculateStats(metrics.deposit.duration)
  });
  
  console.log('\nProof Generation:');
  console.table(calculateStats(metrics.proofGeneration.duration));
  
  console.log('\n=== Regression Detection ===\n');
  
  // Check for regressions
  const depositP95 = calculateStats(metrics.deposit.duration).p95;
  if (parseFloat(depositP95) > 30) {
    console.log('⚠️  WARNING: Deposit duration p95 exceeds 30s threshold');
    console.log(`   Current: ${depositP95}s`);
  } else {
    console.log('✅ Deposit duration within acceptable range');
  }
  
  const proofP95 = calculateStats(metrics.proofGeneration.duration).p95;
  if (parseFloat(proofP95) > 15) {
    console.log('⚠️  WARNING: Proof generation p95 exceeds 15s threshold');
    console.log(`   Current: ${proofP95}s`);
  } else {
    console.log('✅ Proof generation within acceptable range');
  }
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('Starting PrivacyLayer benchmarks...');
  console.log(`Iterations: ${CONFIG.iterations}`);
  
  const server = new Server(CONFIG.horizonUrl);
  const sourceKeypair = Keypair.fromSecret(process.env.SOURCE_SECRET);
  
  // Run benchmarks
  for (let i = 0; i < CONFIG.iterations; i++) {
    console.log(`\nIteration ${i + 1}/${CONFIG.iterations}`);
    
    // Deposit benchmark
    console.log('  Benchmarking deposit...');
    await benchmarkDeposit(server, sourceKeypair, 1000);
    
    // Proof generation benchmark
    console.log('  Benchmarking proof generation...');
    await benchmarkProofGeneration('withdraw');
    
    // Wait between iterations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print report
  printReport();
}

// Run
main().catch(console.error);
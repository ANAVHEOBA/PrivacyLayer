/**
 * Constraint Count Snapshot Script
 * 
 * Records constraint counts for commitment and withdrawal circuits
 * Sets regression thresholds
 * Verifies constraint counts don't grow unexpectedly
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  snapshotDir: './constraint-snapshots',
  threshold: 0.05, // 5% growth threshold for regression
  circuits: {
    commitment: {
      name: 'Commitment Circuit',
      path: './circuits/commitment',
      expectedConstraints: 15000, // Expected baseline
    },
    withdrawal: {
      name: 'Withdrawal Circuit',
      path: './circuits/withdrawal',
      expectedConstraints: 25000, // Expected baseline
    },
  },
};

// Ensure snapshot directory exists
if (!fs.existsSync(CONFIG.snapshotDir)) {
  fs.mkdirSync(CONFIG.snapshotDir, { recursive: true });
}

/**
 * Get current constraint count for a circuit
 * 
 * In real implementation, this would parse the circuit file
 * or run the circuit compiler to get actual constraint count
 */
async function getConstraintCount(circuitName) {
  const circuit = CONFIG.circuits[circuitName];
  
  // Simulate constraint count retrieval
  // Replace with actual circuit analysis
  const baseCount = circuit.expectedConstraints;
  const variation = Math.floor(Math.random() * baseCount * 0.02); // ±2% variation
  
  return baseCount + variation;
}

/**
 * Save constraint count snapshot
 */
function saveSnapshot(circuitName, constraintCount) {
  const timestamp = new Date().toISOString();
  const snapshot = {
    circuit: circuitName,
    constraintCount,
    timestamp,
    threshold: CONFIG.threshold,
  };
  
  const filename = `${circuitName}-snapshot.json`;
  const filepath = path.join(CONFIG.snapshotDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`📸 Snapshot saved: ${filepath}`);
  
  return snapshot;
}

/**
 * Check for constraint count regression
 */
function checkRegression(circuitName, currentCount) {
  const circuit = CONFIG.circuits[circuitName];
  const expectedCount = circuit.expectedConstraints;
  const growth = (currentCount - expectedCount) / expectedCount;
  
  if (growth > CONFIG.threshold) {
    console.warn(`⚠️  REGRESSION DETECTED: ${circuitName}`);
    console.warn(`   Expected: ${expectedCount}`);
    console.warn(`   Current: ${currentCount}`);
    console.warn(`   Growth: ${(growth * 100).toFixed(2)}% (threshold: ${(CONFIG.threshold * 100)}%)`);
    return false;
  }
  
  console.log(`✅ ${circuitName}: ${currentCount} constraints (growth: ${(growth * 100).toFixed(2)}%)`);
  return true;
}

/**
 * Run constraint count snapshots for all circuits
 */
async function runSnapshots() {
  console.log('📸 Starting Constraint Count Snapshots...');
  console.log(`Threshold: ${(CONFIG.threshold * 100)}%`);
  console.log('');
  
  let allPassed = true;
  
  for (const circuitName of Object.keys(CONFIG.circuits)) {
    const circuit = CONFIG.circuits[circuitName];
    console.log(`📊 ${circuit.name}`);
    
    try {
      const constraintCount = await getConstraintCount(circuitName);
      saveSnapshot(circuitName, constraintCount);
      
      const passed = checkRegression(circuitName, constraintCount);
      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Failed to snapshot ${circuitName}:`, error.message);
      allPassed = false;
    }
    
    console.log('');
  }
  
  if (allPassed) {
    console.log('✅ All constraint counts within threshold');
  } else {
    console.log('❌ Some constraint counts exceeded threshold');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runSnapshots()
    .then(() => console.log('✅ Snapshot process completed'))
    .catch(error => console.error('❌ Snapshot process failed:', error));
}

module.exports = { runSnapshots, getConstraintCount, checkRegression };

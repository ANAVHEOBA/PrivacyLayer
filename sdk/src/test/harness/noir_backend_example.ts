/**
 * Example: Using NoirBackend with the Withdraw Harness
 * 
 * This example demonstrates how to configure and use the NoirBackend
 * (Barretenberg) with the Contract-Facing Withdraw Proof Harness.
 * 
 * **Note**: This is an example file and not meant to be run directly.
 * It shows the API usage for integrating NoirBackend with the harness.
 */

import { WithdrawHarness, loadArtifactsFromManifest } from './index';
import { NoirBackend } from '../../backends/noir';

/**
 * Example 1: Basic NoirBackend Setup
 * 
 * This example shows how to load artifacts from the manifest and
 * create a NoirBackend instance with integrity validation.
 */
async function example1_basicSetup() {
  console.log('=== Example 1: Basic NoirBackend Setup ===\n');
  
  // Step 1: Load artifacts from manifest with integrity validation
  const { artifacts, manifest, manifestEntry } = await loadArtifactsFromManifest({
    manifestPath: './artifacts/zk/manifest.json',
    circuitName: 'withdraw',
    validateIntegrity: true, // Validates hashes against manifest
  });
  
  console.log('✓ Loaded circuit:', manifestEntry.name);
  console.log('✓ Schema version:', manifestEntry.schema_version);
  console.log('✓ Bytecode hash:', manifestEntry.bytecode_sha256);
  console.log('✓ ABI hash:', manifestEntry.abi_sha256);
  
  // Step 2: Create NoirBackend with loaded artifacts
  const noirBackend = new NoirBackend({
    artifacts: {
      acir: artifacts.acir,
      bytecode: artifacts.bytecode,
      vkey: artifacts.vkey,
      abi: artifacts.abi,
      name: artifacts.name,
    },
    manifest,
    circuitName: 'withdraw',
  });
  
  console.log('✓ NoirBackend initialized\n');
  
  return { noirBackend, artifacts, manifest };
}

/**
 * Example 2: Configure Harness with NoirBackend
 * 
 * This example shows how to configure the harness with NoirBackend
 * for real proof generation.
 */
async function example2_configureHarness() {
  console.log('=== Example 2: Configure Harness with NoirBackend ===\n');
  
  // Load artifacts and create backend
  const { noirBackend, artifacts, manifest } = await example1_basicSetup();
  
  // Create mock contract client (TODO: implement real client)
  const mockContractClient = {
    // Placeholder for contract client interface
  };
  
  // Configure harness with NoirBackend
  const harness = new WithdrawHarness({
    // Use NoirBackend for real proof generation
    provingBackend: noirBackend,
    
    // Circuit artifacts (already loaded and validated)
    circuitArtifacts: artifacts,
    
    // Include manifest for automatic validation
    manifest,
    circuitName: 'withdraw',
    
    // Contract client (TODO: implement)
    contractClient: mockContractClient,
    
    // Pool configuration
    poolConfig: {
      poolId: 'test-pool-001',
      denomination: 100_000_000n, // 100 XLM
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      treeDepth: 20,
    },
    
    // Test configuration
    testConfig: {
      timeout: 60000, // 60 seconds for real proofs
      verbose: true,
      skipCleanup: false,
    },
  });
  
  console.log('✓ Harness configured with NoirBackend');
  console.log('✓ Artifact integrity validated automatically\n');
  
  return harness;
}

/**
 * Example 3: Run Tests with Real Proofs
 * 
 * This example shows how to run the harness tests with real
 * Barretenberg proof generation.
 */
async function example3_runTests() {
  console.log('=== Example 3: Run Tests with Real Proofs ===\n');
  
  // Configure harness
  const harness = await example2_configureHarness();
  
  // Setup pool
  console.log('Setting up test pool...');
  await harness.setupPool();
  console.log('✓ Pool setup complete\n');
  
  // Run happy path test with real proof
  console.log('Running happy path test...');
  const happyPathResult = await harness.runHappyPath();
  console.log('✓ Happy path test:', happyPathResult.passed ? 'PASSED' : 'FAILED');
  console.log('  - Proof generation time:', happyPathResult.metrics.proofGenerationTime, 'ms');
  console.log('  - Contract execution time:', happyPathResult.metrics.contractExecutionTime, 'ms');
  console.log('  - Total time:', happyPathResult.metrics.totalTime, 'ms\n');
  
  // Run proof failure test
  console.log('Running proof failure test...');
  const proofFailureResult = await harness.runProofFailure();
  console.log('✓ Proof failure test:', proofFailureResult.passed ? 'PASSED' : 'FAILED');
  console.log('  - Error category:', proofFailureResult.errorClassification?.category);
  console.log('  - Actionable message:', proofFailureResult.errorClassification?.actionableMessage, '\n');
  
  // Cleanup
  console.log('Cleaning up...');
  await harness.cleanupPool();
  console.log('✓ Cleanup complete\n');
  
  // Generate summary
  const summary = harness.generateTestSummary();
  console.log('=== Test Summary ===');
  console.log('Total tests:', summary.totalTests);
  console.log('Passed:', summary.passed);
  console.log('Failed:', summary.failed);
  console.log('Average proof time:', summary.averageProofGenerationTime, 'ms');
  console.log('Average contract time:', summary.averageContractExecutionTime, 'ms');
}

/**
 * Example 4: Environment-Based Backend Selection
 * 
 * This example shows how to switch between mock and real backends
 * based on environment variables.
 */
async function example4_environmentBasedBackend() {
  console.log('=== Example 4: Environment-Based Backend Selection ===\n');
  
  const backendType = process.env.BACKEND_TYPE || 'mock';
  console.log('Backend type:', backendType);
  
  let backend;
  let artifacts;
  let manifest;
  
  if (backendType === 'real') {
    // Load artifacts and create NoirBackend
    const result = await loadArtifactsFromManifest({
      manifestPath: process.env.MANIFEST_PATH || './artifacts/zk/manifest.json',
      circuitName: 'withdraw',
      validateIntegrity: true,
    });
    
    artifacts = result.artifacts;
    manifest = result.manifest;
    
    backend = new NoirBackend({
      artifacts: {
        acir: artifacts.acir,
        bytecode: artifacts.bytecode,
        vkey: artifacts.vkey,
        abi: artifacts.abi,
        name: artifacts.name,
      },
      manifest,
      circuitName: 'withdraw',
    });
    
    console.log('✓ Using NoirBackend (real proofs)');
  } else {
    // Use mock backend for fast testing
    const { MockProvingBackend } = await import('./mock_backend');
    backend = new MockProvingBackend({
      generateValidProofs: true,
    });
    
    // Create placeholder artifacts for mock backend
    artifacts = {
      acir: Buffer.alloc(0),
      vkey: Buffer.alloc(0),
      abi: {},
    };
    
    console.log('✓ Using MockProvingBackend (fast testing)');
  }
  
  console.log('✓ Backend initialized\n');
  
  return { backend, artifacts, manifest };
}

/**
 * Example 5: Manual Artifact Validation
 * 
 * This example shows how to manually validate artifact integrity
 * without loading from the manifest.
 */
async function example5_manualValidation() {
  console.log('=== Example 5: Manual Artifact Validation ===\n');
  
  const { loadManifest, validateArtifactIntegrity } = await import('./artifacts');
  
  // Load manifest
  const manifest = await loadManifest('./artifacts/zk/manifest.json');
  console.log('✓ Manifest loaded');
  
  // Load artifacts (from some source)
  const artifacts = {
    acir: Buffer.alloc(0), // Placeholder
    vkey: Buffer.alloc(0), // Placeholder
    abi: {},
    bytecode: 'placeholder',
    name: 'withdraw',
  };
  
  // Manually validate integrity
  try {
    validateArtifactIntegrity(manifest, 'withdraw', artifacts);
    console.log('✓ Artifact integrity validated');
  } catch (error) {
    console.error('✗ Artifact integrity validation failed:', error);
  }
}

/**
 * Main function to run all examples
 * 
 * **Note**: This is for demonstration purposes only.
 * In practice, you would run these examples individually.
 */
async function main() {
  console.log('NoirBackend Integration Examples\n');
  console.log('='.repeat(50), '\n');
  
  try {
    // Run examples
    await example1_basicSetup();
    await example2_configureHarness();
    // await example3_runTests(); // Uncomment to run full test suite
    await example4_environmentBasedBackend();
    await example5_manualValidation();
    
    console.log('\n', '='.repeat(50));
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Export examples for use in other modules
export {
  example1_basicSetup,
  example2_configureHarness,
  example3_runTests,
  example4_environmentBasedBackend,
  example5_manualValidation,
};

// Run main if executed directly
if (require.main === module) {
  main().catch(console.error);
}

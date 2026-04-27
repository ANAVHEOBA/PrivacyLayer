/**
 * Capability Integration Verification
 * 
 * This script demonstrates the capability negotiation API
 * and verifies it works correctly in the current runtime.
 */

const {
  detectCapabilities,
  detectRuntimeType,
  isCapabilitySupported,
  assertCapability,
  UnsupportedRuntimeError,
  canGenerateWithdrawalProof,
  getWithdrawalCapabilities,
} = require('./dist/index');

console.log('=== Runtime Capability Detection ===\n');

// 1. Detect runtime type
const runtimeType = detectRuntimeType();
console.log('✓ Detected runtime:', runtimeType);

// 2. Get full capability set
const capabilities = detectCapabilities();
console.log('\n✓ Full capabilities:');
console.log('  - Can prove:', capabilities.canProve);
console.log('  - Can verify:', capabilities.canVerify);
console.log('  - Can format witness:', capabilities.canFormatWitness);
console.log('  - Has secure randomness:', capabilities.hasSecureRandomness);
console.log('  - Can load artifacts from filesystem:', capabilities.canLoadArtifactsFromFilesystem);
console.log('  - Limitations:', capabilities.limitations.length > 0 ? capabilities.limitations.join(', ') : 'None');

// 3. Check individual capabilities
console.log('\n✓ Individual capability checks:');
const checks = ['prove', 'verify', 'format-witness', 'load-artifacts', 'secure-randomness'];
checks.forEach(check => {
  const supported = isCapabilitySupported(check);
  console.log('  - ' + check + ':', supported ? 'SUPPORTED' : 'NOT SUPPORTED');
});

// 4. Test assertion (should not throw in Node.js)
console.log('\n✓ Testing capability assertions:');
try {
  assertCapability('format-witness');
  console.log('  - format-witness assertion: PASSED');
} catch (e) {
  console.log('  - format-witness assertion: FAILED -', e.message);
}

try {
  assertCapability('prove');
  console.log('  - prove assertion: PASSED');
} catch (e) {
  if (e instanceof UnsupportedRuntimeError) {
    console.log('  - prove assertion: EXPECTED FAILURE -', e.message);
    console.log('    Suggestion:', e.suggestion || 'N/A');
  } else {
    console.log('  - prove assertion: UNEXPECTED ERROR -', e.message);
  }
}

// 5. Withdrawal-specific capabilities
console.log('\n✓ Withdrawal capabilities:');
console.log('  - Can generate withdrawal proof:', canGenerateWithdrawalProof());
const withdrawalCaps = getWithdrawalCapabilities();
console.log('  - Withdrawal runtime:', withdrawalCaps.runtimeType);
console.log('  - Withdrawal can prove:', withdrawalCaps.canProve);

console.log('\n=== All capability checks completed successfully ===');

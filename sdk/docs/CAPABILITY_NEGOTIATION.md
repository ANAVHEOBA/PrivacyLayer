# Runtime Capability Negotiation

## Overview

The PrivacyLayer SDK now provides explicit runtime capability detection, allowing consumers to know whether the runtime can prove, verify, or only format witnesses before starting a ZK flow. This prevents deep runtime failures and provides actionable diagnostics.

## Quick Start

```typescript
import { 
  detectCapabilities, 
  isCapabilitySupported, 
  assertCapability,
  UnsupportedRuntimeError 
} from '@privacylayer/sdk';

// Check if proof generation is supported
if (isCapabilitySupported('prove')) {
  console.log('✓ Can generate proofs');
} else {
  console.log('✗ Proof generation not supported');
}

// Get full capability report
const caps = detectCapabilities();
console.log('Runtime:', caps.runtimeType);
console.log('Can prove:', caps.canProve);
console.log('Can verify:', caps.canVerify);
console.log('Limitations:', caps.limitations);
```

## Capability Model

### ZkCapabilities Interface

```typescript
interface ZkCapabilities {
  canProve: boolean;                    // Can generate ZK proofs
  canVerify: boolean;                   // Can verify ZK proofs
  canFormatWitness: boolean;            // Can prepare/format witnesses
  hasSecureRandomness: boolean;         // Has crypto.getRandomValues
  canLoadArtifactsFromFilesystem: boolean;  // Can load from disk (Node.js)
  runtimeType: RuntimeType;             // Detected runtime
  limitations: string[];                // Explanation of any limitations
}
```

### Runtime Types

- `node` - Node.js with full capabilities
- `browser` - Browser with WebCrypto
- `worker` - Web Worker / Service Worker
- `deno` - Deno runtime
- `bun` - Bun runtime
- `witness-only` - Can only format witnesses (no WASM proving)
- `unknown` - Unrecognized runtime

### Capability Checks

```typescript
type CapabilityCheck =
  | 'prove'               // Full proof generation
  | 'verify'              // Proof verification
  | 'format-witness'      // Witness preparation only
  | 'load-artifacts'      // File system artifact loading
  | 'secure-randomness';  // Cryptographic randomness
```

## API Reference

### Detection Functions

#### `detectCapabilities(): ZkCapabilities`

Returns the full capability set for the current runtime.

```typescript
const caps = detectCapabilities();
if (!caps.canProve) {
  console.log('Proof generation not supported:', caps.limitations);
}
```

#### `detectRuntimeType(): RuntimeType`

Detects the current runtime environment.

```typescript
const runtime = detectRuntimeType();
// 'node', 'browser', 'worker', 'deno', 'bun', etc.
```

#### `isCapabilitySupported(capability: CapabilityCheck): boolean`

Checks if a specific capability is supported without throwing.

```typescript
if (isCapabilitySupported('prove')) {
  // Safe to generate proofs
}
```

#### `assertCapability(capability: CapabilityCheck): void`

Asserts that a capability is supported, throwing `UnsupportedRuntimeError` if not.

```typescript
try {
  assertCapability('prove');
  // Proceed with proof generation
} catch (error) {
  if (error instanceof UnsupportedRuntimeError) {
    console.error('Runtime not supported:', error.message);
    console.error('Suggestion:', error.suggestion);
  }
}
```

### Helper Functions

#### `hasSecureRandomness(): boolean`

Checks if cryptographically secure randomness is available.

#### `canLoadArtifactsFromFilesystem(): boolean`

Checks if the runtime can load circuit artifacts from the filesystem.

#### `canSupportWasmProving(): boolean`

Checks if the runtime supports WASM-based proving.

### Backend Integration

#### NoirBackend with Capability Checks

```typescript
import { NoirBackend, detectCapabilities } from '@privacylayer/sdk';

// Backend automatically checks capabilities on initialization
const backend = new NoirBackend({
  artifacts: myArtifacts,
  // skipCapabilityCheck: false  // default
});

// Query backend capabilities
const caps = backend.getCapabilities();
console.log('Backend runtime:', caps.runtimeType);
```

#### Skip Capability Check (Advanced)

```typescript
// Defer capability validation if needed
const backend = new NoirBackend({
  artifacts: myArtifacts,
  skipCapabilityCheck: true
});

// Check capabilities manually later
const caps = backend.getCapabilities();
```

### Withdrawal Integration

```typescript
import { 
  canGenerateWithdrawalProof, 
  getWithdrawalCapabilities,
  generateWithdrawalProof 
} from '@privacylayer/sdk';

// Check before attempting proof generation
if (!canGenerateWithdrawalProof()) {
  const caps = getWithdrawalCapabilities();
  console.error('Cannot generate proofs:', caps.limitations);
  // Fallback to server-side proving
}

// Or let it fail fast with actionable error
try {
  const proof = await generateWithdrawalProof(request, backend);
} catch (error) {
  if (error instanceof UnsupportedRuntimeError) {
    // Handle unsupported runtime gracefully
  }
}
```

## Error Handling

### UnsupportedRuntimeError

Thrown when a requested ZK operation is not supported in the current runtime.

```typescript
class UnsupportedRuntimeError extends Error {
  capability: CapabilityCheck;      // Which capability failed
  runtimeType: RuntimeType;          // Current runtime
  suggestion?: string;               // Actionable guidance
}
```

#### Example

```typescript
try {
  assertCapability('prove');
} catch (error) {
  if (error instanceof UnsupportedRuntimeError) {
    console.error(`Proof generation not supported in ${error.runtimeType}`);
    console.error('Reason:', error.message);
    if (error.suggestion) {
      console.error('Try:', error.suggestion);
    }
  }
}
```

## Use Cases

### 1. Environment Detection on Startup

```typescript
import { detectCapabilities } from '@privacylayer/sdk';

function checkEnvironment() {
  const caps = detectCapabilities();
  
  if (!caps.canProve) {
    console.warn('Client-side proving not available:', caps.limitations);
    // Enable server-side proving mode
    enableServerProving();
  }
  
  return caps;
}
```

### 2. Graceful Degradation

```typescript
import { isCapabilitySupported, generateWithdrawalProof } from '@privacylayer/sdk';

async function withdraw(request, backend) {
  if (!isCapabilitySupported('prove')) {
    // Fallback to server-side proving
    return await serverSideProve(request);
  }
  
  // Client-side proving is available
  return await generateWithdrawalProof(request, backend);
}
```

### 3. Pre-Flight Validation

```typescript
import { assertCapability, UnsupportedRuntimeError } from '@privacylayer/sdk';

function validateEnvironment() {
  try {
    assertCapability('prove');
    assertCapability('secure-randomness');
    return { valid: true };
  } catch (error) {
    if (error instanceof UnsupportedRuntimeError) {
      return {
        valid: false,
        error: error.message,
        suggestion: error.suggestion
      };
    }
    throw error;
  }
}
```

### 4. Browser vs Node.js Handling

```typescript
import { detectRuntimeType, canLoadArtifactsFromFilesystem } from '@privacylayer/sdk';

async function loadArtifacts(circuitName: string) {
  const runtime = detectRuntimeType();
  
  if (canLoadArtifactsFromFilesystem()) {
    // Node.js - load from filesystem
    return await loadFromDisk(circuitName);
  } else {
    // Browser - fetch via HTTP
    return await fetchArtifacts(circuitName);
  }
}
```

## Testing

The SDK includes comprehensive tests for capability detection:

```bash
npm test -- capabilities.test.ts
```

Tests cover:
- Runtime type detection
- Capability flag validation
- Error handling
- SDK exports
- Withdrawal integration
- Edge cases

## Migration Guide

### Before (Implicit Failures)

```typescript
// Would fail deep in the stack with cryptic errors
const backend = new NoirBackend({ artifacts });
const proof = await backend.generateProof(witness);
// Error: "Barretenberg backend not initialized..."
```

### After (Explicit Detection)

```typescript
import { assertCapability, UnsupportedRuntimeError } from '@privacylayer/sdk';

try {
  assertCapability('prove');
  const backend = new NoirBackend({ artifacts });
  const proof = await backend.generateProof(witness);
} catch (error) {
  if (error instanceof UnsupportedRuntimeError) {
    // Clear, actionable error message
    console.error('Cannot prove:', error.message);
    console.error('Suggestion:', error.suggestion);
  }
}
```

## Best Practices

1. **Check Early**: Call `detectCapabilities()` or `assertCapability()` at app startup
2. **Graceful Degradation**: Use `isCapabilitySupported()` to enable fallbacks
3. **User Feedback**: Show `UnsupportedRuntimeError.suggestion` to users
4. **Backend Config**: Use `skipCapabilityCheck: true` only when deferring validation
5. **Testing**: Test your app in different runtime modes (Node, browser, worker)

## Acceptance Criteria

✅ Integrations can tell whether proof generation is supported before invoking it  
✅ Unsupported environments fail with actionable errors instead of deep stack traces  
✅ Capability detection is covered by tests for common runtime modes  
✅ All capability APIs are exported from the main SDK entry point  
✅ NoirBackend integrates capability checks on initialization  
✅ Withdrawal flow fails fast with clear diagnostics  

## Related

- [sdk/src/capabilities.ts](../src/capabilities.ts) - Core implementation
- [sdk/test/capabilities.test.ts](../test/capabilities.test.ts) - Test suite
- [sdk/src/backends/noir.ts](../src/backends/noir.ts) - Backend integration
- [sdk/src/withdraw.ts](../src/withdraw.ts) - Withdrawal integration

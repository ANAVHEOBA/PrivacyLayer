/**
 * Runtime Capability Negotiation
 *
 * Provides explicit capability detection for ZK operations across different
 * runtime environments (Node.js, browser, Web Workers, witness-only).
 *
 * Consumers can query capabilities before starting a ZK flow to avoid deep
 * runtime failures with actionable diagnostics.
 */

// ---------------------------------------------------------------------------
// Capability Model
// ---------------------------------------------------------------------------

/**
 * ZK capability flags that a runtime may support.
 */
export interface ZkCapabilities {
  /** Whether the runtime can generate ZK proofs (requires WASM + crypto) */
  canProve: boolean;

  /** Whether the runtime can verify ZK proofs off-chain */
  canVerify: boolean;

  /** Whether the runtime can prepare/format witnesses without proving */
  canFormatWitness: boolean;

  /** Whether the runtime has access to secure randomness (crypto.getRandomValues) */
  hasSecureRandomness: boolean;

  /** Whether the runtime can load circuit artifacts from filesystem (Node.js only) */
  canLoadArtifactsFromFilesystem: boolean;

  /** The detected runtime environment type */
  runtimeType: RuntimeType;

  /** Detailed explanation of any capability limitations */
  limitations: string[];
}

/**
 * Supported runtime environment types.
 */
export type RuntimeType =
  | 'node'               // Node.js with full capabilities
  | 'browser'            // Browser with WebCrypto
  | 'worker'             // Web Worker / Service Worker
  | 'deno'               // Deno runtime
  | 'bun'                // Bun runtime
  | 'witness-only'       // Runtime that can only format witnesses (no WASM proving)
  | 'unknown';           // Unrecognized runtime

/**
 * Fine-grained capability check for specific operations.
 */
export type CapabilityCheck =
  | 'prove'               // Full proof generation
  | 'verify'              // Proof verification
  | 'format-witness'      // Witness preparation only
  | 'load-artifacts'      // File system artifact loading
  | 'secure-randomness';  // Cryptographic randomness

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/**
 * Thrown when a requested ZK operation is not supported in the current runtime.
 *
 * Provides actionable guidance instead of deep stack traces.
 */
export class UnsupportedRuntimeError extends Error {
  constructor(
    message: string,
    public readonly capability: CapabilityCheck,
    public readonly runtimeType: RuntimeType,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'UnsupportedRuntimeError';
  }
}

// ---------------------------------------------------------------------------
// Runtime Detection
// ---------------------------------------------------------------------------

/**
 * Detects the current runtime environment.
 */
export function detectRuntimeType(): RuntimeType {
  // Detect Deno first (has globalThis.Deno)
  if (typeof globalThis !== 'undefined' && 'Deno' in globalThis) {
    return 'deno';
  }

  // Detect Bun (has globalThis.Bun)
  if (typeof globalThis !== 'undefined' && 'Bun' in globalThis) {
    return 'bun';
  }

  // Detect Node.js (has process and process.versions.node)
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }

  // Detect Web Workers (has self and importScripts, but not window)
  if (
    typeof self !== 'undefined' &&
    typeof importScripts === 'function' &&
    typeof window === 'undefined'
  ) {
    return 'worker';
  }

  // Detect Browser (has window and crypto)
  if (typeof window !== 'undefined' && typeof window.crypto !== 'undefined') {
    return 'browser';
  }

  // Fallback: check for any crypto-like object
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    typeof (globalThis as any).crypto?.getRandomValues === 'function'
  ) {
    return 'browser'; // Likely browser-like environment
  }

  return 'unknown';
}

/**
 * Checks if secure randomness is available in the current runtime.
 */
export function hasSecureRandomness(): boolean {
  try {
    // Browser/Web Worker
    if (
      typeof globalThis !== 'undefined' &&
      'crypto' in globalThis &&
      typeof (globalThis as any).crypto?.getRandomValues === 'function'
    ) {
      return true;
    }

    // Node.js (check for crypto module)
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodeCrypto = require('crypto');
        return (
          nodeCrypto.webcrypto &&
          typeof nodeCrypto.webcrypto.getRandomValues === 'function'
        );
      } catch {
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if the runtime can load artifacts from the filesystem.
 */
export function canLoadArtifactsFromFilesystem(): boolean {
  const runtime = detectRuntimeType();
  return runtime === 'node' || runtime === 'deno' || runtime === 'bun';
}

/**
 * Checks if the runtime supports WASM-based proving.
 *
 * This requires:
 * - WebAssembly support
 * - Sufficient memory
 * - Threading support (for Barretenberg)
 */
export function canSupportWasmProving(): boolean {
  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    return false;
  }

  const runtime = detectRuntimeType();

  // Node.js, Deno, Bun typically support WASM proving
  if (runtime === 'node' || runtime === 'deno' || runtime === 'bun') {
    return true;
  }

  // Browser support varies - check for WebAssembly
  if (runtime === 'browser' || runtime === 'worker') {
    // Basic WebAssembly support exists, but full proving may require
    // additional checks (memory limits, threading, etc.)
    // For now, we say it's potentially supported but should be verified
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Capability Detection Engine
// ---------------------------------------------------------------------------

/**
 * Detects the full capability set for the current runtime.
 *
 * This is the primary entry point for capability negotiation.
 */
export function detectCapabilities(): ZkCapabilities {
  const runtimeType = detectRuntimeType();
  const hasRandomness = hasSecureRandomness();
  const canLoadArtifacts = canLoadArtifactsFromFilesystem();
  const canWasmProve = canSupportWasmProving();

  const limitations: string[] = [];

  // Determine proving capability
  let canProve = canWasmProve && hasRandomness;
  if (!canWasmProve) {
    limitations.push(
      'WASM proving not supported: WebAssembly unavailable or runtime does not support WASM-based proof generation'
    );
  }
  if (!hasRandomness) {
    limitations.push(
      'Secure randomness unavailable: cannot generate cryptographically secure values for proofs'
    );
  }

  // Verification typically requires the same WASM support
  const canVerify = canWasmProve;
  if (!canVerify && canWasmProve === false) {
    limitations.push(
      'Proof verification requires WASM support which is not available in this runtime'
    );
  }

  // Witness formatting is always supported (pure TypeScript)
  const canFormatWitness = true;

  return {
    canProve,
    canVerify,
    canFormatWitness,
    hasSecureRandomness: hasRandomness,
    canLoadArtifactsFromFilesystem: canLoadArtifacts,
    runtimeType,
    limitations,
  };
}

/**
 * Checks if a specific capability is supported, throwing an actionable error if not.
 *
 * @param capability The capability to check
 * @throws UnsupportedRuntimeError if the capability is not supported
 */
export function assertCapability(capability: CapabilityCheck): void {
  const capabilities = detectCapabilities();

  switch (capability) {
    case 'prove':
      if (!capabilities.canProve) {
        throw new UnsupportedRuntimeError(
          `Proof generation is not supported in ${capabilities.runtimeType} runtime. ` +
            `This operation requires WASM support and secure randomness.`,
          'prove',
          capabilities.runtimeType,
          capabilities.limitations.length > 0
            ? `Limitations: ${capabilities.limitations.join('; ')}. ` +
                'Consider using a Node.js environment or providing a pre-computed proof.'
            : undefined
        );
      }
      break;

    case 'verify':
      if (!capabilities.canVerify) {
        throw new UnsupportedRuntimeError(
          `Proof verification is not supported in ${capabilities.runtimeType} runtime. ` +
            `This operation requires WASM support.`,
          'verify',
          capabilities.runtimeType,
          'Use server-side verification or ensure WASM is enabled in your environment.'
        );
      }
      break;

    case 'format-witness':
      if (!capabilities.canFormatWitness) {
        throw new UnsupportedRuntimeError(
          `Witness formatting is not supported in ${capabilities.runtimeType} runtime.`,
          'format-witness',
          capabilities.runtimeType
        );
      }
      break;

    case 'load-artifacts':
      if (!capabilities.canLoadArtifactsFromFilesystem) {
        throw new UnsupportedRuntimeError(
          `Loading artifacts from filesystem is not supported in ${capabilities.runtimeType} runtime. ` +
            `Provide artifacts directly to the backend constructor instead.`,
          'load-artifacts',
          capabilities.runtimeType,
          'In browser environments, load artifacts via HTTP fetch or embed them in your bundle.'
        );
      }
      break;

    case 'secure-randomness':
      if (!capabilities.hasSecureRandomness) {
        throw new UnsupportedRuntimeError(
          `Secure randomness is not available in ${capabilities.runtimeType} runtime. ` +
            `Cannot generate cryptographically secure values.`,
          'secure-randomness',
          capabilities.runtimeType,
          'Ensure crypto.getRandomValues is available or provide a custom randomness source.'
        );
      }
      break;
  }
}

/**
 * Checks if a capability is supported without throwing.
 *
 * @param capability The capability to check
 * @returns true if the capability is supported, false otherwise
 */
export function isCapabilitySupported(capability: CapabilityCheck): boolean {
  try {
    assertCapability(capability);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper for Backend Initialization
// ---------------------------------------------------------------------------

/**
 * Validates that the runtime supports the requirements for a proving backend.
 *
 * Call this before initializing NoirBackend to fail fast with clear diagnostics.
 */
export function assertProvingBackendSupported(): void {
  assertCapability('prove');
  assertCapability('secure-randomness');
}

/**
 * Validates that the runtime supports witness-only operations.
 *
 * This is a minimal check for environments that only need to format witnesses.
 */
export function assertWitnessFormattingSupported(): void {
  assertCapability('format-witness');
}

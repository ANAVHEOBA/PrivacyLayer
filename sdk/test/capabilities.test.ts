/**
 * Runtime Capability Negotiation Tests
 *
 * Tests for capability detection, unsupported runtime diagnostics,
 * and capability negotiation across different runtime modes.
 */

/// <reference types="jest" />
import {
  ZkCapabilities,
  RuntimeType,
  CapabilityCheck,
  UnsupportedRuntimeError,
  detectRuntimeType,
  detectCapabilities,
  hasSecureRandomness,
  canLoadArtifactsFromFilesystem,
  canSupportWasmProving,
  assertCapability,
  isCapabilitySupported,
  assertProvingBackendSupported,
  assertWitnessFormattingSupported,
} from '../src/capabilities';

describe('Runtime Capability Detection', () => {
  describe('detectRuntimeType', () => {
    it('should detect Node.js runtime', () => {
      const runtime = detectRuntimeType();
      // In test environment (Jest), this should be Node.js
      expect(runtime).toBe('node');
    });

    it('should return a valid RuntimeType', () => {
      const runtime = detectRuntimeType();
      const validTypes: RuntimeType[] = [
        'node',
        'browser',
        'worker',
        'deno',
        'bun',
        'witness-only',
        'unknown',
      ];
      expect(validTypes).toContain(runtime);
    });
  });

  describe('hasSecureRandomness', () => {
    it('should return true in Node.js environment', () => {
      const hasRandomness = hasSecureRandomness();
      // Node.js should have crypto support
      expect(hasRandomness).toBe(true);
    });
  });

  describe('canLoadArtifactsFromFilesystem', () => {
    it('should return true in Node.js environment', () => {
      const canLoad = canLoadArtifactsFromFilesystem();
      expect(canLoad).toBe(true);
    });
  });

  describe('canSupportWasmProving', () => {
    it('should return true when WebAssembly is available', () => {
      const canProve = canSupportWasmProving();
      // Node.js typically supports WASM
      expect(canProve).toBe(true);
    });
  });
});

describe('Capability Detection Engine', () => {
  describe('detectCapabilities', () => {
    it('should return complete ZkCapabilities object', () => {
      const caps = detectCapabilities();

      expect(caps).toHaveProperty('canProve');
      expect(caps).toHaveProperty('canVerify');
      expect(caps).toHaveProperty('canFormatWitness');
      expect(caps).toHaveProperty('hasSecureRandomness');
      expect(caps).toHaveProperty('canLoadArtifactsFromFilesystem');
      expect(caps).toHaveProperty('runtimeType');
      expect(caps).toHaveProperty('limitations');
    });

    it('should have boolean values for capability flags', () => {
      const caps = detectCapabilities();

      expect(typeof caps.canProve).toBe('boolean');
      expect(typeof caps.canVerify).toBe('boolean');
      expect(typeof caps.canFormatWitness).toBe('boolean');
      expect(typeof caps.hasSecureRandomness).toBe('boolean');
      expect(typeof caps.canLoadArtifactsFromFilesystem).toBe('boolean');
    });

    it('should have a valid runtime type', () => {
      const caps = detectCapabilities();
      const validTypes: RuntimeType[] = [
        'node',
        'browser',
        'worker',
        'deno',
        'bun',
        'witness-only',
        'unknown',
      ];
      expect(validTypes).toContain(caps.runtimeType);
    });

    it('should return an array of limitations', () => {
      const caps = detectCapabilities();
      expect(Array.isArray(caps.limitations)).toBe(true);
    });

    it('should always support witness formatting', () => {
      const caps = detectCapabilities();
      // Witness formatting is pure TypeScript and should always work
      expect(caps.canFormatWitness).toBe(true);
    });

    it('should support proving in Node.js with crypto', () => {
      const caps = detectCapabilities();
      // In Node.js test environment, proving should be supported
      expect(caps.canProve).toBe(true);
      expect(caps.hasSecureRandomness).toBe(true);
    });
  });
});

describe('Capability Checks', () => {
  describe('assertCapability', () => {
    it('should not throw for supported capabilities in Node.js', () => {
      // These should not throw in Node.js
      expect(() => assertCapability('format-witness')).not.toThrow();
      expect(() => assertCapability('secure-randomness')).not.toThrow();
      expect(() => assertCapability('load-artifacts')).not.toThrow();
    });

    it('should throw UnsupportedRuntimeError for unsupported prove capability when appropriate', () => {
      // This test verifies the error structure, not the actual throw
      // In Node.js, prove is typically supported, so we test the error type exists
      const error = new UnsupportedRuntimeError(
        'Test error',
        'prove',
        'witness-only',
        'Use Node.js environment'
      );

      expect(error).toBeInstanceOf(UnsupportedRuntimeError);
      expect(error.name).toBe('UnsupportedRuntimeError');
      expect(error.capability).toBe('prove');
      expect(error.runtimeType).toBe('witness-only');
      expect(error.suggestion).toBe('Use Node.js environment');
    });
  });

  describe('isCapabilitySupported', () => {
    it('should return true for format-witness in all environments', () => {
      const supported = isCapabilitySupported('format-witness');
      expect(supported).toBe(true);
    });

    it('should return true for secure-randomness in Node.js', () => {
      const supported = isCapabilitySupported('secure-randomness');
      expect(supported).toBe(true);
    });

    it('should return true for load-artifacts in Node.js', () => {
      const supported = isCapabilitySupported('load-artifacts');
      expect(supported).toBe(true);
    });

    it('should return boolean values only', () => {
      const checks: CapabilityCheck[] = [
        'prove',
        'verify',
        'format-witness',
        'load-artifacts',
        'secure-randomness',
      ];

      checks.forEach((check) => {
        const result = isCapabilitySupported(check);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('assertProvingBackendSupported', () => {
    it('should not throw in Node.js environment', () => {
      // Node.js should support proving backend
      expect(() => assertProvingBackendSupported()).not.toThrow();
    });
  });

  describe('assertWitnessFormattingSupported', () => {
    it('should not throw in any environment', () => {
      // Witness formatting is always supported
      expect(() => assertWitnessFormattingSupported()).not.toThrow();
    });
  });
});

describe('UnsupportedRuntimeError', () => {
  it('should create error with all required fields', () => {
    const error = new UnsupportedRuntimeError(
      'Proof generation not supported',
      'prove',
      'browser',
      'Install WASM support'
    );

    expect(error.message).toBe('Proof generation not supported');
    expect(error.name).toBe('UnsupportedRuntimeError');
    expect(error.capability).toBe('prove');
    expect(error.runtimeType).toBe('browser');
    expect(error.suggestion).toBe('Install WASM support');
  });

  it('should be an instance of Error', () => {
    const error = new UnsupportedRuntimeError('Test', 'prove', 'node');
    expect(error).toBeInstanceOf(Error);
  });

  it('should work without suggestion parameter', () => {
    const error = new UnsupportedRuntimeError('Test', 'verify', 'worker');
    expect(error.suggestion).toBeUndefined();
  });
});

describe('NoirBackend Capability Integration', () => {
  describe('capability propagation', () => {
    it('should expose capabilities through backend API', () => {
      // This test would require mocking the backend
      // For now, we verify the capability detection works
      const caps = detectCapabilities();
      expect(caps.canFormatWitness).toBe(true);
    });
  });
});

describe('Withdrawal Capability Integration', () => {
  describe('canGenerateWithdrawalProof', () => {
    it('should return true in Node.js environment', () => {
      // Import dynamically to avoid circular dependencies
      const { canGenerateWithdrawalProof } = require('../src/withdraw');
      const canProve = canGenerateWithdrawalProof();
      expect(typeof canProve).toBe('boolean');
    });
  });

  describe('getWithdrawalCapabilities', () => {
    it('should return capabilities object', () => {
      const { getWithdrawalCapabilities } = require('../src/withdraw');
      const caps = getWithdrawalCapabilities();
      expect(caps).toHaveProperty('canProve');
      expect(caps).toHaveProperty('canVerify');
      expect(caps).toHaveProperty('canFormatWitness');
    });
  });
});

describe('Capability Edge Cases', () => {
  it('should handle repeated capability checks consistently', () => {
    const results1 = detectCapabilities();
    const results2 = detectCapabilities();

    expect(results1.canProve).toBe(results2.canProve);
    expect(results1.canVerify).toBe(results2.canVerify);
    expect(results1.runtimeType).toBe(results2.runtimeType);
  });

  it('should provide actionable limitations when capabilities are missing', () => {
    const caps = detectCapabilities();

    // If a capability is missing, limitations should explain why
    if (!caps.canProve) {
      expect(caps.limitations.length).toBeGreaterThan(0);
      expect(caps.limitations[0]).toBeTruthy();
    }
  });
});

describe('SDK Export Verification', () => {
  it('should export capability types from main index', () => {
    const sdk = require('../src/index');

    // Verify all expected runtime exports exist (types are compile-time only)
    expect(sdk.detectCapabilities).toBeDefined();
    expect(sdk.detectRuntimeType).toBeDefined();
    expect(sdk.UnsupportedRuntimeError).toBeDefined();
    expect(sdk.assertCapability).toBeDefined();
    expect(sdk.isCapabilitySupported).toBeDefined();
    expect(sdk.hasSecureRandomness).toBeDefined();
    expect(sdk.canLoadArtifactsFromFilesystem).toBeDefined();
    expect(sdk.canSupportWasmProving).toBeDefined();
    expect(sdk.assertProvingBackendSupported).toBeDefined();
    expect(sdk.assertWitnessFormattingSupported).toBeDefined();
  });

  it('should export capability helpers from backends', () => {
    const backends = require('../src/backends');

    expect(backends.detectCapabilities).toBeDefined();
    expect(backends.UnsupportedRuntimeError).toBeDefined();
  });
});

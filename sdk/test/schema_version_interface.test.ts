/**
 * Test to verify ZkArtifactManifestCircuit interface includes schema_version field
 * Task 4.1: Extend ZkArtifactManifestCircuit interface with schema_version field
 */

import { ZkArtifactManifestCircuit } from '../src/backends/noir';

describe('ZkArtifactManifestCircuit interface', () => {
  it('should accept schema_version as an optional field', () => {
    // Test that we can create a circuit entry with schema_version
    const circuitWithSchema: ZkArtifactManifestCircuit = {
      circuit_id: 'test',
      path: 'test.json',
      artifact_sha256: '0x123',
      bytecode_sha256: '0x456',
      abi_sha256: '0x789',
      name: 'test',
      backend: 'nargo/noir',
      schema_version: '1.2.3',
    };

    expect(circuitWithSchema.schema_version).toBe('1.2.3');
  });

  it('should accept circuit entry without schema_version (backward compatibility)', () => {
    // Test that schema_version is optional
    const circuitWithoutSchema: ZkArtifactManifestCircuit = {
      circuit_id: 'test',
      path: 'test.json',
      artifact_sha256: '0x123',
      bytecode_sha256: '0x456',
      abi_sha256: '0x789',
      name: 'test',
      backend: 'nargo/noir',
    };

    expect(circuitWithoutSchema.schema_version).toBeUndefined();
  });

  it('should accept schema_version with semantic versioning format', () => {
    const circuit: ZkArtifactManifestCircuit = {
      circuit_id: 'withdraw',
      path: 'withdraw.json',
      artifact_sha256: '0xabc',
      bytecode_sha256: '0xdef',
      abi_sha256: '0x012',
      name: 'withdraw',
      backend: 'nargo/noir',
      public_input_schema: ['pool_id', 'root', 'nullifier_hash'],
      schema_version: '1.12345.67890',
    };

    expect(circuit.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

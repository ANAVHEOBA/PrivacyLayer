/**
 * ZK-108: Withdrawal Schema Order Parity Test
 * 
 * This test ensures that multiple modules exporting withdrawal schema orders
 * remain consistent. It detects schema-order drift early by comparing all
 * schema definitions in one centralized parity check.
 * 
 * Relevant modules:
 * - sdk/src/encoding.ts (WITHDRAWAL_PUBLIC_INPUT_SCHEMA)
 * - sdk/src/public_inputs.ts (WITHDRAWAL_PUBLIC_INPUT_SCHEMA)
 * - sdk/src/proof.ts (PREPARED_WITHDRAWAL_WITNESS_SCHEMA - includes private inputs)
 * 
 * This test treats any duplicate but divergent schema definition as a hard failure,
 * preventing developers from needing to infer schema conflicts from unrelated
 * downstream test failures.
 */

describe('ZK-108: Withdrawal Schema Order Parity', () => {
  let encodingSchema: readonly string[];
  let publicInputsSchema: readonly string[];
  let contractVerifierSchema: readonly string[];

  beforeAll(() => {
    const encoding = require('../src/encoding');
    const publicInputs = require('../src/public_inputs');
    
    encodingSchema = encoding.WITHDRAWAL_PUBLIC_INPUT_SCHEMA;
    publicInputsSchema = publicInputs.WITHDRAWAL_PUBLIC_INPUT_SCHEMA;
    contractVerifierSchema = publicInputs.CONTRACT_VERIFIER_INPUT_SCHEMA;
  });

  describe('Schema Export Existence', () => {
    it('should export WITHDRAWAL_PUBLIC_INPUT_SCHEMA from encoding.ts', () => {
      expect(encodingSchema).toBeDefined();
      expect(Array.isArray(encodingSchema)).toBe(true);
      expect(encodingSchema.length).toBeGreaterThan(0);
    });

    it('should export WITHDRAWAL_PUBLIC_INPUT_SCHEMA from public_inputs.ts', () => {
      expect(publicInputsSchema).toBeDefined();
      expect(Array.isArray(publicInputsSchema)).toBe(true);
      expect(publicInputsSchema.length).toBeGreaterThan(0);
    });

    it('should export CONTRACT_VERIFIER_INPUT_SCHEMA from public_inputs.ts', () => {
      expect(contractVerifierSchema).toBeDefined();
      expect(Array.isArray(contractVerifierSchema)).toBe(true);
      expect(contractVerifierSchema.length).toBeGreaterThan(0);
    });
  });

  describe('Public Input Schema Parity', () => {
    it('should have compatible schema order between encoding.ts and public_inputs.ts', () => {
      // encoding.ts has 7 fields (core circuit schema)
      // public_inputs.ts has 8 fields (includes denomination for ZK-030)
      // The first 7 fields must match exactly
      const encodingSchemaArray = Array.from(encodingSchema);
      const publicInputsSchemaArray = Array.from(publicInputsSchema);
      
      // encoding.ts schema should be a prefix of public_inputs.ts schema
      // OR they should match exactly if denomination is not in public_inputs
      const commonLength = Math.min(encodingSchema.length, publicInputsSchema.length);
      
      for (let i = 0; i < commonLength; i++) {
        expect(publicInputsSchema[i]).toBe(encodingSchema[i]);
      }
    });

    it('should document the schema difference clearly', () => {
      // public_inputs.ts may include denomination as the last field (ZK-030)
      // This is intentional and should be documented
      if (publicInputsSchema.length > encodingSchema.length) {
        // If public_inputs has more fields, the extra should be denomination
        const extraFields = publicInputsSchema.slice(encodingSchema.length);
        expect(extraFields).toContain('denomination');
      }
    });

    it('should maintain consistent field names in the same order for common fields', () => {
      const commonLength = Math.min(encodingSchema.length, publicInputsSchema.length);
      for (let i = 0; i < commonLength; i++) {
        expect(publicInputsSchema[i]).toBe(encodingSchema[i]);
      }
    });
  });

  describe('Schema Content Validation', () => {
    it('should include all required withdrawal public inputs', () => {
      const requiredFields = [
        'pool_id',
        'root',
        'nullifier_hash',
        'recipient',
        'amount',
        'relayer',
        'fee',
      ];

      for (const field of requiredFields) {
        expect(encodingSchema).toContain(field);
        expect(publicInputsSchema).toContain(field);
      }
    });

    it('should have denomination field in public_inputs.ts schema (ZK-030)', () => {
      // public_inputs.ts includes denomination as per ZK-030
      expect(publicInputsSchema).toContain('denomination');
    });

    it('should exclude pool_id and denomination from contract verifier schema', () => {
      // Contract verifier doesn't receive pool_id and denomination
      expect(contractVerifierSchema).not.toContain('pool_id');
      expect(contractVerifierSchema).not.toContain('denomination');
    });

    it('should have contract verifier schema as a subset of full schema', () => {
      // All contract verifier fields should be in the full schema
      for (const field of contractVerifierSchema) {
        expect(publicInputsSchema).toContain(field);
      }
    });
  });

  describe('Schema Order Critical Fields', () => {
    it('should have pool_id as the first public input', () => {
      expect(encodingSchema[0]).toBe('pool_id');
      expect(publicInputsSchema[0]).toBe('pool_id');
    });

    it('should have root as the second public input', () => {
      expect(encodingSchema[1]).toBe('root');
      expect(publicInputsSchema[1]).toBe('root');
    });

    it('should have nullifier_hash as the third public input', () => {
      expect(encodingSchema[2]).toBe('nullifier_hash');
      expect(publicInputsSchema[2]).toBe('nullifier_hash');
    });

    it('should maintain pool-scoped nullifier semantics (ZK-035)', () => {
      // Verify nullifier_hash comes after root and pool_id in the schema
      const nullifierHashIndex = encodingSchema.indexOf('nullifier_hash');
      const poolIdIndex = encodingSchema.indexOf('pool_id');
      const rootIndex = encodingSchema.indexOf('root');
      
      expect(nullifierHashIndex).toBeGreaterThan(poolIdIndex);
      expect(nullifierHashIndex).toBeGreaterThan(rootIndex);
    });
  });

  describe('No Competing Schema Definitions', () => {
    it('should not have divergent schema exports in the same module', () => {
      // Check that encoding.ts doesn't export multiple different schemas
      const encoding = require('../src/encoding');
      const schemaExports = Object.keys(encoding).filter(
        key => key.includes('SCHEMA') && key.includes('WITHDRAWAL')
      );
      
      // Should only have one withdrawal schema in encoding.ts
      expect(schemaExports.length).toBeLessThanOrEqual(1);
    });

    it('should not have divergent schema exports in public_inputs.ts', () => {
      const publicInputs = require('../src/public_inputs');
      const schemaExports = Object.keys(publicInputs).filter(
        key => key.includes('SCHEMA') && key.includes('WITHDRAWAL')
      );
      
      // Should only have one withdrawal schema in public_inputs.ts
      expect(schemaExports.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Schema Immutability', () => {
    it('should not allow schema modification at runtime', () => {
      const originalLength = encodingSchema.length;
      const originalFirst = encodingSchema[0];
      
      // Attempt to modify (this should not affect the original)
      try {
        (encodingSchema as any)[0] = 'modified';
        (encodingSchema as any).push('new_field');
      } catch (e) {
        // Expected for readonly arrays
      }
      
      // Verify schema remains unchanged
      expect(encodingSchema.length).toBe(originalLength);
      expect(encodingSchema[0]).toBe(originalFirst);
    });
  });

  describe('Documentation Consistency', () => {
    it('should have schema order matching circuit documentation', () => {
      // The schema order must match circuits/withdraw/src/main.nr pub parameters:
      // pool_id, root, nullifier_hash, recipient, amount, relayer, fee
      // Note: denomination may be added as the last field (ZK-030)
      
      const expectedCircuitOrder = [
        'pool_id',
        'root', 
        'nullifier_hash',
        'recipient',
        'amount',
        'relayer',
        'fee',
      ];
      
      // encoding.ts should match circuit order exactly
      for (let i = 0; i < expectedCircuitOrder.length; i++) {
        expect(encodingSchema[i]).toBe(expectedCircuitOrder[i]);
      }
    });
  });
});

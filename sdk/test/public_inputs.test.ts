/// <reference types="jest" />
import {
  fieldToHex,
  hexToField,
  bufferToField,
  fieldToBuffer,
  encodePoolId,
  encodeMerkleRoot,
  encodeNullifier,
  encodeSecret,
  encodeStellarAddress,
  encodeAmount,
  encodeFee,
  encodeDenomination,
  encodeNullifierHash,
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
  CONTRACT_VERIFIER_INPUT_SCHEMA,
  serializeWithdrawalPublicInputs,
  serializeContractVerifierInputs,
  packWithdrawalPublicInputs,
} from '../src/public_inputs';
import { WitnessValidationError } from '../src/errors';
import { FIELD_MODULUS } from '../src/zk_constants';

const G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('Public Input Encoding (ZK-008)', () => {
  describe('Field element encoding', () => {
    it('converts bigint to canonical hex string', () => {
      expect(fieldToHex(0n)).toBe('0'.padStart(64, '0'));
      expect(fieldToHex(1n)).toBe('1'.padStart(64, '0'));
      expect(fieldToHex(255n)).toBe('ff'.padStart(64, '0'));
    });

    it('throws for out-of-range values', () => {
      expect(() => fieldToHex(-1n)).toThrow(RangeError);
      expect(() => fieldToHex(FIELD_MODULUS)).toThrow(RangeError);
    });

    it('parses hex string to field element', () => {
      expect(hexToField('0')).toBe(0n);
      expect(hexToField('ff')).toBe(255n);
      expect(hexToField('0xff')).toBe(255n);
    });

    it('reduces hex string modulo field prime', () => {
      const largeHex = FIELD_MODULUS.toString(16);
      const result = hexToField(largeHex);
      expect(result).toBe(0n);
    });

    it('converts buffer to field element', () => {
      const buf = Buffer.from([0x00, 0x01]);
      expect(bufferToField(buf)).toBe(256n);
    });

    it('serializes field element to buffer', () => {
      const buf = fieldToBuffer(0n);
      expect(buf.length).toBe(32);
      expect(buf[0]).toBe(0);
    });

    it('serializes non-zero field element correctly', () => {
      const buf = fieldToBuffer(255n);
      expect(buf[31]).toBe(255);
      expect(buf[30]).toBe(0);
    });
  });

  describe('Public input encoding', () => {
    it('encodes pool_id from hex string', () => {
      const poolId = 'ab'.repeat(32);
      const encoded = encodePoolId(poolId);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('throws for invalid pool_id length', () => {
      expect(() => encodePoolId('ab'.repeat(16))).toThrow();
    });

    it('encodes Merkle root from buffer', () => {
      const root = Buffer.alloc(32, 0xab);
      const encoded = encodeMerkleRoot(root);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('throws for invalid Merkle root length', () => {
      const root = Buffer.alloc(16, 0xab);
      expect(() => encodeMerkleRoot(root)).toThrow();
    });

    it('encodes nullifier from buffer', () => {
      const nullifier = Buffer.alloc(31, 0xcd);
      const encoded = encodeNullifier(nullifier);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('throws for invalid nullifier length', () => {
      const nullifier = Buffer.alloc(32, 0xcd);
      expect(() => encodeNullifier(nullifier)).toThrow();
    });

    it('encodes secret from buffer', () => {
      const secret = Buffer.alloc(31, 0xef);
      const encoded = encodeSecret(secret);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('encodes Stellar address to field', () => {
      const encoded = encodeStellarAddress(G);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('throws for invalid Stellar address', () => {
      expect(() => encodeStellarAddress('invalid')).toThrow(WitnessValidationError);
    });

    it('encodes amount as hex string', () => {
      expect(encodeAmount(0n)).toBe('0'.padStart(64, '0'));
      expect(encodeAmount(100n)).toBe('64'.padStart(64, '0'));
    });

    it('throws for negative amount', () => {
      expect(() => encodeAmount(-1n)).toThrow();
    });

    it('encodes fee as hex string', () => {
      expect(encodeFee(0n)).toBe('0'.padStart(64, '0'));
      expect(encodeFee(50n)).toBe('32'.padStart(64, '0'));
    });

    it('throws for negative fee', () => {
      expect(() => encodeFee(-1n)).toThrow();
    });

    it('encodes denomination as hex string', () => {
      expect(encodeDenomination(100n)).toBe('64'.padStart(64, '0'));
    });

    it('throws for zero or negative denomination', () => {
      expect(() => encodeDenomination(0n)).toThrow();
      expect(() => encodeDenomination(-1n)).toThrow();
    });

    it('computes nullifier hash with domain separation', () => {
      const nullifier = 'a'.repeat(64);
      const poolId = 'b'.repeat(64);
      const hash = encodeNullifierHash(nullifier, poolId);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Zero values and boundary amounts', () => {
    it('handles zero amount correctly', () => {
      const encoded = encodeAmount(0n);
      expect(encoded).toBe('0'.padStart(64, '0'));
    });

    it('handles zero fee correctly', () => {
      const encoded = encodeFee(0n);
      expect(encoded).toBe('0'.padStart(64, '0'));
    });

    it('handles zero field element correctly', () => {
      const encoded = fieldToHex(0n);
      expect(encoded).toBe('0'.padStart(64, '0'));
    });

    it('handles boundary amount of 1', () => {
      const encoded = encodeAmount(1n);
      expect(encoded).toBe('1'.padStart(64, '0'));
    });

    it('handles large amount near field modulus', () => {
      const largeAmount = FIELD_MODULUS - 1n;
      const encoded = encodeAmount(largeAmount);
      expect(encoded).toMatch(/^[0-9a-f]{64}$/);
    });

    it('handles fee equal to amount', () => {
      const amount = 100n;
      const fee = 100n;
      const encodedAmount = encodeAmount(amount);
      const encodedFee = encodeFee(fee);
      expect(encodedAmount).toBe(encodedFee);
    });

    it('serializes zero values correctly', () => {
      const inputs = {
        pool_id: '0'.repeat(64),
        root: '0'.repeat(64),
        nullifier_hash: '0'.repeat(64),
        recipient: '0'.repeat(64),
        amount: '0',
        relayer: '0'.repeat(64),
        fee: '0',
        denomination: '64'.padStart(64, '0'),
      };
      const serialized = serializeWithdrawalPublicInputs(inputs);
      expect(serialized.fields[0]).toBe('0'.repeat(64));
      expect(serialized.fields[4]).toBe('0'.repeat(64));
      expect(serialized.fields[6]).toBe('0'.repeat(64));
    });
  });

  describe('Invalid Stellar address inputs', () => {
    it('rejects empty string', () => {
      expect(() => encodeStellarAddress('')).toThrow(WitnessValidationError);
    });

    it('rejects invalid format', () => {
      expect(() => encodeStellarAddress('not-a-stellar-address')).toThrow(WitnessValidationError);
    });

    it('rejects malformed G-address', () => {
      expect(() => encodeStellarAddress('GABCD')).toThrow(WitnessValidationError);
    });

    it('rejects non-G prefix', () => {
      expect(() => encodeStellarAddress('MABCD...')).toThrow(WitnessValidationError);
    });

    it('accepts valid zero account', () => {
      expect(() => encodeStellarAddress(G)).not.toThrow();
    });
  });

  describe('Public input schemas', () => {
    it('defines withdrawal public input schema', () => {
      expect(WITHDRAWAL_PUBLIC_INPUT_SCHEMA).toEqual([
        'pool_id',
        'root',
        'nullifier_hash',
        'recipient',
        'amount',
        'relayer',
        'fee',
        'denomination',
      ]);
    });

    it('defines contract verifier input schema', () => {
      expect(CONTRACT_VERIFIER_INPUT_SCHEMA).toEqual([
        'root',
        'nullifier_hash',
        'recipient',
        'amount',
        'relayer',
        'fee',
      ]);
    });

    it('contract verifier schema excludes pool_id and denomination', () => {
      expect(CONTRACT_VERIFIER_INPUT_SCHEMA).not.toContain('pool_id');
      expect(CONTRACT_VERIFIER_INPUT_SCHEMA).not.toContain('denomination');
    });
  });

  describe('Serialization', () => {
    it('serializes withdrawal public inputs', () => {
      const inputs = {
        pool_id: 'a'.repeat(64),
        root: 'b'.repeat(64),
        nullifier_hash: 'c'.repeat(64),
        recipient: 'd'.repeat(64),
        amount: '100',
        relayer: 'e'.repeat(64),
        fee: '10',
        denomination: '64'.padStart(64, '0'),
      };
      const serialized = serializeWithdrawalPublicInputs(inputs);
      expect(serialized.fields).toHaveLength(8);
      expect(serialized.bytes).toHaveLength(256); // 8 * 32 bytes
    });

    it('serializes contract verifier inputs', () => {
      const inputs = {
        pool_id: 'a'.repeat(64),
        root: 'b'.repeat(64),
        nullifier_hash: 'c'.repeat(64),
        recipient: 'd'.repeat(64),
        amount: '100',
        relayer: 'e'.repeat(64),
        fee: '10',
        denomination: '64'.padStart(64, '0'),
      };
      const serialized = serializeContractVerifierInputs(inputs);
      expect(serialized.fields).toHaveLength(6);
      expect(serialized.bytes).toHaveLength(192); // 6 * 32 bytes
    });

    it('packs withdrawal public inputs from individual values', () => {
      const fields = packWithdrawalPublicInputs(
        'a'.repeat(64),
        'b'.repeat(64),
        'c'.repeat(64),
        'd'.repeat(64),
        100n,
        'e'.repeat(64),
        10n,
        100n
      );
      expect(fields).toHaveLength(8);
    });

    it('validates missing public inputs', () => {
      const inputs = {
        pool_id: 'a'.repeat(64),
        root: 'b'.repeat(64),
        nullifier_hash: 'c'.repeat(64),
        recipient: 'd'.repeat(64),
        amount: '100',
        relayer: 'e'.repeat(64),
        fee: '10',
        // missing denomination
      } as any;
      expect(() => serializeWithdrawalPublicInputs(inputs)).toThrow();
    });
  });

  describe('Encoding consistency', () => {
    it('same input produces same encoded output', () => {
      const nullifier = 'a'.repeat(64);
      const poolId = 'b'.repeat(64);
      const hash1 = encodeNullifierHash(nullifier, poolId);
      const hash2 = encodeNullifierHash(nullifier, poolId);
      expect(hash1).toBe(hash2);
    });

    it('different inputs produce different encoded outputs', () => {
      const nullifier1 = 'a'.repeat(64);
      const nullifier2 = 'b'.repeat(64);
      const poolId = 'c'.repeat(64);
      const hash1 = encodeNullifierHash(nullifier1, poolId);
      const hash2 = encodeNullifierHash(nullifier2, poolId);
      expect(hash1).not.toBe(hash2);
    });

    it('byte serialization matches hex encoding', () => {
      const value = 12345n;
      const hex = fieldToHex(value);
      const buf = fieldToBuffer(value);
      const bufHex = buf.toString('hex');
      expect(hex).toBe(bufHex.padStart(64, '0'));
    });
  });
});

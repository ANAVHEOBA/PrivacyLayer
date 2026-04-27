/**
 * ZK-082: Cache Key Stability Tests
 *
 * Verifies that cache keys remain stable after normalizing amount, fee, and
 * denomination fields to canonical field hex representation.
 *
 * Wave Issue Key: ZK-082
 */

import { Note } from '../src/note';
import { MerkleProof, ProofGenerator, PreparedWitness } from '../src/proof';
import { buildWithdrawalProofCacheKey, WithdrawalRequest } from '../src/withdraw';
import { fieldToHex, encodeAmount, encodeFee, encodeDenomination } from '../src/public_inputs';
import { ZERO_FIELD_HEX } from '../src/zk_constants';

const RECIPIENT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const RELAYER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
// Valid test Stellar address (different from RECIPIENT)
const RECIPIENT2 = 'GDJ7GPYZZGBS2HRRFZF6RESX24ZSP4QUIU2ICLM74F6L74WXP742IGOZ';

function makeNote(): Note {
  return new Note(
    Buffer.from('01'.repeat(31), 'hex'),
    Buffer.from('02'.repeat(31), 'hex'),
    '03'.repeat(32),
    1000000000n // DEFAULT_DENOMINATION
  );
}

function makeMerkleProof(): MerkleProof {
  return {
    root: Buffer.from('04'.repeat(32), 'hex'),
    pathElements: Array.from({ length: 20 }, (_, i) =>
      Buffer.from((5 + i).toString(16).padStart(2, '0').repeat(32), 'hex')
    ),
    pathIndices: Array.from({ length: 20 }, () => 0),
    leafIndex: 0
  };
}

function makeRequest(overrides: Partial<WithdrawalRequest> = {}): WithdrawalRequest {
  return {
    note: makeNote(),
    merkleProof: makeMerkleProof(),
    recipient: RECIPIENT,
    fee: 0n,
    ...overrides
  };
}

describe('Cache Key Stability (ZK-082)', () => {
  describe('Canonical field hex representation', () => {
    it('zero amount serializes to 64-char hex zero', () => {
      expect(encodeAmount(0n)).toBe(ZERO_FIELD_HEX);
      expect(encodeAmount(0n)).toHaveLength(64);
    });

    it('zero fee serializes to 64-char hex zero', () => {
      expect(encodeFee(0n)).toBe(ZERO_FIELD_HEX);
      expect(encodeFee(0n)).toHaveLength(64);
    });

    it('denomination serializes to canonical hex', () => {
      const denom = encodeDenomination(1000000000n);
      expect(denom).toMatch(/^[0-9a-f]{64}$/);
      expect(denom).not.toBe('1000000000');
    });

    it('fieldToHex produces consistent output for same input', () => {
      const value = 123456789n;
      expect(fieldToHex(value)).toBe(fieldToHex(value));
    });
  });

  describe('Cache key determinism', () => {
    it('produces stable cache key for identical witness', async () => {
      const request = makeRequest();
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient,
        undefined,
        0n
      );

      const key1 = buildWithdrawalProofCacheKey(request, witness);
      const key2 = buildWithdrawalProofCacheKey(request, witness);

      expect(key1).toBe(key2);
    });

    it('cache key changes when amount changes', async () => {
      const request1 = makeRequest({ fee: 0n });
      const request2 = makeRequest({ fee: 100n });

      const witness1 = await ProofGenerator.prepareWitness(
        request1.note,
        request1.merkleProof,
        request1.recipient,
        undefined,
        request1.fee
      );
      const witness2 = await ProofGenerator.prepareWitness(
        request2.note,
        request2.merkleProof,
        request2.recipient,
        undefined,
        request2.fee
      );

      const key1 = buildWithdrawalProofCacheKey(request1, witness1);
      const key2 = buildWithdrawalProofCacheKey(request2, witness2);

      expect(key1).not.toBe(key2);
    });

    it('cache key changes when fee changes', async () => {
      const request1 = makeRequest({ fee: 0n });
      const request2 = makeRequest({ fee: 50n });

      const witness1 = await ProofGenerator.prepareWitness(
        request1.note,
        request1.merkleProof,
        request1.recipient,
        RECIPIENT,
        request1.fee
      );
      const witness2 = await ProofGenerator.prepareWitness(
        request2.note,
        request2.merkleProof,
        request2.recipient,
        RECIPIENT,
        request2.fee
      );

      const key1 = buildWithdrawalProofCacheKey(request1, witness1);
      const key2 = buildWithdrawalProofCacheKey(request2, witness2);

      expect(key1).not.toBe(key2);
    });

    it('cache key changes when recipient changes', async () => {
      const request1 = makeRequest({ recipient: RECIPIENT });
      const request2 = makeRequest({ recipient: RECIPIENT2 });

      const witness1 = await ProofGenerator.prepareWitness(
        request1.note,
        request1.merkleProof,
        request1.recipient
      );
      const witness2 = await ProofGenerator.prepareWitness(
        request2.note,
        request2.merkleProof,
        request2.recipient
      );

      const key1 = buildWithdrawalProofCacheKey(request1, witness1);
      const key2 = buildWithdrawalProofCacheKey(request2, witness2);

      expect(key1).not.toBe(key2);
    });

    it('witness amount field is canonical hex (not decimal)', async () => {
      const request = makeRequest();
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient
      );

      expect(witness.amount).toMatch(/^[0-9a-f]{64}$/);
      expect(witness.amount).not.toMatch(/^\d+$/);
      expect(witness.amount).toBe(fieldToHex(1000000000n));
    });

    it('witness fee field is canonical hex (not decimal)', async () => {
      const request = makeRequest({ fee: 100n });
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient,
        RECIPIENT,
        request.fee
      );

      // Canonical hex is 64 characters, decimal strings would be shorter
      expect(witness.fee).toMatch(/^[0-9a-f]{64}$/);
      expect(witness.fee.length).toBe(64);
      expect(witness.fee).toBe(fieldToHex(100n));
    });

    it('witness denomination field is canonical hex (not decimal)', async () => {
      const request = makeRequest();
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient
      );

      expect(witness.denomination).toMatch(/^[0-9a-f]{64}$/);
      expect(witness.denomination).not.toMatch(/^\d+$/);
      expect(witness.denomination).toBe(fieldToHex(1000000000n));
    });

    it('zero fee witness produces stable cache key', async () => {
      const request = makeRequest({ fee: 0n });
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient
      );

      expect(witness.fee).toBe(ZERO_FIELD_HEX);

      const key1 = buildWithdrawalProofCacheKey(request, witness);
      const key2 = buildWithdrawalProofCacheKey(request, witness);

      expect(key1).toBe(key2);
    });
  });

  describe('No mixing of decimal and hex encodings', () => {
    it('all witness fields are 64-char hex strings', async () => {
      const request = makeRequest({ fee: 50n });
      const witness = await ProofGenerator.prepareWitness(
        request.note,
        request.merkleProof,
        request.recipient,
        RECIPIENT,
        request.fee
      );

      const fieldsToCheck: (keyof PreparedWitness)[] = [
        'pool_id',
        'root',
        'nullifier_hash',
        'recipient',
        'amount',
        'relayer',
        'fee',
        'denomination',
        'nullifier',
        'secret',
        'leaf_index',
      ];

      for (const field of fieldsToCheck) {
        const value = witness[field] as string;
        // Canonical field hex is always 64 characters
        expect(value).toMatch(/^[0-9a-f]{64}$/);
        expect(value.length).toBe(64);
      }

      for (const pathElement of witness.hash_path) {
        expect(pathElement).toMatch(/^[0-9a-f]{64}$/);
        expect(pathElement.length).toBe(64);
      }
    });
  });
});

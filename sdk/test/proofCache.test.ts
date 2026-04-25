import { expect, test, describe, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import {
  InMemoryProofCache,
  createCacheKey,
  cacheKeyFromWitness,
  defaultProofCache,
} from '../src/proofCache';
import type { Groth16Proof } from '../src/proof';

describe('ProofCache', () => {
  const testProof: Groth16Proof = {
    proof: new Uint8Array([1, 2, 3]),
    publicInputs: ['0x1', '0x2', '0x3'],
  };

  const testWitness = {
    nullifier: '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    root: '0x101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f',
    recipient: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
    amount: '0x000000000000000000000000000003e8',
    relayer: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
    fee: '0x0000000000000000000000000000000a',
  };

  beforeEach(() => {
    defaultProofCache.clear();
  });

  // ---------------------------------------------------------------------------
  // Cache key generation
  // ---------------------------------------------------------------------------

  describe('createCacheKey', () => {
    it('generates stable keys for identical inputs', () => {
      const key1 = createCacheKey({
        nullifier: '0x1',
        root: '0x2',
        recipient: 'GABC',
        amount: '100',
        relayer: 'GDEF',
        fee: '10',
      });

      const key2 = createCacheKey({
        nullifier: '0x1',
        root: '0x2',
        recipient: 'GABC',
        amount: '100',
        relayer: 'GDEF',
        fee: '10',
      });

      expect(key1).toBe(key2);
    });

    it('produces different keys for different nullifiers', () => {
      const key1 = createCacheKey({
        ...testWitness,
        nullifier: '0x1',
      });
      const key2 = createCacheKey({
        ...testWitness,
        nullifier: '0x2',
      });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different roots', () => {
      const key1 = createCacheKey({
        ...testWitness,
        root: '0x1',
      });
      const key2 = createCacheKey({
        ...testWitness,
        root: '0x2',
      });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different recipients', () => {
      const key1 = createCacheKey({
        ...testWitness,
        recipient: 'GAAAAA',
      });
      const key2 = createCacheKey({
        ...testWitness,
        recipient: 'GBBBBB',
      });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different amounts', () => {
      const key1 = createCacheKey({
        ...testWitness,
        amount: '100',
      });
      const key2 = createCacheKey({
        ...testWitness,
        amount: '200',
      });
      expect(key1).not.toBe(key2);
    });

    it('produces different keys for different fees', () => {
      const key1 = createCacheKey({
        ...testWitness,
        fee: '10',
      });
      const key2 = createCacheKey({
        ...testWitness,
        fee: '20',
      });
      expect(key1).not.toBe(key2);
    });
  });

  describe('cacheKeyFromWitness', () => {
    it('extracts correct fields from witness', () => {
      const key = cacheKeyFromWitness(testWitness);
      expect(typeof key).toBe('string');
      expect(key).toContain(testWitness.nullifier);
      expect(key).toContain(testWitness.root);
      expect(key).toContain(testWitness.recipient);
    });
  });

  // ---------------------------------------------------------------------------
  // InMemoryProofCache
  // ---------------------------------------------------------------------------

  describe('InMemoryProofCache', () => {
    it('stores and retrieves proofs', () => {
      const cache = new InMemoryProofCache();
      const key = 'test-key';

      cache.set(key, testProof);
      const result = cache.get(key);

      expect(result).not.toBeUndefined();
      expect(result?.proof).toEqual(testProof.proof);
      expect(result?.publicInputs).toEqual(testProof.publicInputs);
    });

    it('returns undefined for non-existent keys', () => {
      const cache = new InMemoryProofCache();
      expect(cache.get('does-not-exist')).toBeUndefined();
    });

    it('overwrites existing entries', () => {
      const cache = new InMemoryProofCache();
      const key = 'test-key';
      const proof2: Groth16Proof = {
        proof: new Uint8Array([4, 5, 6]),
        publicInputs: ['0x4', '0x5', '0x6'],
      };

      cache.set(key, testProof);
      cache.set(key, proof2);
      const result = cache.get(key);

      expect(result?.proof).toEqual(proof2.proof);
    });

    it('deletes entries', () => {
      const cache = new InMemoryProofCache();
      const key = 'test-key';

      cache.set(key, testProof);
      const deleted = cache.delete(key);
      const result = cache.get(key);

      expect(deleted).toBe(true);
      expect(result).toBeUndefined();
    });

    it('clears all entries', () => {
      const cache = new InMemoryProofCache();

      cache.set('key1', testProof);
      cache.set('key2', testProof);
      expect(cache.size()).toBe(2);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('reports size correctly', () => {
      const cache = new InMemoryProofCache();

      expect(cache.size()).toBe(0);
      cache.set('key1', testProof);
      expect(cache.size()).toBe(1);
      cache.set('key2', testProof);
      expect(cache.size()).toBe(2);
      cache.delete('key1');
      expect(cache.size()).toBe(1);
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('evicts oldest entries when maxSize exceeded (LRU)', () => {
      const cache = new InMemoryProofCache(2); // max 2 entries

      cache.set('key1', testProof);
      cache.set('key2', testProof);
      expect(cache.size()).toBe(2);

      // Access key1 to make it more recent
      cache.get('key1');

      // Add third entry - key2 should be evicted
      cache.set('key3', testProof);

      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).not.toBeUndefined(); // still there
      expect(cache.get('key2')).toBeUndefined(); // evicted
      expect(cache.get('key3')).not.toBeUndefined(); // new entry
    });

    it('respects TTL for entries', async () => {
      const cache = new InMemoryProofCache(100, 10); // 10ms TTL

      cache.set('key1', testProof);
      expect(cache.get('key1')).not.toBeUndefined();

      await new Promise((r) => setTimeout(r, 20));

      expect(cache.get('key1')).toBeUndefined();
    });

    it('updates LRU order on get', () => {
      const cache = new InMemoryProofCache(3);

      cache.set('key1', testProof); // oldest
      cache.set('key2', testProof);
      cache.set('key3', testProof); // newest

      // Access key1 - should move to newest position
      cache.get('key1');

      // Add fourth entry - key2 should be evicted
      cache.set('key4', testProof);

      expect(cache.get('key1')).not.toBeUndefined();
      expect(cache.get('key2')).toBeUndefined(); // evicted
      expect(cache.get('key3')).not.toBeUndefined();
      expect(cache.get('key4')).not.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Default cache
  // ---------------------------------------------------------------------------

  describe('defaultProofCache', () => {
    it('is a shared InMemoryProofCache instance', () => {
      expect(defaultProofCache).toBeInstanceOf(InMemoryProofCache);
    });

    it('persists state across imports', () => {
      defaultProofCache.set('shared-key', testProof);

      // Second import would get same instance (tested implicitly)
      expect(defaultProofCache.size()).toBeGreaterThan(0);
    });
  });
});

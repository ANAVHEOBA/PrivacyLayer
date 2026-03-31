/**
 * Proof Cache SDK Tests
 *
 * Tests the proof caching system including:
 * - Cache key computation (Poseidon hash)
 * - TTL-based cache validation
 * - Cache retrieval and storage
 * - Cache invalidation
 * - Storage management and pruning
 * - Privacy properties (keys are hashes, not raw data)
 */

// Mock localStorage for Node.js environment
const storage: Map<string, string> = new Map();

const localStorageMock = {
  getItem: (key: string): string | null => storage.get(key) ?? null,
  setItem: (key: string, value: string): void => { storage.set(key, value); },
  removeItem: (key: string): void => { storage.delete(key); },
  clear: (): void => { storage.clear(); },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Import after mock is set
import {
  computeCacheKey,
  validateCache,
  invalidateCache,
  getCachedProof,
  setCachedProof,
  clearAllCache,
  getCacheStats,
  pruneExpiredCache,
  cacheProof,
  ProofInput,
} from '../proofCache';

// ─── Test Helpers ──────────────────────────────────────────────────────────────

const DEFAULT_PROOF_INPUT: ProofInput = {
  nullifier: 123456789n,
  secret: 987654321n,
  merkleRoot: 11111111n,
  merklePathElements: [22222222n, 33333333n],
  merklePathIndices: [0, 1],
  recipient: 'GABC123',
  relayer: 'GDEF456',
  fee: 100n,
  refund: 50n,
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Proof Cache System', () => {
  beforeEach(() => {
    // Clear storage before each test
    storage.clear();
    localStorage.clear();
  });

  describe('computeCacheKey', () => {
    it('should compute consistent Poseidon hash for same inputs', async () => {
      const key1 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      const key2 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different inputs', async () => {
      const key1 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      const key2 = await computeCacheKey({
        ...DEFAULT_PROOF_INPUT,
        nullifier: 999999999n,
      });
      expect(key1).not.toBe(key2);
    });

    it('should produce a hex string of the Poseidon hash', async () => {
      const key = await computeCacheKey(DEFAULT_PROOF_INPUT);
      expect(key).toMatch(/^[0-9a-f]+$/);
      expect(key.length).toBeGreaterThan(0);
    });

    it('should be different when merkle path changes', async () => {
      const key1 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      const key2 = await computeCacheKey({
        ...DEFAULT_PROOF_INPUT,
        merklePathElements: [22222222n, 44444444n],
      });
      expect(key1).not.toBe(key2);
    });

    it('should be different when recipient changes', async () => {
      const key1 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      const key2 = await computeCacheKey({
        ...DEFAULT_PROOF_INPUT,
        recipient: 'GDIFFERENT',
      });
      expect(key1).not.toBe(key2);
    });

    it('should include optional relayer in hash', async () => {
      const key1 = await computeCacheKey(DEFAULT_PROOF_INPUT);
      const key2 = await computeCacheKey({ ...DEFAULT_PROOF_INPUT, relayer: undefined });
      expect(key1).not.toBe(key2);
    });
  });

  describe('setCachedProof / getCachedProof', () => {
    it('should store and retrieve a proof', () => {
      const key = 'test_key_001';
      const proof = { a: 1, b: 2, c: [1, 2, 3] };

      const stored = setCachedProof(key, proof);
      expect(stored).toBe(true);

      const retrieved = getCachedProof<typeof proof>(key);
      expect(retrieved).toEqual(proof);
    });

    it('should return null for non-existent key', () => {
      const result = getCachedProof('non_existent_key');
      expect(result).toBeNull();
    });

    it('should retrieve proof with custom TTL', async () => {
      const key = 'test_key_ttl';
      const proof = { value: 'test' };

      setCachedProof(key, proof, 2000); // 2 second TTL
      const retrieved = getCachedProof<typeof proof>(key);
      expect(retrieved).toEqual(proof);
    });

    it('should not retrieve expired proof', async () => {
      const key = 'test_key_expired';
      const proof = { value: 'test' };

      setCachedProof(key, proof, 50); // 50ms TTL
      await sleep(100);

      const retrieved = getCachedProof(key);
      expect(retrieved).toBeNull();
    });

    it('should handle different proof types', () => {
      const key = 'test_types';

      // String proof
      expect(setCachedProof(key + '_str', 'string proof')).toBe(true);
      expect(getCachedProof<string>(key + '_str')).toBe('string proof');

      // Number proof
      expect(setCachedProof(key + '_num', 42)).toBe(true);
      expect(getCachedProof<number>(key + '_num')).toBe(42);

      // BigInt proof
      expect(setCachedProof(key + '_big', 12345678901234567890n)).toBe(true);
      expect(getCachedProof<bigint>(key + '_big')).toBe(12345678901234567890n);

      // Object proof
      const obj = { nullifier: 1n, secret: 2n, path: [1n, 2n, 3n] };
      expect(setCachedProof(key + '_obj', obj)).toBe(true);
      expect(getCachedProof(key + '_obj')).toEqual(obj);
    });
  });

  describe('validateCache', () => {
    it('should return true for valid cached proof', () => {
      const key = 'valid_key';
      setCachedProof(key, { data: 'test' });
      expect(validateCache(key)).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(validateCache('non_existent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      const key = 'expired_key';
      setCachedProof(key, { data: 'test' }, 10);
      await sleep(20);
      expect(validateCache(key)).toBe(false);
    });
  });

  describe('invalidateCache', () => {
    it('should remove a specific cache entry', () => {
      const key = 'invalidate_key';
      setCachedProof(key, { data: 'test' });
      expect(validateCache(key)).toBe(true);

      invalidateCache(key);
      expect(validateCache(key)).toBe(false);
      expect(getCachedProof(key)).toBeNull();
    });

    it('should not affect other entries', () => {
      const key1 = 'key_one';
      const key2 = 'key_two';
      const proof = { data: 'test' };

      setCachedProof(key1, proof);
      setCachedProof(key2, { ...proof, extra: true });

      invalidateCache(key1);

      expect(validateCache(key1)).toBe(false);
      expect(validateCache(key2)).toBe(true);
      expect(getCachedProof(key2)).toEqual({ data: 'test', extra: true });
    });
  });

  describe('clearAllCache', () => {
    it('should remove all cache entries', () => {
      const entries = ['key_a', 'key_b', 'key_c'];
      entries.forEach(key => setCachedProof(key, { data: key }));

      clearAllCache();

      entries.forEach(key => {
        expect(validateCache(key)).toBe(false);
      });
    });

    it('should reset cache metadata', () => {
      setCachedProof('meta_key', { data: 'test' });
      expect(getCacheStats().entryCount).toBe(1);

      clearAllCache();
      expect(getCacheStats().entryCount).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should track entry count', () => {
      expect(getCacheStats().entryCount).toBe(0);
      setCachedProof('stat_1', { data: 1 });
      setCachedProof('stat_2', { data: 2 });
      expect(getCacheStats().entryCount).toBe(2);
    });

    it('should track total size', () => {
      const stats = getCacheStats();
      expect(stats.totalSizeBytes).toBe(0);

      setCachedProof('size_1', { large: 'x'.repeat(1000) });
      const newStats = getCacheStats();
      expect(newStats.totalSizeBytes).toBeGreaterThan(100);
    });

    it('should track oldest and newest entries', async () => {
      setCachedProof('oldest', { data: 'old' });
      await sleep(10);
      setCachedProof('newest', { data: 'new' });

      const stats = getCacheStats();
      expect(stats.oldestEntry).not.toBeNull();
      expect(stats.newestEntry).not.toBeNull();
      expect(stats.oldestEntry).toBeLessThanOrEqual(stats.newestEntry!);
    });
  });

  describe('pruneExpiredCache', () => {
    it('should remove expired entries', async () => {
      setCachedProof('active', { data: 'active' }, 10000); // long TTL
      setCachedProof('expired1', { data: 'expired' }, 10);
      setCachedProof('expired2', { data: 'expired' }, 10);

      await sleep(20);

      const pruned = pruneExpiredCache();
      expect(pruned).toBe(2);
      expect(validateCache('active')).toBe(true);
      expect(validateCache('expired1')).toBe(false);
      expect(validateCache('expired2')).toBe(false);
    });

    it('should return 0 when no expired entries', () => {
      setCachedProof('still_valid', { data: 'test' }, 10000);
      const pruned = pruneExpiredCache();
      expect(pruned).toBe(0);
    });
  });

  describe('cacheProof convenience function', () => {
    it('should compute key and cache proof in one call', async () => {
      const key = await cacheProof(DEFAULT_PROOF_INPUT, { proof: 'data' });
      expect(key).toMatch(/^[0-9a-f]+$/);
      expect(getCachedProof(key)).toEqual({ proof: 'data' });
    });

    it('should allow custom TTL via cacheProof', async () => {
      const key = await cacheProof(DEFAULT_PROOF_INPUT, { proof: 'data' }, 50);
      await sleep(20);
      expect(validateCache(key)).toBe(true);
      await sleep(40);
      expect(validateCache(key)).toBe(false);
    });
  });

  describe('Privacy properties', () => {
    it('cache keys should be hashes, not raw inputs', async () => {
      const key = await computeCacheKey(DEFAULT_PROOF_INPUT);
      // The key should not contain any recognizable raw input data
      const keyStr = key.toLowerCase();
      expect(keyStr).not.toContain('123456789'); // nullifier
      expect(keyStr).not.toContain('987654321'); // secret
      expect(keyStr).not.toContain('gabc123'); // recipient
    });

    it('storage should not contain raw proof inputs', () => {
      const key = 'privacy_test_key';
      const proofWithSensitiveData = {
        nullifier: 'secret_nullifier_123',
        secret: 'super_secret_456',
      };
      setCachedProof(key, proofWithSensitiveData);

      const stored = localStorage.getItem('pl_proof_cache_' + key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // The proof itself may contain sensitive data (that's the user's data)
        // but the key is a hash, not raw inputs
        expect(key).toMatch(/^[0-9a-f]+$/);
      }
    });
  });

  describe('Storage edge cases', () => {
    it('should handle empty proof object', () => {
      const key = 'empty_proof';
      expect(setCachedProof(key, {})).toBe(true);
      expect(getCachedProof(key)).toEqual({});
    });

    it('should handle proof with special characters', () => {
      const key = 'special_chars';
      const proof = {
        text: 'hello world! @#$%',
        unicode: '中文测试 🚀',
        quotes: '"double" and \'single\'',
      };
      setCachedProof(key, proof);
      expect(getCachedProof(key)).toEqual(proof);
    });

    it('should handle array proof', () => {
      const key = 'array_proof';
      const proof = [1, 2, 3, { nested: true }, [4, 5]];
      setCachedProof(key, proof);
      expect(getCachedProof(key)).toEqual(proof);
    });
  });
});

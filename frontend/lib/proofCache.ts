/**
 * Proof Caching System — Frontend Library
 *
 * Re-exports the SDK proof cache with frontend-specific utilities.
 * Mounts on window.__ PrivacyLayer for debugging in dev tools.
 *
 * @example
 * import { computeCacheKey, setCachedProof, getCachedProof } from '@/lib/proofCache';
 *
 * const key = await computeCacheKey(inputs);
 * if (getCachedProof(key)) {
 *   console.log('Proof found in cache!');
 * }
 */

export {
  computeCacheKey,
  validateCache,
  invalidateCache,
  getCachedProof,
  setCachedProof,
  clearAllCache,
  getCacheStats,
  pruneExpiredCache,
  cacheProof,
} from '../../sdk/src/proofCache';

export type { CachedProof, ProofInput, CacheMetadata } from '../../sdk/src/proofCache';

// ─── Frontend utilities ────────────────────────────────────────────────────────

/**
 * Format cache statistics for display.
 */
export function formatCacheStats(stats: ReturnType<typeof import('../../sdk/src/proofCache').getCacheStats>): string {
  const entries = stats.entryCount;
  const expired = stats.expiredEntries;
  const sizeKB = (stats.totalSizeBytes / 1024).toFixed(1);
  const oldest = stats.oldestEntry
    ? new Date(stats.oldestEntry).toLocaleString()
    : 'N/A';
  const newest = stats.newestEntry
    ? new Date(stats.newestEntry).toLocaleString()
    : 'N/A';

  return [
    `Entries: ${entries} (${expired} expired)`,
    `Total size: ${sizeKB} KB`,
    `Oldest: ${oldest}`,
    `Newest: ${newest}`,
  ].join('\n');
}

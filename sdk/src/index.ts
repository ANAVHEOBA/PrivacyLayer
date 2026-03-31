/**
 * PrivacyLayer SDK
 *
 * TypeScript client SDK for interacting with the PrivacyLayer privacy pool
 * on Stellar Soroban. Handles note generation, proof creation, and
 * deposit/withdrawal flows.
 *
 * @package @privacylayer/sdk
 */

// Proof caching system
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
} from './proofCache';

export type {
  CachedProof,
  ProofInput,
  CacheMetadata,
} from './proofCache';

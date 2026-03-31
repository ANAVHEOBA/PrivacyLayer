/**
 * Proof Caching System for PrivacyLayer SDK
 *
 * Caches generated ZK proofs to avoid regenerating proofs for same inputs.
 * Uses Poseidon hash as cache key for privacy-preserving storage (no raw
 * inputs stored in cache). Cache entries expire via TTL to limit storage growth.
 *
 * Privacy considerations:
 * - Cache keys are Poseidon hashes, not raw inputs
 * - Cache can be cleared at any time
 * - No cross-domain tracking possible
 */

import * as poseidon from 'poseidon-lite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedProof<T = unknown> {
  proof: T;
  createdAt: number;
  expiresAt: number;
}

export interface ProofInput {
  nullifier: bigint;
  secret: bigint;
  merkleRoot: bigint;
  merklePathElements: bigint[];
  merklePathIndices: number[];
  recipient: string;
  relayer?: string;
  fee?: bigint;
  refund?: bigint;
}

export interface CacheMetadata {
  key: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

// ─── Poseidon Hash Helper ─────────────────────────────────────────────────────

/**
 * Compute Poseidon hash of proof inputs to create a privacy-preserving cache key.
 * Uses the same Poseidon2 hash as the Stellar Protocol 25 host function.
 *
 * @param inputs - Array of bigint inputs to hash
 * @returns Poseidon hash as hex string (cache key)
 */
export async function computeCacheKey(inputs: ProofInput): Promise<string> {
  const fields: bigint[] = [
    inputs.nullifier,
    inputs.secret,
    inputs.merkleRoot,
    ...inputs.merklePathElements,
    BigInt(inputs.merklePathIndices.length),
    BigInt(BigInt(inputs.recipient) % BigInt(2 ** 128)), // truncate address
  ];

  if (inputs.relayer) {
    fields.push(BigInt(BigInt(inputs.relayer) % BigInt(2 ** 128)));
  }
  if (inputs.fee !== undefined) {
    fields.push(inputs.fee);
  }
  if (inputs.refund !== undefined) {
    fields.push(inputs.refund);
  }

  const hash = poseidon(fields);
  return hash.toString(16);
}

// ─── Storage Helpers ───────────────────────────────────────────────────────────

const CACHE_PREFIX = 'pl_proof_cache_';
const METADATA_KEY = 'pl_proof_cache_meta';

/**
 * Get all cache entries metadata (lightweight scan).
 */
function getCacheMetadata(): CacheMetadata[] {
  try {
    const raw = localStorage.getItem(METADATA_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CacheMetadata[];
  } catch {
    return [];
  }
}

/**
 * Save cache metadata.
 */
function saveCacheMetadata(meta: CacheMetadata[]): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(meta));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Get a raw cache entry from localStorage.
 */
function getRawCacheEntry(key: string): CachedProof | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedProof;
  } catch {
    return null;
  }
}

/**
 * Store a raw cache entry in localStorage.
 */
function setRawCacheEntry(key: string, entry: CachedProof): boolean {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));

    // Update metadata
    const meta = getCacheMetadata();
    const existing = meta.findIndex(m => m.key === key);
    const metaEntry: CacheMetadata = {
      key,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      size: JSON.stringify(entry).length,
    };
    if (existing >= 0) {
      meta[existing] = metaEntry;
    } else {
      meta.push(metaEntry);
    }
    saveCacheMetadata(meta);
    return true;
  } catch {
    // Storage full
    return false;
  }
}

/**
 * Remove a raw cache entry from localStorage.
 */
function removeRawCacheEntry(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
    const meta = getCacheMetadata().filter(m => m.key !== key);
    saveCacheMetadata(meta);
  } catch {
    // Ignore
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if a cached proof exists and is still valid (not expired).
 *
 * @param key - Cache key (Poseidon hash of inputs)
 * @returns true if valid cached proof exists
 */
export function validateCache(key: string): boolean {
  const entry = getRawCacheEntry(key);
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

/**
 * Remove a specific cache entry.
 *
 * @param key - Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  removeRawCacheEntry(key);
}

/**
 * Retrieve a cached proof if it exists and is valid.
 *
 * @param key - Cache key (Poseidon hash of inputs)
 * @returns The cached proof object, or null if not found/expired
 */
export function getCachedProof<T = unknown>(key: string): T | null {
  if (!validateCache(key)) {
    if (getRawCacheEntry(key)) {
      // Expired — clean up
      invalidateCache(key);
    }
    return null;
  }
  const entry = getRawCacheEntry(key);
  return entry ? (entry.proof as T) : null;
}

/**
 * Store a proof in the cache with a TTL (time-to-live).
 *
 * @param key - Cache key (Poseidon hash of inputs)
 * @param proof - The proof object to cache
 * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
 * @returns true if stored successfully
 */
export function setCachedProof<T = unknown>(
  key: string,
  proof: T,
  ttlMs: number = 60 * 60 * 1000,
): boolean {
  const now = Date.now();
  const entry: CachedProof<T> = {
    proof,
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  return setRawCacheEntry(key, entry);
}

/**
 * Clear all cached proofs.
 */
export function clearAllCache(): void {
  try {
    const meta = getCacheMetadata();
    for (const m of meta) {
      localStorage.removeItem(CACHE_PREFIX + m.key);
    }
    localStorage.removeItem(METADATA_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Get statistics about the cache.
 */
export function getCacheStats(): {
  entryCount: number;
  totalSizeBytes: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  expiredEntries: number;
} {
  const meta = getCacheMetadata();
  const now = Date.now();
  let expiredCount = 0;
  let oldest: number | null = null;
  let newest: number | null = null;
  let totalSize = 0;

  for (const m of meta) {
    if (m.expiresAt < now) expiredCount++;
    if (oldest === null || m.createdAt < oldest) oldest = m.createdAt;
    if (newest === null || m.createdAt > newest) newest = m.createdAt;
    totalSize += m.size;
  }

  return {
    entryCount: meta.length,
    totalSizeBytes: totalSize,
    oldestEntry: oldest,
    newestEntry: newest,
    expiredEntries: expiredCount,
  };
}

/**
 * Remove all expired cache entries (garbage collection).
 */
export function pruneExpiredCache(): number {
  const meta = getCacheMetadata();
  const now = Date.now();
  let pruned = 0;
  const remaining: CacheMetadata[] = [];

  for (const m of meta) {
    if (m.expiresAt < now) {
      removeRawCacheEntry(m.key);
      pruned++;
    } else {
      remaining.push(m);
    }
  }

  saveCacheMetadata(remaining);
  return pruned;
}

/**
 * Compute cache key from proof inputs and cache the result.
 * Convenience function that combines computeCacheKey + setCachedProof.
 *
 * @param inputs - Proof input parameters
 * @param proof - The generated proof
 * @param ttlMs - TTL in milliseconds
 * @returns The cache key used
 */
export async function cacheProof<T = unknown>(
  inputs: ProofInput,
  proof: T,
  ttlMs: number = 60 * 60 * 1000,
): Promise<string> {
  const key = await computeCacheKey(inputs);
  setCachedProof(key, proof, ttlMs);
  return key;
}

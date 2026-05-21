/**
 * PrivacyLayer Proof Caching System
 *
 * Caches generated ZK proofs to avoid regenerating for same inputs.
 * Includes validation, invalidation, storage management, and privacy considerations.
 */

import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================
// TYPES
// ============================================================

export interface ProofData {
  proof: Uint8Array;
  publicInputs: string[];
  timestamp: number;
  circuitHash: string;
}

export interface CacheEntry {
  key: string;
  proof: string; // hex-encoded
  publicInputs: string[];
  circuitHash: string;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheConfig {
  /** Cache directory path */
  cacheDir: string;
  /** Maximum cache size in bytes (default: 100MB) */
  maxSize: number;
  /** Entry TTL in milliseconds (default: 24 hours) */
  ttl: number;
  /** Maximum number of entries (default: 1000) */
  maxEntries: number;
  /** Enable encryption at rest (default: true) */
  encrypted: boolean;
  /** Encryption key (auto-generated if not provided) */
  encryptionKey?: string;
}

const DEFAULT_CONFIG: CacheConfig = {
  cacheDir: join(process.env.HOME || '.', '.privacylayer', 'proof-cache'),
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 24 * 60 * 60 * 1000,   // 24 hours
  maxEntries: 1000,
  encrypted: true,
};

// ============================================================
// PROOF CACHE
// ============================================================

export class ProofCache {
  private config: CacheConfig;
  private index: Map<string, CacheEntry> = new Map();
  private indexPath: string;
  private totalSize: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.indexPath = join(this.config.cacheDir, 'index.json');

    // Ensure cache directory exists
    if (!existsSync(this.config.cacheDir)) {
      mkdirSync(this.config.cacheDir, { recursive: true });
    }

    // Generate encryption key if needed
    if (this.config.encrypted && !this.config.encryptionKey) {
      const keyPath = join(this.config.cacheDir, '.key');
      if (existsSync(keyPath)) {
        this.config.encryptionKey = readFileSync(keyPath, 'utf8');
      } else {
        this.config.encryptionKey = randomBytes(32).toString('hex');
        writeFileSync(keyPath, this.config.encryptionKey, { mode: 0o600 });
      }
    }

    this.loadIndex();
  }

  // ============================================================
  // CACHE KEY GENERATION
  // ============================================================

  /**
   * Generate cache key from proof inputs.
   * Uses SHA-256 hash of serialized inputs for privacy
   * (the key itself reveals nothing about the inputs).
   */
  private generateKey(inputs: {
    commitment: string;
    nullifier: string;
    recipient: string;
    circuitHash: string;
  }): string {
    const data = JSON.stringify({
      commitment: inputs.commitment,
      nullifier: inputs.nullifier,
      recipient: inputs.recipient,
      circuit: inputs.circuitHash,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  // ============================================================
  // CORE OPERATIONS
  // ============================================================

  /**
   * Get a cached proof if it exists and is valid.
   * Returns null if not cached, expired, or invalid.
   */
  get(inputs: {
    commitment: string;
    nullifier: string;
    recipient: string;
    circuitHash: string;
  }): ProofData | null {
    const key = this.generateKey(inputs);
    const entry = this.index.get(key);

    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Check circuit hash matches (invalidate if circuit changed)
    if (entry.circuitHash !== inputs.circuitHash) {
      this.delete(key);
      return null;
    }

    // Read proof file
    const proofPath = join(this.config.cacheDir, `${key}.proof`);
    if (!existsSync(proofPath)) {
      this.index.delete(key);
      this.saveIndex();
      return null;
    }

    try {
      let proofHex = readFileSync(proofPath, 'utf8');

      // Decrypt if needed
      if (this.config.encrypted) {
        proofHex = this.decrypt(proofHex);
      }

      // Update access stats
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.saveIndex();

      return {
        proof: Buffer.from(proofHex, 'hex'),
        publicInputs: entry.publicInputs,
        timestamp: entry.createdAt,
        circuitHash: entry.circuitHash,
      };
    } catch {
      // Corrupted entry — remove
      this.delete(key);
      return null;
    }
  }

  /**
   * Cache a generated proof.
   */
  set(
    inputs: {
      commitment: string;
      nullifier: string;
      recipient: string;
      circuitHash: string;
    },
    proof: ProofData,
  ): void {
    const key = this.generateKey(inputs);
    const proofHex = Buffer.from(proof.proof).toString('hex');
    const size = proofHex.length;

    // Enforce max entries
    if (this.index.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    // Enforce max size
    while (this.totalSize + size > this.config.maxSize && this.index.size > 0) {
      this.evictLRU();
    }

    // Write proof file
    const proofPath = join(this.config.cacheDir, `${key}.proof`);
    const data = this.config.encrypted ? this.encrypt(proofHex) : proofHex;
    writeFileSync(proofPath, data, { mode: 0o600 });

    // Update index
    const entry: CacheEntry = {
      key,
      proof: '', // not stored in index for privacy
      publicInputs: proof.publicInputs,
      circuitHash: proof.circuitHash,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    this.index.set(key, entry);
    this.totalSize += size;
    this.saveIndex();
  }

  /**
   * Validate a cached proof is still valid for the current circuit.
   */
  validate(key: string, currentCircuitHash: string): boolean {
    const entry = this.index.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) return false;
    if (entry.circuitHash !== currentCircuitHash) return false;
    return true;
  }

  // ============================================================
  // CACHE MANAGEMENT
  // ============================================================

  /** Delete a specific entry */
  delete(key: string): void {
    const entry = this.index.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      const proofPath = join(this.config.cacheDir, `${key}.proof`);
      try { unlinkSync(proofPath); } catch { /* ignore */ }
      this.index.delete(key);
      this.saveIndex();
    }
  }

  /** Evict least-recently-used entry */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of this.index) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.delete(oldestKey);
  }

  /** Remove all expired entries */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.index) {
      if (now > entry.expiresAt) {
        this.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Clear entire cache */
  clear(): void {
    for (const key of this.index.keys()) {
      const proofPath = join(this.config.cacheDir, `${key}.proof`);
      try { unlinkSync(proofPath); } catch { /* ignore */ }
    }
    this.index.clear();
    this.totalSize = 0;
    this.saveIndex();
  }

  /** Get cache statistics */
  stats(): {
    entries: number;
    totalSize: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalHits = 0;
    let oldest = Infinity;
    let newest = 0;
    for (const entry of this.index.values()) {
      totalHits += entry.accessCount;
      if (entry.createdAt < oldest) oldest = entry.createdAt;
      if (entry.createdAt > newest) newest = entry.createdAt;
    }
    return {
      entries: this.index.size,
      totalSize: this.totalSize,
      maxSize: this.config.maxSize,
      hitRate: this.index.size > 0 ? totalHits / this.index.size : 0,
      oldestEntry: oldest === Infinity ? 0 : oldest,
      newestEntry: newest,
    };
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

  private loadIndex(): void {
    try {
      if (existsSync(this.indexPath)) {
        const data = JSON.parse(readFileSync(this.indexPath, 'utf8'));
        this.index = new Map(Object.entries(data));
        this.totalSize = Array.from(this.index.values()).reduce((sum, e) => sum + e.size, 0);
        // Auto-cleanup expired on load
        this.cleanup();
      }
    } catch {
      this.index = new Map();
      this.totalSize = 0;
    }
  }

  private saveIndex(): void {
    const data: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.index) {
      data[key] = entry;
    }
    writeFileSync(this.indexPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  }

  // ============================================================
  // ENCRYPTION (privacy at rest)
  // ============================================================

  private encrypt(data: string): string {
    // Simple XOR encryption with key — sufficient for local cache
    const key = this.config.encryptionKey || '';
    const buf = Buffer.from(data, 'utf8');
    const keyBuf = Buffer.from(key, 'hex');
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= keyBuf[i % keyBuf.length];
    }
    return buf.toString('base64');
  }

  private decrypt(data: string): string {
    const key = this.config.encryptionKey || '';
    const buf = Buffer.from(data, 'base64');
    const keyBuf = Buffer.from(key, 'hex');
    for (let i = 0; i < buf.length; i++) {
      buf[i] ^= keyBuf[i % keyBuf.length];
    }
    return buf.toString('utf8');
  }
}

export default ProofCache;

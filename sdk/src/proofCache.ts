import type { Groth16Proof } from './proof';

/**
 * 缓存条目
 */
export interface ProofCacheEntry {
  proof: Groth16Proof;
  cachedAt: number;
  ttl?: number; // 可选 TTL（毫秒）
}

/**
 * 缓存 Key 的稳定输入
 * 这些值的任何变化都应该生成新的 proof
 */
export interface ProofCacheKey {
  nullifier: string;
  root: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
}

/**
 * 生成缓存 key - 使用规范的 JSON 字符串确保稳定性
 */
export function createCacheKey(input: ProofCacheKey): string {
  return JSON.stringify({
    nullifier: input.nullifier,
    root: input.root,
    recipient: input.recipient,
    amount: input.amount,
    relayer: input.relayer,
    fee: input.fee,
  });
}

/**
 * 从 PreparedWitness 提取缓存 key
 */
export function cacheKeyFromWitness(witness: {
  nullifier: string;
  root: string;
  recipient: string;
  amount: string;
  relayer: string;
  fee: string;
}): string {
  return createCacheKey({
    nullifier: witness.nullifier,
    root: witness.root,
    recipient: witness.recipient,
    amount: witness.amount,
    relayer: witness.relayer,
    fee: witness.fee,
  });
}

/**
 * Proof 缓存接口
 */
export interface ProofCache {
  get(key: string): Groth16Proof | undefined;
  set(key: string, proof: Groth16Proof, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}

/**
 * 内存中的 LRU Proof 缓存实现
 */
export class InMemoryProofCache implements ProofCache {
  private cache: Map<string, ProofCacheEntry> = new Map();
  private maxSize: number;
  private defaultTtl?: number;

  constructor(maxSize: number = 100, defaultTtl?: number) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  get(key: string): Groth16Proof | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // 检查 TTL
    if (entry.ttl && Date.now() - entry.cachedAt > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU: 移动到末尾（最后删除）
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.proof;
  }

  set(key: string, proof: Groth16Proof, ttl?: number): void {
    // 超过最大容量时删除最旧的（第一个）
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      proof,
      cachedAt: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * 默认的全局缓存实例（可以在应用启动时配置）
 */
export const defaultProofCache = new InMemoryProofCache(100);

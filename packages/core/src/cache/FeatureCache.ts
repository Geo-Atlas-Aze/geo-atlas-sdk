import { LruCache } from './LruCache.js';

export interface CachedFeature<TFeature = unknown> {
  readonly id: string;
  readonly feature: TFeature;
  readonly bytes: number;
}

/**
 * LRU feature cache with reference counting and memory cleanup.
 */
export class FeatureCache<TFeature = unknown> {
  private readonly lru: LruCache<CachedFeature<TFeature>>;
  private readonly refCounts = new Map<string, number>();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(maxEntries = 10_000, maxBytes = 64 * 1024 * 1024) {
    this.lru = new LruCache(maxEntries, maxBytes, (value) => value.bytes);
  }

  get hits(): number {
    return this.cacheHits;
  }

  get misses(): number {
    return this.cacheMisses;
  }

  has(id: string): boolean {
    return this.lru.has(id);
  }

  get(id: string): CachedFeature<TFeature> | undefined {
    const value = this.lru.get(id);
    if (!value) {
      this.cacheMisses += 1;
      return undefined;
    }
    this.cacheHits += 1;
    return value;
  }

  set(id: string, feature: TFeature, bytes: number): CachedFeature<TFeature> {
    const cached: CachedFeature<TFeature> = { id, feature, bytes };
    this.lru.set(id, cached);
    this.refCounts.set(id, (this.refCounts.get(id) ?? 0) + 1);
    return cached;
  }

  retain(id: string): void {
    if (!this.lru.has(id)) {
      return;
    }
    this.refCounts.set(id, (this.refCounts.get(id) ?? 0) + 1);
  }

  release(id: string): void {
    const next = (this.refCounts.get(id) ?? 0) - 1;
    if (next <= 0) {
      this.refCounts.delete(id);
      this.lru.delete(id);
      return;
    }
    this.refCounts.set(id, next);
  }

  cleanup(): number {
    let removed = 0;
    for (const id of [...this.refCounts.keys()]) {
      if ((this.refCounts.get(id) ?? 0) <= 0) {
        this.refCounts.delete(id);
        if (this.lru.delete(id)) {
          removed += 1;
        }
      }
    }
    return removed;
  }

  clear(): void {
    this.lru.clear();
    this.refCounts.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

import {
  type DatasetKey,
  type DatasetLoaderFn,
  type DatasetRegistryEntry,
  serializeDatasetKey,
} from './types.js';

/**
 * Central registry for dataset artifacts with deduplication and reference counting.
 */
export class DatasetManager {
  private readonly registry = new Map<string, DatasetRegistryEntry>();
  private readonly inflight = new Map<string, Promise<string>>();
  private readonly versions = new Map<string, string>();

  get size(): number {
    return this.registry.size;
  }

  trackVersion(iso2: string, version: string): void {
    this.versions.set(iso2.toUpperCase(), version);
  }

  getTrackedVersion(iso2: string): string | undefined {
    return this.versions.get(iso2.toUpperCase());
  }

  has(key: DatasetKey): boolean {
    return this.registry.has(serializeDatasetKey(key));
  }

  get(key: DatasetKey): string | undefined {
    const serialized = serializeDatasetKey(key);
    const entry = this.registry.get(serialized);
    if (!entry) {
      return undefined;
    }
    entry.refCount += 1;
    return entry.data;
  }

  async load(key: DatasetKey, loader: DatasetLoaderFn, signal?: AbortSignal): Promise<string> {
    const serialized = serializeDatasetKey(key);
    const cached = this.registry.get(serialized);
    if (cached) {
      cached.refCount += 1;
      return cached.data;
    }

    const pending = this.inflight.get(serialized);
    if (pending) {
      const data = await pending;
      const entry = this.registry.get(serialized);
      if (entry) {
        entry.refCount += 1;
      }
      return data;
    }

    const promise = loader(key, signal)
      .then((data) => {
        const bytes = new TextEncoder().encode(data).byteLength;
        this.registry.set(serialized, {
          key: serialized,
          data,
          bytes,
          loadedAt: Date.now(),
          refCount: 1,
        });
        this.trackVersion(key.iso2, key.version);
        return data;
      })
      .finally(() => {
        this.inflight.delete(serialized);
      });

    this.inflight.set(serialized, promise);
    return promise;
  }

  async preload(
    keys: readonly DatasetKey[],
    loader: DatasetLoaderFn,
    signal?: AbortSignal,
  ): Promise<void> {
    await Promise.all(keys.map((key) => this.load(key, loader, signal)));
  }

  unload(key: DatasetKey): boolean {
    const serialized = serializeDatasetKey(key);
    const entry = this.registry.get(serialized);
    if (!entry) {
      return false;
    }
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      this.registry.delete(serialized);
      return true;
    }
    return false;
  }

  async reload(key: DatasetKey, loader: DatasetLoaderFn, signal?: AbortSignal): Promise<string> {
    const serialized = serializeDatasetKey(key);
    this.registry.delete(serialized);
    this.inflight.delete(serialized);
    return this.load(key, loader, signal);
  }

  clear(): void {
    this.registry.clear();
    this.inflight.clear();
    this.versions.clear();
  }
}

/** Shared singleton for browser sessions. */
export const globalDatasetManager = new DatasetManager();

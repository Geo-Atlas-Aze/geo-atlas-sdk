export interface MemoryLayerRecord {
  readonly layerId: string;
  readonly sourceId: string;
  readonly bytes: number;
  lastUsedAt: number;
}

export interface MemoryDatasetRecord {
  readonly key: string;
  readonly bytes: number;
  refCount: number;
}

export interface MemoryStats {
  readonly activeDatasets: number;
  readonly loadedFeatures: number;
  readonly memoryEstimateBytes: number;
  readonly unusedLayers: number;
  readonly unusedSources: number;
}

/**
 * Tracks memory usage for datasets, features, layers, and sources.
 */
export class MemoryManager {
  private readonly datasets = new Map<string, MemoryDatasetRecord>();
  private readonly features = new Map<string, number>();
  private readonly layers = new Map<string, MemoryLayerRecord>();
  private readonly sources = new Map<string, number>();

  trackDataset(key: string, bytes: number): void {
    const existing = this.datasets.get(key);
    if (existing) {
      existing.refCount += 1;
      return;
    }
    this.datasets.set(key, { key, bytes, refCount: 1 });
  }

  releaseDataset(key: string): void {
    const existing = this.datasets.get(key);
    if (!existing) {
      return;
    }
    existing.refCount -= 1;
    if (existing.refCount <= 0) {
      this.datasets.delete(key);
    }
  }

  trackFeature(id: string, bytes: number): void {
    this.features.set(id, bytes);
  }

  trackLayer(layerId: string, sourceId: string, bytes: number): void {
    this.layers.set(layerId, {
      layerId,
      sourceId,
      bytes,
      lastUsedAt: Date.now(),
    });
    this.sources.set(sourceId, (this.sources.get(sourceId) ?? 0) + bytes);
  }

  touchLayer(layerId: string): void {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.lastUsedAt = Date.now();
    }
  }

  getStats(): MemoryStats {
    const now = Date.now();
    const staleThreshold = 60_000;
    let unusedLayers = 0;
    for (const layer of this.layers.values()) {
      if (now - layer.lastUsedAt > staleThreshold) {
        unusedLayers += 1;
      }
    }

    const memoryEstimateBytes =
      [...this.datasets.values()].reduce((sum, item) => sum + item.bytes, 0) +
      [...this.features.values()].reduce((sum, bytes) => sum + bytes, 0) +
      [...this.layers.values()].reduce((sum, item) => sum + item.bytes, 0);

    return Object.freeze({
      activeDatasets: this.datasets.size,
      loadedFeatures: this.features.size,
      memoryEstimateBytes,
      unusedLayers,
      unusedSources: this.sources.size,
    });
  }

  cleanup(): { datasets: number; features: number; layers: number } {
    const now = Date.now();
    const staleThreshold = 60_000;
    let removedLayers = 0;
    for (const [layerId, layer] of this.layers) {
      if (now - layer.lastUsedAt > staleThreshold) {
        this.layers.delete(layerId);
        removedLayers += 1;
      }
    }
    const removedFeatures = this.features.size;
    this.features.clear();
    const removedDatasets = [...this.datasets.values()].filter((item) => item.refCount <= 0).length;
    for (const [key, item] of this.datasets) {
      if (item.refCount <= 0) {
        this.datasets.delete(key);
      }
    }
    return {
      datasets: removedDatasets,
      features: removedFeatures,
      layers: removedLayers,
    };
  }

  clear(): void {
    this.datasets.clear();
    this.features.clear();
    this.layers.clear();
    this.sources.clear();
  }
}

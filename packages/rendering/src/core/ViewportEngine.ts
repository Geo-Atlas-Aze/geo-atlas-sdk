import type { Bounds } from '../types.js';

/** Viewport padding multiplier for prefetch. */
const VIEWPORT_PREFETCH_RATIO = 0.15;

function boundsToBox(bounds: Bounds) {
  return {
    minLng: bounds[0][0],
    minLat: bounds[0][1],
    maxLng: bounds[1][0],
    maxLat: bounds[1][1],
  };
}

function expandBounds(bounds: Bounds, ratio: number): Bounds {
  const west = bounds[0][0];
  const south = bounds[0][1];
  const east = bounds[1][0];
  const north = bounds[1][1];
  const lngPad = (east - west) * ratio;
  const latPad = (north - south) * ratio;
  return Object.freeze([
    Object.freeze([west - lngPad, south - latPad] as const),
    Object.freeze([east + lngPad, north + latPad] as const),
  ] as const);
}

export interface ViewportState {
  readonly bounds: Bounds;
  readonly expandedBounds: Bounds;
  readonly zoom: number;
  readonly visibleFeatureIds: readonly string[];
  readonly visibleTileKeys: readonly string[];
}

export type ViewportListener = (state: ViewportState) => void;

/**
 * Tracks viewport bounds and emits debounced updates for streaming renderers.
 */
export class ViewportEngine {
  private bounds: Bounds | null = null;
  private zoom = 0;
  private visibleFeatureIds: readonly string[] = Object.freeze([]);
  private visibleTileKeys: readonly string[] = Object.freeze([]);
  private readonly cache = new Map<string, ViewportState>();
  private readonly listeners = new Set<ViewportListener>();

  get current(): ViewportState | null {
    if (!this.bounds) {
      return null;
    }
    return this.snapshot();
  }

  update(bounds: Bounds, zoom: number, visibleFeatureIds: readonly string[] = []): ViewportState {
    this.bounds = bounds;
    this.zoom = zoom;
    this.visibleFeatureIds = Object.freeze([...visibleFeatureIds]);
    this.visibleTileKeys = Object.freeze(this.computeTileKeys(bounds));
    const state = this.snapshot();
    this.cache.set(this.serializeBounds(bounds), state);
    for (const listener of this.listeners) {
      listener(state);
    }
    return state;
  }

  intersects(bounds: Bounds): boolean {
    if (!this.bounds) {
      return false;
    }
    const current = boundsToBox(this.bounds);
    const target = boundsToBox(bounds);
    return (
      current.minLng <= target.maxLng &&
      current.maxLng >= target.minLng &&
      current.minLat <= target.maxLat &&
      current.maxLat >= target.minLat
    );
  }

  getCached(bounds: Bounds): ViewportState | undefined {
    return this.cache.get(this.serializeBounds(bounds));
  }

  on(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.bounds = null;
    this.visibleFeatureIds = Object.freeze([]);
    this.visibleTileKeys = Object.freeze([]);
    this.cache.clear();
    this.listeners.clear();
  }

  private snapshot(): ViewportState {
    if (!this.bounds) {
      throw new Error('ViewportEngine is not initialized');
    }
    return Object.freeze({
      bounds: this.bounds,
      expandedBounds: expandBounds(this.bounds, VIEWPORT_PREFETCH_RATIO),
      zoom: this.zoom,
      visibleFeatureIds: this.visibleFeatureIds,
      visibleTileKeys: this.visibleTileKeys,
    });
  }

  private computeTileKeys(bounds: Bounds): string[] {
    const box = boundsToBox(bounds);
    const cellSize = 0.5;
    const minLngCell = Math.floor(box.minLng / cellSize);
    const maxLngCell = Math.floor(box.maxLng / cellSize);
    const minLatCell = Math.floor(box.minLat / cellSize);
    const maxLatCell = Math.floor(box.maxLat / cellSize);
    const keys: string[] = [];
    for (let lng = minLngCell; lng <= maxLngCell; lng += 1) {
      for (let lat = minLatCell; lat <= maxLatCell; lat += 1) {
        keys.push(`${lng}:${lat}`);
      }
    }
    return keys;
  }

  private serializeBounds(bounds: Bounds): string {
    return `${bounds[0][0]},${bounds[0][1]},${bounds[1][0]},${bounds[1][1]}`;
  }
}

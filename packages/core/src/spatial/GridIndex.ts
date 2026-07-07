import type { BoundingBox, SpatialFeatureRecord, SpatialSearchResult } from './types.js';

function bboxIntersects(a: BoundingBox, b: BoundingBox): boolean {
  return a.minLng <= b.maxLng && a.maxLng >= b.minLng && a.minLat <= b.maxLat && a.maxLat >= b.minLat;
}

function cellKey(lngCell: number, latCell: number): string {
  return `${lngCell}:${latCell}`;
}

/**
 * Uniform-grid spatial index for fast bounds queries without linear scans.
 */
export class GridIndex<TFeature = unknown> {
  private readonly cellSize: number;
  private readonly features = new Map<string, SpatialFeatureRecord<TFeature>>();
  private readonly cells = new Map<string, Set<string>>();

  constructor(cellSizeDegrees = 0.25) {
    this.cellSize = cellSizeDegrees;
  }

  get size(): number {
    return this.features.size;
  }

  insert(id: string, bbox: BoundingBox, feature: TFeature): void {
    this.remove(id);
    const record: SpatialFeatureRecord<TFeature> = { id, bbox, feature };
    this.features.set(id, record);
    for (const key of this.cellsForBBox(bbox)) {
      const bucket = this.cells.get(key) ?? new Set<string>();
      bucket.add(id);
      this.cells.set(key, bucket);
    }
  }

  remove(id: string): boolean {
    const record = this.features.get(id);
    if (!record) {
      return false;
    }
    for (const key of this.cellsForBBox(record.bbox)) {
      const bucket = this.cells.get(key);
      bucket?.delete(id);
      if (bucket?.size === 0) {
        this.cells.delete(key);
      }
    }
    this.features.delete(id);
    return true;
  }

  search(bounds: BoundingBox): SpatialSearchResult<TFeature> {
    const candidateIds = new Set<string>();
    for (const key of this.cellsForBBox(bounds)) {
      const bucket = this.cells.get(key);
      if (!bucket) {
        continue;
      }
      for (const id of bucket) {
        candidateIds.add(id);
      }
    }

    const records: SpatialFeatureRecord<TFeature>[] = [];
    for (const id of candidateIds) {
      const record = this.features.get(id);
      if (record && bboxIntersects(record.bbox, bounds)) {
        records.push(record);
      }
    }

    return Object.freeze({
      ids: Object.freeze(records.map((record) => record.id)),
      records: Object.freeze(records),
    });
  }

  withinBounds(bounds: BoundingBox): readonly SpatialFeatureRecord<TFeature>[] {
    return this.search(bounds).records;
  }

  nearest(_lng: number, _lat: number): SpatialFeatureRecord<TFeature> | null {
    let best: SpatialFeatureRecord<TFeature> | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const record of this.features.values()) {
      const centerLng = (record.bbox.minLng + record.bbox.maxLng) / 2;
      const centerLat = (record.bbox.minLat + record.bbox.maxLat) / 2;
      const distance = (centerLng - _lng) ** 2 + (centerLat - _lat) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = record;
      }
    }
    return best;
  }

  clear(): void {
    this.features.clear();
    this.cells.clear();
  }

  private cellsForBBox(bbox: BoundingBox): string[] {
    const minLngCell = Math.floor(bbox.minLng / this.cellSize);
    const maxLngCell = Math.floor(bbox.maxLng / this.cellSize);
    const minLatCell = Math.floor(bbox.minLat / this.cellSize);
    const maxLatCell = Math.floor(bbox.maxLat / this.cellSize);
    const keys: string[] = [];
    for (let lng = minLngCell; lng <= maxLngCell; lng += 1) {
      for (let lat = minLatCell; lat <= maxLatCell; lat += 1) {
        keys.push(cellKey(lng, lat));
      }
    }
    return keys;
  }
}

import type { BoundingBox } from '@geoatlas/sdk-core';

import type { GeoJsonCollectionLike, GeoJsonFeatureLike } from './types.js';

const CHUNK_FILE_PATTERN = /^(?<prefix>.+)_part_(?<index>\d{3})\.geojson$/u;

export function isChunkArtifactPath(path: string): boolean {
  return CHUNK_FILE_PATTERN.test(path);
}

export function listChunkArtifactPaths(basePath: string, count: number): readonly string[] {
  const prefix = basePath.replace(/\.geojson$/u, '');
  return Object.freeze(
    Array.from({ length: count }, (_, index) => `${prefix}_part_${String(index + 1).padStart(3, '0')}.geojson`),
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function extendBounds(bounds: BoundingBox, lng: number, lat: number): BoundingBox {
  return {
    minLng: Math.min(bounds.minLng, lng),
    minLat: Math.min(bounds.minLat, lat),
    maxLng: Math.max(bounds.maxLng, lng),
    maxLat: Math.max(bounds.maxLat, lat),
  };
}

function walkCoordinates(coordinates: unknown, bounds: BoundingBox): BoundingBox {
  if (!Array.isArray(coordinates)) {
    return bounds;
  }
  if (coordinates.length >= 2 && isNumber(coordinates[0]) && isNumber(coordinates[1])) {
    return extendBounds(bounds, coordinates[0], coordinates[1]);
  }
  let next = bounds;
  for (const part of coordinates) {
    next = walkCoordinates(part, next);
  }
  return next;
}

export function computeFeatureBBox(feature: GeoJsonFeatureLike): BoundingBox | null {
  if (!feature.geometry) {
    return null;
  }
  const initial: BoundingBox = {
    minLng: Number.POSITIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };
  const bbox = walkCoordinates(feature.geometry.coordinates, initial);
  if (!Number.isFinite(bbox.minLng)) {
    return null;
  }
  return bbox;
}

export function splitCollectionIntoChunks(
  collection: GeoJsonCollectionLike,
  baseArtifactPath: string,
  cellSize = 0.5,
): Map<string, GeoJsonCollectionLike> {
  const buckets = new Map<string, GeoJsonFeatureLike[]>();

  collection.features.forEach((feature, index) => {
    const bbox = computeFeatureBBox(feature);
    if (!bbox) {
      return;
    }
    const lngCell = Math.floor(((bbox.minLng + bbox.maxLng) / 2) / cellSize);
    const latCell = Math.floor(((bbox.minLat + bbox.maxLat) / 2) / cellSize);
    const chunkId = `${lngCell}_${latCell}`;
    const bucket = buckets.get(chunkId) ?? [];
    bucket.push({
      ...feature,
      id: feature.id ?? `${index}`,
    });
    buckets.set(chunkId, bucket);
  });

  const chunks = new Map<string, GeoJsonCollectionLike>();
  for (const [chunkId, features] of buckets) {
    chunks.set(`${baseArtifactPath}#chunk/${chunkId}`, {
      type: 'FeatureCollection',
      features,
    });
  }
  return chunks;
}

export function chunksIntersectingBounds(
  chunkBounds: ReadonlyMap<string, BoundingBox>,
  viewport: BoundingBox,
): readonly string[] {
  const matches: string[] = [];
  for (const [chunkId, bbox] of chunkBounds) {
    if (
      bbox.minLng <= viewport.maxLng &&
      bbox.maxLng >= viewport.minLng &&
      bbox.minLat <= viewport.maxLat &&
      bbox.maxLat >= viewport.minLat
    ) {
      matches.push(chunkId);
    }
  }
  return Object.freeze(matches);
}

export function mergeCollections(
  collections: readonly GeoJsonCollectionLike[],
): GeoJsonCollectionLike {
  const features: GeoJsonFeatureLike[] = [];
  for (const collection of collections) {
    features.push(...collection.features);
  }
  return {
    type: 'FeatureCollection',
    features,
  };
}

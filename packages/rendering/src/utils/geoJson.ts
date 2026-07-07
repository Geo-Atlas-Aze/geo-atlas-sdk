import type { Bounds, GeoJsonData, GeoJsonFeature, GeoJsonFeatureCollection } from '../types.js';

function isFeatureCollection(data: GeoJsonData): data is GeoJsonFeatureCollection {
  return data.type === 'FeatureCollection';
}

function isFeature(data: GeoJsonData): data is GeoJsonFeature {
  return data.type === 'Feature';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function extendBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  lng: number,
  lat: number,
): void {
  bounds.minLng = Math.min(bounds.minLng, lng);
  bounds.minLat = Math.min(bounds.minLat, lat);
  bounds.maxLng = Math.max(bounds.maxLng, lng);
  bounds.maxLat = Math.max(bounds.maxLat, lat);
}

function walkCoordinates(
  coordinates: unknown,
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
): void {
  if (!Array.isArray(coordinates)) {
    return;
  }

  if (coordinates.length >= 2 && isNumber(coordinates[0]) && isNumber(coordinates[1])) {
    extendBounds(bounds, coordinates[0], coordinates[1]);
    return;
  }

  for (const part of coordinates) {
    walkCoordinates(part, bounds);
  }
}

/**
 * Computes axis-aligned bounds from a GeoJSON payload.
 */
export function computeBoundsFromGeoJson(data: GeoJsonData): Bounds | null {
  const bounds = {
    minLng: Number.POSITIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };

  if (isFeatureCollection(data)) {
    for (const feature of data.features) {
      if (feature.geometry) {
        walkCoordinates(feature.geometry.coordinates, bounds);
      }
    }
  } else if (isFeature(data)) {
    if (data.geometry) {
      walkCoordinates(data.geometry.coordinates, bounds);
    }
  } else {
    walkCoordinates(data.coordinates, bounds);
  }

  if (!Number.isFinite(bounds.minLng) || !Number.isFinite(bounds.minLat)) {
    return null;
  }

  return Object.freeze([
    Object.freeze([bounds.minLng, bounds.minLat] as const),
    Object.freeze([bounds.maxLng, bounds.maxLat] as const),
  ] as const);
}

/**
 * Parses a GeoJSON artifact string from the dataset loader.
 */
export function parseGeoJsonArtifact(raw: string): GeoJsonData {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
    throw new Error('Invalid GeoJSON artifact');
  }
  return parsed as GeoJsonData;
}

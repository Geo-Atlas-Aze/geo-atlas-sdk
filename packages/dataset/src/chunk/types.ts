import type { BoundingBox } from '@geoatlas/sdk-core';

/** Virtual or CDN chunk descriptor. */
export interface DatasetChunkDescriptor {
  readonly id: string;
  readonly artifactPath: string;
  readonly bbox: BoundingBox;
}

export interface ChunkManifest {
  readonly baseArtifactPath: string;
  readonly chunks: readonly DatasetChunkDescriptor[];
}

export interface GeoJsonFeatureLike {
  readonly type: 'Feature';
  readonly geometry: {
    readonly type: string;
    readonly coordinates: unknown;
  } | null;
  readonly properties?: Record<string, unknown> | null;
  readonly id?: string | number;
}

export interface GeoJsonCollectionLike {
  readonly type: 'FeatureCollection';
  readonly features: readonly GeoJsonFeatureLike[];
}

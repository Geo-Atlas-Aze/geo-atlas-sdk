export type CountryCode = string;

export type LngLat = readonly [longitude: number, latitude: number];

export type LayerPreset =
  | 'administrative'
  | 'roads'
  | 'pois'
  | 'boundaries'
  | 'transport';

export interface GeoAtlasRepositoryConfig {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

export interface GeoAtlasDatasetRef {
  readonly iso2: string;
  readonly version: string;
  readonly baseUrl: string;
}

export interface GeoAtlasLatestPointer {
  readonly iso2: string;
  readonly version: string;
  readonly publishedAt: string;
  readonly url: string;
}

export const DEFAULT_GEOATLAS_REPOSITORY: GeoAtlasRepositoryConfig = Object.freeze({
  owner: 'Geo-Atlas-Aze',
  repo: 'geo-datasets',
  branch: 'main',
});

export const DEFAULT_FETCH_POLICY = Object.freeze({
  maxRetries: 3,
  backoffMs: [500, 2000, 8000] as const,
  retryOn: [408, 429, 500, 502, 503, 504] as const,
  timeoutMs: 30_000,
});

export type FetchPolicy = typeof DEFAULT_FETCH_POLICY;

export type CdnHostKind = 'jsdelivr' | 'github-raw';

export interface CdnHostConfig {
  readonly kind: CdnHostKind;
  readonly buildBaseUrl: (repo: GeoAtlasRepositoryConfig, datasetPath: string) => string;
}

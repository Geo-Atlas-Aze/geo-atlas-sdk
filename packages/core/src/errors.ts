export type GeoAtlasErrorCode =
  | 'DATASET_NOT_FOUND'
  | 'CHECKSUM_MISMATCH'
  | 'CDN_UNAVAILABLE'
  | 'UNSUPPORTED_COUNTRY'
  | 'OFFLINE_CACHE_MISS'
  | 'ARTIFACT_NOT_ALLOWED';

export class GeoAtlasError extends Error {
  readonly code: GeoAtlasErrorCode;
  readonly cause?: unknown;

  constructor(code: GeoAtlasErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'GeoAtlasError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class DatasetLoadError extends GeoAtlasError {
  constructor(code: GeoAtlasErrorCode, message: string, cause?: unknown) {
    super(code, message, cause);
    this.name = 'DatasetLoadError';
  }
}

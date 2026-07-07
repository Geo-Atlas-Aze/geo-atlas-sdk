import type { GeoAtlasDatasetRef } from '../types.js';

/** Unique dataset artifact identity. */
export interface DatasetKey {
  readonly iso2: string;
  readonly version: string;
  readonly artifactPath: string;
}

export function buildDatasetKey(
  ref: GeoAtlasDatasetRef,
  artifactPath: string,
): DatasetKey {
  return Object.freeze({
    iso2: ref.iso2,
    version: ref.version,
    artifactPath,
  });
}

export function serializeDatasetKey(key: DatasetKey): string {
  return `${key.iso2}:${key.version}:${key.artifactPath}`;
}

export interface DatasetRegistryEntry {
  readonly key: string;
  readonly data: string;
  readonly bytes: number;
  readonly loadedAt: number;
  refCount: number;
}

export type DatasetLoaderFn = (key: DatasetKey, signal?: AbortSignal) => Promise<string>;

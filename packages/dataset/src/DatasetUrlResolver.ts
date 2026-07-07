import type { GeoAtlasDatasetRef, GeoAtlasRepositoryConfig } from '@geoatlas/sdk-core';
import { DEFAULT_GEOATLAS_REPOSITORY } from '@geoatlas/sdk-core';

import { buildJsDelivrDatasetUrl } from './CdnHosts.js';

export function buildLatestJsonUrl(repo: GeoAtlasRepositoryConfig, iso2: string): string {
  return `${buildJsDelivrDatasetUrl(repo.owner, repo.repo, repo.branch, iso2.toLowerCase())}/latest.json`;
}

export function buildDatasetBaseUrl(
  repo: GeoAtlasRepositoryConfig,
  iso2: string,
  version: string,
): string {
  return buildJsDelivrDatasetUrl(
    repo.owner,
    repo.repo,
    repo.branch,
    `${iso2.toLowerCase()}/v${version}`,
  );
}

export function resolveDatasetRef(options: {
  readonly iso2: string;
  readonly version: string;
  readonly repo?: GeoAtlasRepositoryConfig;
  readonly baseUrl?: string;
}): GeoAtlasDatasetRef {
  const repo = options.repo ?? DEFAULT_GEOATLAS_REPOSITORY;
  const baseUrl = (
    options.baseUrl ?? buildDatasetBaseUrl(repo, options.iso2, options.version)
  ).replace(/\/+$/, '');

  return Object.freeze({
    iso2: options.iso2.toUpperCase(),
    version: options.version,
    baseUrl,
  });
}

export function resolveArtifactUrl(dataset: GeoAtlasDatasetRef, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${dataset.baseUrl}/${normalized}`;
}

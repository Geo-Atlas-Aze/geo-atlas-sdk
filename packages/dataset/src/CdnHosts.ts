import type { CdnHostConfig, GeoAtlasRepositoryConfig } from '@geoatlas/sdk-core';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

export const JSDELIVR_HOST: CdnHostConfig = Object.freeze({
  kind: 'jsdelivr',
  buildBaseUrl(repo: GeoAtlasRepositoryConfig, datasetPath: string): string {
    const path = normalizePath(datasetPath);
    return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@${repo.branch}/${path}`;
  },
});

export const GITHUB_RAW_HOST: CdnHostConfig = Object.freeze({
  kind: 'github-raw',
  buildBaseUrl(repo: GeoAtlasRepositoryConfig, datasetPath: string): string {
    const path = normalizePath(datasetPath);
    return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${path}`;
  },
});

export const DEFAULT_CDN_HOSTS: readonly CdnHostConfig[] = Object.freeze([
  JSDELIVR_HOST,
  GITHUB_RAW_HOST,
]);

export function buildJsDelivrDatasetUrl(
  owner: string,
  repo: string,
  branch: string,
  datasetPath: string,
): string {
  return JSDELIVR_HOST.buildBaseUrl({ owner, repo, branch }, datasetPath);
}

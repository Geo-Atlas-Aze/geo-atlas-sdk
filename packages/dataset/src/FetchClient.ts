import {
  DatasetLoadError,
  DEFAULT_FETCH_POLICY,
  type CdnHostConfig,
  type FetchPolicy,
  type GeoAtlasDatasetRef,
  type GeoAtlasRepositoryConfig,
} from '@geoatlas/sdk-core';

import { assertArtifactPathAllowed } from './ArtifactAllowlist.js';
import { DEFAULT_CDN_HOSTS } from './CdnHosts.js';
import { resolveArtifactUrl } from './DatasetUrlResolver.js';

export interface FetchClientOptions {
  readonly fetchImpl?: typeof fetch;
  readonly policy?: FetchPolicy;
  readonly hosts?: readonly CdnHostConfig[];
  readonly repo?: GeoAtlasRepositoryConfig;
  readonly verifyChecksums?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms: number): number {
  const jitter = ms * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(ms + jitter));
}

function isRetryableStatus(status: number, policy: FetchPolicy): boolean {
  return (policy.retryOn as readonly number[]).includes(status);
}

export class FetchClient {
  private readonly fetchImpl: typeof fetch;
  private readonly policy: FetchPolicy;
  private readonly hosts: readonly CdnHostConfig[];
  private readonly repo: GeoAtlasRepositoryConfig | undefined;

  constructor(options: FetchClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.policy = options.policy ?? DEFAULT_FETCH_POLICY;
    this.hosts = options.hosts ?? DEFAULT_CDN_HOSTS;
    this.repo = options.repo;
  }

  async fetchText(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url);
    return response.text();
  }

  async fetchArtifact(
    dataset: GeoAtlasDatasetRef,
    relativePath: string,
  ): Promise<string> {
    assertArtifactPathAllowed(relativePath);

    const primaryUrl = resolveArtifactUrl(dataset, relativePath);
    let lastError: unknown;

    for (const host of this.hosts) {
      const url =
        host.kind === 'jsdelivr'
          ? primaryUrl
          : this.buildFallbackUrl(dataset, relativePath, host);

      try {
        return await this.fetchText(url);
      } catch (error) {
        lastError = error;
      }
    }

    throw new DatasetLoadError(
      'CDN_UNAVAILABLE',
      `Failed to fetch artifact: ${relativePath}`,
      lastError,
    );
  }

  private buildFallbackUrl(
    dataset: GeoAtlasDatasetRef,
    relativePath: string,
    host: CdnHostConfig,
  ): string {
    if (!this.repo) {
      return resolveArtifactUrl(dataset, relativePath);
    }
    const iso2 = dataset.iso2.toLowerCase();
    const datasetPath = `${iso2}/v${dataset.version}/${relativePath}`;
    return host.buildBaseUrl(this.repo, datasetPath);
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.policy.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url);
        if (response.ok) {
          return response;
        }
        if (!isRetryableStatus(response.status, this.policy) || attempt === this.policy.maxRetries) {
          throw new DatasetLoadError(
            response.status === 404 ? 'DATASET_NOT_FOUND' : 'CDN_UNAVAILABLE',
            `HTTP ${response.status} for ${url}`,
          );
        }
      } catch (error) {
        lastError = error;
        if (error instanceof DatasetLoadError && error.code === 'DATASET_NOT_FOUND') {
          throw error;
        }
        if (attempt === this.policy.maxRetries) {
          break;
        }
      }

      const backoff = this.policy.backoffMs[attempt] ?? this.policy.backoffMs.at(-1) ?? 1000;
      await sleep(withJitter(backoff));
    }

    throw new DatasetLoadError('CDN_UNAVAILABLE', `Failed to fetch ${url}`, lastError);
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.policy.timeoutMs);
    try {
      return await this.fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

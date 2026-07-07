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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function linkAbortSignals(signals: readonly AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
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

  async fetchText(url: string, signal?: AbortSignal): Promise<string> {
    const response = await this.fetchWithRetry(url, signal);
    return response.text();
  }

  async fetchArtifact(
    dataset: GeoAtlasDatasetRef,
    relativePath: string,
    signal?: AbortSignal,
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
        return await this.fetchText(url, signal);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
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

  private async fetchWithRetry(url: string, externalSignal?: AbortSignal): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.policy.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, externalSignal);
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
        if (isAbortError(error)) {
          throw error;
        }
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

  private async fetchWithTimeout(url: string, externalSignal?: AbortSignal): Promise<Response> {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), this.policy.timeoutMs);
    const signal = externalSignal
      ? linkAbortSignals([externalSignal, timeoutController.signal])
      : timeoutController.signal;
    try {
      return await this.fetchImpl(url, { signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_GEOATLAS_REPOSITORY } from '@geoatlas/sdk-core';

import { FetchClient } from '../src/FetchClient.ts';
import { GITHUB_RAW_HOST, JSDELIVR_HOST } from '../src/CdnHosts.ts';
import { resolveDatasetRef } from '../src/DatasetUrlResolver.ts';

describe('FetchClient', () => {
  it('retries on 503 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('error', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const client = new FetchClient({
      fetchImpl,
      policy: {
        maxRetries: 2,
        backoffMs: [1, 1],
        retryOn: [503],
        timeoutMs: 5000,
      },
      hosts: [JSDELIVR_HOST],
    });

    const text = await client.fetchText('https://example.com/data.json');
    expect(text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('falls back to github raw host', async () => {
    const ref = resolveDatasetRef({ iso2: 'AZ', version: '1.0.0' });
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('primary down'))
      .mockResolvedValueOnce(new Response('geojson', { status: 200 }));

    const client = new FetchClient({
      fetchImpl,
      hosts: [JSDELIVR_HOST, GITHUB_RAW_HOST],
      repo: DEFAULT_GEOATLAS_REPOSITORY,
      policy: {
        maxRetries: 0,
        backoffMs: [1],
        retryOn: [],
        timeoutMs: 5000,
      },
    });

    const text = await client.fetchArtifact(ref, 'datasets/geometry/boundaries.geojson');
    expect(text).toBe('geojson');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]?.[0]).toContain('raw.githubusercontent.com');
  });

  it('throws DATASET_NOT_FOUND on 404 without retry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }));
    const client = new FetchClient({
      fetchImpl,
      policy: {
        maxRetries: 3,
        backoffMs: [1, 1, 1],
        retryOn: [503],
        timeoutMs: 5000,
      },
      hosts: [JSDELIVR_HOST],
    });

    await expect(client.fetchText('https://example.com/missing.json')).rejects.toMatchObject({
      code: 'DATASET_NOT_FOUND',
    });
  });
});

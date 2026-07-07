import { describe, expect, it } from 'vitest';

import { DatasetLoader } from '../src/DatasetLoader.ts';
import { resolveLayerArtifacts } from '../src/profiles/az.profile.ts';

describe('DatasetLoader', () => {
  it('rejects unsupported country', () => {
    const loader = new DatasetLoader();
    expect(() => loader.resolve('TR', '1.0.0')).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_COUNTRY' }),
    );
  });

  it('resolves AZ default layer artifacts under 2MB budget paths', () => {
    const paths = resolveLayerArtifacts(['administrative', 'roads']);
    expect(paths).toContain('datasets/geometry/boundaries.geojson');
    expect(paths).toContain('datasets/geometry/roads.geojson');
    expect(paths.some((p) => p.includes('search'))).toBe(false);
    expect(paths.length).toBeLessThanOrEqual(10);
  });

  it('loads artifacts via mock fetch', async () => {
    const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      return new Response(`payload:${href}`, { status: 200 });
    };

    const loader = new DatasetLoader({ fetchImpl, verifyChecksums: false });
    const ref = loader.resolve('AZ', '1.0.0');
    const artifacts = await loader.loadArtifacts(ref, ['roads']);

    expect(Object.keys(artifacts).length).toBeGreaterThan(0);
    expect(artifacts['datasets/geometry/roads.geojson']).toContain('roads.geojson');
  });
});

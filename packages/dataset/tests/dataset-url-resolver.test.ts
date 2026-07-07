import { describe, expect, it } from 'vitest';

import { isArtifactPathAllowed } from '../src/ArtifactAllowlist.ts';
import {
  buildDatasetBaseUrl,
  buildLatestJsonUrl,
  resolveArtifactUrl,
  resolveDatasetRef,
} from '../src/DatasetUrlResolver.ts';

describe('DatasetUrlResolver', () => {
  it('builds jsDelivr latest.json URL', () => {
    expect(buildLatestJsonUrl({ owner: 'Geo-Atlas-Aze', repo: 'geo-datasets', branch: 'main' }, 'AZ')).toBe(
      'https://cdn.jsdelivr.net/gh/Geo-Atlas-Aze/geo-datasets@main/az/latest.json',
    );
  });

  it('builds versioned dataset base URL', () => {
    expect(
      buildDatasetBaseUrl({ owner: 'Geo-Atlas-Aze', repo: 'geo-datasets', branch: 'main' }, 'AZ', '1.0.0'),
    ).toBe('https://cdn.jsdelivr.net/gh/Geo-Atlas-Aze/geo-datasets@main/az/v1.0.0');
  });

  it('resolves dataset ref with uppercase iso2', () => {
    const ref = resolveDatasetRef({ iso2: 'az', version: '1.0.0' });
    expect(ref.iso2).toBe('AZ');
    expect(ref.version).toBe('1.0.0');
    expect(ref.baseUrl).toContain('/az/v1.0.0');
  });

  it('resolves artifact URL', () => {
    const ref = resolveDatasetRef({ iso2: 'AZ', version: '1.0.0' });
    expect(resolveArtifactUrl(ref, 'datasets/geometry/boundaries.geojson')).toBe(
      `${ref.baseUrl}/datasets/geometry/boundaries.geojson`,
    );
  });
});

describe('ArtifactAllowlist', () => {
  it('allows MVP geometry paths', () => {
    expect(isArtifactPathAllowed('datasets/geometry/boundaries.geojson')).toBe(true);
    expect(isArtifactPathAllowed('datasets/administrative/cities.json')).toBe(true);
  });

  it('blocks search and lookup paths', () => {
    expect(isArtifactPathAllowed('datasets/search/search-index.json')).toBe(false);
    expect(isArtifactPathAllowed('datasets/lookup/id-map.json')).toBe(false);
    expect(isArtifactPathAllowed('datasets/hierarchy.json')).toBe(false);
  });
});

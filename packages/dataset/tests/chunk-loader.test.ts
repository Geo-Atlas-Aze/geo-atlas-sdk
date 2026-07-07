import { describe, expect, it } from 'vitest';

import { splitCollectionIntoChunks } from '../src/chunk/geoJsonChunks.js';

describe('chunk geoJsonChunks', () => {
  it('splits a feature collection into virtual viewport chunks', () => {
    const collection = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point', coordinates: [47.1, 40.1] },
          properties: {},
        },
        {
          type: 'Feature' as const,
          geometry: { type: 'Point', coordinates: [49.5, 41.2] },
          properties: {},
        },
      ],
    };

    const chunks = splitCollectionIntoChunks(collection, 'datasets/geometry/roads.geojson', 1);
    expect(chunks.size).toBeGreaterThan(1);
  });
});

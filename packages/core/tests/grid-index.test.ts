import { describe, expect, it } from 'vitest';

import { GridIndex } from '../src/spatial/GridIndex.js';

describe('GridIndex', () => {
  it('searches features within bounds without linear scan', () => {
    const index = new GridIndex(1);
    index.insert('a', { minLng: 46, minLat: 39, maxLng: 47, maxLat: 40 }, { id: 'a' });
    index.insert('b', { minLng: 50, minLat: 41, maxLng: 51, maxLat: 42 }, { id: 'b' });

    const result = index.search({
      minLng: 45.5,
      minLat: 38.5,
      maxLng: 47.5,
      maxLat: 40.5,
    });

    expect(result.ids).toEqual(['a']);
  });
});

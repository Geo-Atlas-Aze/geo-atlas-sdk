import { describe, expect, it, vi } from 'vitest';

import { DatasetManager } from '../src/dataset/DatasetManager.js';
import { buildDatasetKey } from '../src/dataset/types.js';

describe('DatasetManager', () => {
  it('deduplicates concurrent loads', async () => {
    const manager = new DatasetManager();
    const loader = vi.fn(async () => '{"ok":true}');
    const key = buildDatasetKey({ iso2: 'AZ', version: '1.0.0', baseUrl: 'https://cdn.test/az/v1.0.0/' }, 'datasets/manifest.json');

    const [first, second] = await Promise.all([
      manager.load(key, loader),
      manager.load(key, loader),
    ]);

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

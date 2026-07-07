import { describe, expect, it } from 'vitest';

import { DEFAULT_CONTROLS } from '../src/constants.js';
import { resolveControlOptions, resolveDatasetVersion } from '../src/utils.js';

describe('react utils', () => {
  it('resolves latest version to pinned fallback', () => {
    expect(resolveDatasetVersion('latest')).toBe('1.0.0');
    expect(resolveDatasetVersion('1.0.1')).toBe('1.0.1');
  });

  it('maps control presets to renderer flags', () => {
    expect(resolveControlOptions(DEFAULT_CONTROLS)).toEqual({
      navigationControl: true,
      attributionControl: true,
    });
    expect(resolveControlOptions(['attribution'])).toEqual({
      navigationControl: false,
      attributionControl: true,
    });
  });
});

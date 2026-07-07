import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GeoAtlasMap } from '../src/GeoAtlasMap.js';

describe('GeoAtlasMap SSR', () => {
  it('renders an accessible container on the server without throwing', () => {
    const html = renderToString(<GeoAtlasMap country="AZ" version="1.0.0" />);
    expect(html).toContain('role="application"');
    expect(html).toContain('Interactive GeoAtlas map');
  });
});

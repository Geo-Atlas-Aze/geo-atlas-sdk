import type { StyleSpecification } from 'maplibre-gl';

/**
 * Empty MapLibre style used by GeoAtlas.
 * No raster tiles — only GeoJSON layers added at runtime.
 */
export const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'geoatlas-empty',
  sources: {},
  layers: [],
};

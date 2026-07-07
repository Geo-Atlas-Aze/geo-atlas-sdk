import type { LayerPreset } from '@geoatlas/sdk-core';

/** Default Azerbaijan map configuration. */
export const GEOATLAS_AZ_DEFAULTS = Object.freeze({
  country: 'AZ' as const,
  version: '1.0.0' as const,
  initialCenter: Object.freeze([47.5769, 40.1431] as const),
  initialZoom: 7,
  layers: Object.freeze(['administrative', 'roads'] as const satisfies readonly LayerPreset[]),
});

/** Default UI controls shown on the map. */
export const DEFAULT_CONTROLS = Object.freeze(['zoom', 'attribution'] as const);

/** Fallback dataset version when `latest` is requested before remote resolution exists. */
export const LATEST_DATASET_VERSION_FALLBACK = '1.0.0' as const;

/** Accessibility labels for map controls. */
export const A11Y_LABELS = Object.freeze({
  map: 'Interactive GeoAtlas map',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
} as const);

/** CSS class names used by MapLibre controls for a11y enhancement. */
export const MAPLIBRE_CONTROL_SELECTORS = Object.freeze({
  zoomIn: '.maplibregl-ctrl-zoom-in',
  zoomOut: '.maplibregl-ctrl-zoom-out',
} as const);

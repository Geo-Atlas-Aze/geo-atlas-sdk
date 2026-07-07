/** Default attribution string required by OSM ODbL. */
export const ATTRIBUTION_TEXT = '© OpenStreetMap contributors | GeoAtlas' as const;

/** MapLibre source identifiers. */
export const SOURCE_IDS = Object.freeze({
  BOUNDARIES: 'geoatlas-boundaries',
  ROADS: 'geoatlas-roads',
} as const);

/** MapLibre layer identifiers. */
export const LAYER_IDS = Object.freeze({
  BOUNDARIES_FILL: 'geoatlas-boundaries-fill',
  BOUNDARIES_LINE: 'geoatlas-boundaries-outline',
  ROADS_LINE: 'geoatlas-roads-line',
} as const);

/** Dataset artifact paths resolved by {@link DatasetLoader}. */
export const DATASET_ARTIFACT_PATHS = Object.freeze({
  BOUNDARIES: 'datasets/geometry/boundaries.geojson',
  ROADS: 'datasets/geometry/roads.geojson',
} as const);

/** Default layer paint values for administrative boundaries. */
export const BOUNDARY_PAINT = Object.freeze({
  fillColor: '#4a90d9',
  fillOpacity: 0.12,
  lineColor: '#2c5f8a',
  lineWidth: 2,
} as const);

/** Default layer paint values for roads. */
export const ROAD_PAINT = Object.freeze({
  lineColor: '#e85d04',
  lineWidth: 1.5,
} as const);

/** Default fly-to animation duration in milliseconds. */
export const DEFAULT_FLY_DURATION_MS = 1_500 as const;

/** Azerbaijan default viewport when bounds cannot be computed. */
export const AZ_DEFAULT_VIEW = Object.freeze({
  center: [47.5769, 40.1431] as const,
  zoom: 7,
} as const);

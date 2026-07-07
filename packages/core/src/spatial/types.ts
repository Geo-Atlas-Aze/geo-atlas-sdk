/** Axis-aligned bounding box in WGS84 degrees. */
export interface BoundingBox {
  readonly minLng: number;
  readonly minLat: number;
  readonly maxLng: number;
  readonly maxLat: number;
}

/** Feature record stored in a spatial index. */
export interface SpatialFeatureRecord<TFeature = unknown> {
  readonly id: string;
  readonly bbox: BoundingBox;
  readonly feature: TFeature;
}

/** Result of a spatial bounds query. */
export interface SpatialSearchResult<TFeature = unknown> {
  readonly ids: readonly string[];
  readonly records: readonly SpatialFeatureRecord<TFeature>[];
}

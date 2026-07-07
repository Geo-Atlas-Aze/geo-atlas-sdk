import type { LngLat } from '@geoatlas/sdk-core';

/** Geographic bounding box as southwest and northeast corners. */
export type Bounds = readonly [southwest: LngLat, northeast: LngLat];

/** Padding applied when fitting the camera to bounds. */
export interface PaddingOptions {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

/** Minimal GeoJSON geometry for renderer sources. */
export interface GeoJsonGeometry {
  readonly type: string;
  readonly coordinates: unknown;
}

/** Minimal GeoJSON feature for renderer sources. */
export interface GeoJsonFeature {
  readonly type: 'Feature';
  readonly geometry: GeoJsonGeometry | null;
  readonly properties?: Record<string, unknown> | null;
  readonly id?: string | number;
}

/** Minimal GeoJSON feature collection for renderer sources. */
export interface GeoJsonFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly GeoJsonFeature[];
}

/** GeoJSON payloads accepted by GeoJSON sources. */
export type GeoJsonData = GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry;

/** Supported renderer layer kinds for M1. */
export type LayerKind = 'fill' | 'line' | 'circle';

/** Base layer definition shared by all layer kinds. */
export interface BaseLayerDefinition {
  readonly id: string;
  readonly sourceId: string;
  readonly kind: LayerKind;
  readonly visible?: boolean;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

/** Paint options for fill layers. */
export interface FillPaintOptions {
  readonly fillColor?: string;
  readonly fillOpacity?: number;
  readonly fillOutlineColor?: string;
}

/** Paint options for line layers. */
export interface LinePaintOptions {
  readonly lineColor?: string;
  readonly lineWidth?: number;
  readonly lineOpacity?: number;
}

/** Paint options for circle layers. */
export interface CirclePaintOptions {
  readonly circleColor?: string;
  readonly circleRadius?: number;
  readonly circleOpacity?: number;
}

/** Fill layer definition. */
export interface FillLayerDefinition extends BaseLayerDefinition {
  readonly kind: 'fill';
  readonly paint?: FillPaintOptions;
}

/** Line layer definition. */
export interface LineLayerDefinition extends BaseLayerDefinition {
  readonly kind: 'line';
  readonly paint?: LinePaintOptions;
}

/** Circle layer definition. */
export interface CircleLayerDefinition extends BaseLayerDefinition {
  readonly kind: 'circle';
  readonly paint?: CirclePaintOptions;
}

/** Discriminated union of supported layer definitions. */
export type LayerDefinition = FillLayerDefinition | LineLayerDefinition | CircleLayerDefinition;

/** GeoJSON source definition. */
export interface GeoJsonSourceDefinition {
  readonly id: string;
  readonly type: 'geojson';
  readonly data: GeoJsonData;
}

/** Source definitions supported by the renderer contract. */
export type SourceDefinition = GeoJsonSourceDefinition;

/** Options passed when initializing a renderer instance. */
export interface RendererOptions {
  readonly center?: LngLat;
  readonly zoom?: number;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly bearing?: number;
  readonly pitch?: number;
  readonly attributionControl?: boolean;
  readonly navigationControl?: boolean;
  readonly attributionText?: string;
}

/** Camera animation options for fly-to operations. */
export interface CameraOptions {
  readonly center?: LngLat;
  readonly zoom?: number;
  readonly bearing?: number;
  readonly pitch?: number;
  readonly duration?: number;
  readonly padding?: PaddingOptions;
}

/** Fit-bounds camera options. */
export interface FitBoundsOptions {
  readonly padding?: PaddingOptions;
  readonly duration?: number;
  readonly maxZoom?: number;
}

/** Renderer event types for future engine bindings. */
export type RendererEventType = 'load' | 'click' | 'movestart' | 'moveend' | 'zoomend' | 'error';

/** Base renderer event payload. */
export interface RendererEvent {
  readonly type: RendererEventType;
}

/** Options for creating a map through the package entry helper. */
export interface CreateMapOptions {
  readonly rendererOptions?: RendererOptions;
  readonly verifyChecksums?: boolean;
}

/** Layer visibility state. */
export type LayerVisibility = 'visible' | 'none';

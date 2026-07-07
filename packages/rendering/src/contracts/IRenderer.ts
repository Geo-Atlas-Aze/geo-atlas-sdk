import type { LngLat } from '@geoatlas/sdk-core';

import type {
  Bounds,
  CameraOptions,
  FitBoundsOptions,
  LayerDefinition,
  LayerVisibility,
  RendererEventHandler,
  RendererEventType,
  RendererOptions,
  SourceDefinition,
  Unsubscribe,
  GeoJsonData,
} from '../types.js';

/**
 * Rendering engine abstraction for GeoAtlas maps.
 * Implementations (MapLibre, Leaflet, OpenLayers) must stay adapter-private.
 */
export interface IRenderer {
  /**
   * Creates the map instance inside the given container.
   */
  initialize(container: HTMLElement, options?: RendererOptions): Promise<void>;

  /**
   * Destroys the map instance and releases resources.
   */
  destroy(): void;

  /**
   * Notifies the engine that the container size changed.
   */
  resize(): void;

  /**
   * Animates the camera to the given view.
   */
  flyTo(options: CameraOptions): Promise<void>;

  /**
   * Fits the camera to the given bounds.
   */
  fitBounds(bounds: Bounds, options?: FitBoundsOptions): Promise<void>;

  /**
   * Sets the map center immediately.
   */
  setCenter(center: LngLat): void;

  /**
   * Sets the map zoom level immediately.
   */
  setZoom(zoom: number): void;

  /**
   * Returns the current map center.
   */
  getCenter(): LngLat;

  /**
   * Returns the current zoom level.
   */
  getZoom(): number;

  /**
   * Returns the current visible bounds.
   */
  getBounds(): Bounds;

  /**
   * Registers a data source on the map.
   */
  addSource(definition: SourceDefinition): void;

  /**
   * Removes a data source from the map.
   */
  removeSource(sourceId: string): void;

  /**
   * Returns whether a source is registered.
   */
  hasSource(sourceId: string): boolean;

  /**
   * Adds a styled layer bound to an existing source.
   */
  addLayer(definition: LayerDefinition): void;

  /**
   * Removes a layer from the map.
   */
  removeLayer(layerId: string): void;

  /**
   * Returns whether a layer is registered.
   */
  hasLayer(layerId: string): boolean;

  /**
   * Toggles layer visibility without removing it.
   */
  setLayerVisibility(layerId: string, visibility: LayerVisibility): void;

  /**
   * Updates an existing GeoJSON source payload.
   */
  updateGeoJsonSource(sourceId: string, data: GeoJsonData): void;

  /**
   * Subscribes to renderer lifecycle and interaction events.
   */
  on<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): Unsubscribe;

  /**
   * Removes a previously registered event handler.
   */
  off<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): void;
}

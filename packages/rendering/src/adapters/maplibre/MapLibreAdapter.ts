import type { LngLat } from '@geoatlas/sdk-core';
import type {
  AttributionControl,
  FitBoundsOptions as MapLibreFitBoundsOptions,
  FlyToOptions as MapLibreFlyToOptions,
  Map as MapLibreMap,
  NavigationControl,
} from 'maplibre-gl';

import { ATTRIBUTION_TEXT, AZ_DEFAULT_VIEW } from '../../constants.js';
import type { IRenderer } from '../../contracts/IRenderer.js';
import { DEFAULT_MAP_STYLE } from '../../styles/defaultStyle.js';
import type {
  Bounds,
  CameraOptions,
  CameraState,
  FitBoundsOptions,
  GeoJsonData,
  LayerDefinition,
  LayerVisibility,
  MapClickEvent,
  RendererErrorEvent,
  RendererEventHandler,
  RendererEventMap,
  RendererEventType,
  RendererOptions,
  SourceDefinition,
  Unsubscribe,
} from '../../types.js';

type MapLibreModule = typeof import('maplibre-gl');

function toLngLatLike(center: LngLat): [number, number] {
  return [center[0], center[1]];
}

function toMapLibrePadding(
  padding: FitBoundsOptions['padding'] | CameraOptions['padding'],
): MapLibreFitBoundsOptions['padding'] | undefined {
  if (!padding) {
    return undefined;
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

/**
 * MapLibre GL JS implementation of {@link IRenderer}.
 * All MapLibre-specific code is isolated in this adapter.
 */
export class MapLibreAdapter implements IRenderer {
  private map: MapLibreMap | null = null;
  private maplibregl: MapLibreModule | null = null;
  private navigationControl: NavigationControl | null = null;
  private attributionControl: AttributionControl | null = null;
  private readonly handlers = new Map<RendererEventType, Set<RendererEventHandler<RendererEventType>>>();
  private mapEventsBound = false;

  /** @inheritdoc */
  async initialize(container: HTMLElement, options: RendererOptions = {}): Promise<void> {
    if (this.map) {
      throw new Error('MapLibreAdapter is already initialized');
    }

    const maplibregl = await import('maplibre-gl');
    this.maplibregl = maplibregl;

    const center = options.center ?? AZ_DEFAULT_VIEW.center;
    const zoom = options.zoom ?? AZ_DEFAULT_VIEW.zoom;

    this.map = new maplibregl.Map({
      container,
      style: DEFAULT_MAP_STYLE,
      center: toLngLatLike(center),
      zoom,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 0,
      attributionControl: false,
    });

    await new Promise<void>((resolve, reject) => {
      const map = this.map;
      if (!map) {
        reject(new Error('Map initialization failed'));
        return;
      }

      map.once('load', () => resolve());
      map.once('error', (event) => {
        const message = event.error?.message ?? 'MapLibre initialization error';
        reject(new Error(message));
      });
    });

    if (options.navigationControl ?? true) {
      this.navigationControl = new maplibregl.NavigationControl({ showCompass: false });
      this.map.addControl(this.navigationControl, 'top-right');
    }

    if (options.attributionControl ?? true) {
      this.attributionControl = new maplibregl.AttributionControl({
        customAttribution: options.attributionText ?? ATTRIBUTION_TEXT,
      });
      this.map.addControl(this.attributionControl, 'bottom-right');
    }

    this.bindMapEvents();
    this.emit('load', undefined);
  }

  /** @inheritdoc */
  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.maplibregl = null;
    this.navigationControl = null;
    this.attributionControl = null;
    this.handlers.clear();
    this.mapEventsBound = false;
  }

  /** @inheritdoc */
  resize(): void {
    this.map?.resize();
  }

  /** @inheritdoc */
  async flyTo(options: CameraOptions): Promise<void> {
    const map = this.requireMap();
    const flyOptions: MapLibreFlyToOptions = {
      duration: options.duration,
      bearing: options.bearing,
      pitch: options.pitch,
      padding: toMapLibrePadding(options.padding),
    };

    if (options.center) {
      flyOptions.center = toLngLatLike(options.center);
    }
    if (options.zoom !== undefined) {
      flyOptions.zoom = options.zoom;
    }

    map.flyTo(flyOptions);
    await this.waitForMoveEnd();
  }

  /** @inheritdoc */
  async fitBounds(bounds: Bounds, options: FitBoundsOptions = {}): Promise<void> {
    const map = this.requireMap();
    map.fitBounds(
      [
        [bounds[0][0], bounds[0][1]],
        [bounds[1][0], bounds[1][1]],
      ],
      {
        padding: toMapLibrePadding(options.padding),
        duration: options.duration,
        maxZoom: options.maxZoom,
      },
    );
    await this.waitForMoveEnd();
  }

  /** @inheritdoc */
  setCenter(center: LngLat): void {
    this.requireMap().setCenter(toLngLatLike(center));
  }

  /** @inheritdoc */
  setZoom(zoom: number): void {
    this.requireMap().setZoom(zoom);
  }

  /** @inheritdoc */
  getCenter(): LngLat {
    const center = this.requireMap().getCenter();
    return Object.freeze([center.lng, center.lat] as const);
  }

  /** @inheritdoc */
  getZoom(): number {
    return this.requireMap().getZoom();
  }

  /** @inheritdoc */
  getBounds(): Bounds {
    const bounds = this.requireMap().getBounds();
    return Object.freeze([
      Object.freeze([bounds.getWest(), bounds.getSouth()] as const),
      Object.freeze([bounds.getEast(), bounds.getNorth()] as const),
    ] as const);
  }

  /** @inheritdoc */
  addSource(definition: SourceDefinition): void {
    const map = this.requireMap();
    if (map.getSource(definition.id)) {
      return;
    }

    if (definition.type === 'geojson') {
      map.addSource(definition.id, {
        type: 'geojson',
        data: definition.data as GeoJsonData,
      });
    }
  }

  /** @inheritdoc */
  removeSource(sourceId: string): void {
    const map = this.requireMap();
    if (!map.getSource(sourceId)) {
      return;
    }
    map.removeSource(sourceId);
  }

  /** @inheritdoc */
  hasSource(sourceId: string): boolean {
    return Boolean(this.map?.getSource(sourceId));
  }

  /** @inheritdoc */
  addLayer(definition: LayerDefinition): void {
    const map = this.requireMap();
    if (map.getLayer(definition.id)) {
      return;
    }

    const layout: { visibility: 'visible' | 'none' } = {
      visibility: definition.visible === false ? 'none' : 'visible',
    };

    if (definition.kind === 'fill') {
      map.addLayer({
        id: definition.id,
        type: 'fill',
        source: definition.sourceId,
        minzoom: definition.minZoom,
        maxzoom: definition.maxZoom,
        layout,
        paint: {
          'fill-color': definition.paint?.fillColor ?? '#4a90d9',
          'fill-opacity': definition.paint?.fillOpacity ?? 0.2,
          'fill-outline-color': definition.paint?.fillOutlineColor ?? '#2c5f8a',
        },
      });
      return;
    }

    if (definition.kind === 'line') {
      map.addLayer({
        id: definition.id,
        type: 'line',
        source: definition.sourceId,
        minzoom: definition.minZoom,
        maxzoom: definition.maxZoom,
        layout,
        paint: {
          'line-color': definition.paint?.lineColor ?? '#e85d04',
          'line-width': definition.paint?.lineWidth ?? 1.5,
          'line-opacity': definition.paint?.lineOpacity ?? 1,
        },
      });
      return;
    }

    map.addLayer({
      id: definition.id,
      type: 'circle',
      source: definition.sourceId,
      minzoom: definition.minZoom,
      maxzoom: definition.maxZoom,
      layout,
      paint: {
        'circle-color': definition.paint?.circleColor ?? '#1d4ed8',
        'circle-radius': definition.paint?.circleRadius ?? 4,
        'circle-opacity': definition.paint?.circleOpacity ?? 1,
      },
    });
  }

  /** @inheritdoc */
  removeLayer(layerId: string): void {
    const map = this.requireMap();
    if (!map.getLayer(layerId)) {
      return;
    }
    map.removeLayer(layerId);
  }

  /** @inheritdoc */
  hasLayer(layerId: string): boolean {
    return Boolean(this.map?.getLayer(layerId));
  }

  /** @inheritdoc */
  setLayerVisibility(layerId: string, visibility: LayerVisibility): void {
    const map = this.requireMap();
    if (!map.getLayer(layerId)) {
      return;
    }
    map.setLayoutProperty(layerId, 'visibility', visibility);
  }

  /** @inheritdoc */
  updateGeoJsonSource(sourceId: string, data: GeoJsonData): void {
    const map = this.requireMap();
    const source = map.getSource(sourceId);
    if (!source || !('setData' in source) || typeof source.setData !== 'function') {
      throw new Error(`GeoJSON source not found: ${sourceId}`);
    }
    source.setData(data as GeoJsonData);
  }

  /** @inheritdoc */
  on<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): Unsubscribe {
    const bucket = this.handlers.get(event) ?? new Set<RendererEventHandler<RendererEventType>>();
    bucket.add(handler as RendererEventHandler<RendererEventType>);
    this.handlers.set(event, bucket);
    return () => {
      this.off(event, handler);
    };
  }

  /** @inheritdoc */
  off<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): void {
    const bucket = this.handlers.get(event);
    if (!bucket) {
      return;
    }
    bucket.delete(handler as RendererEventHandler<RendererEventType>);
    if (bucket.size === 0) {
      this.handlers.delete(event);
    }
  }

  private bindMapEvents(): void {
    if (this.mapEventsBound || !this.map) {
      return;
    }

    const map = this.map;
    this.mapEventsBound = true;

    map.on('click', (event) => {
      const payload: MapClickEvent = {
        lngLat: Object.freeze([event.lngLat.lng, event.lngLat.lat] as const),
        point: Object.freeze([event.point.x, event.point.y] as const),
      };
      this.emit('click', payload);
    });

    map.on('movestart', () => {
      this.emit('movestart', this.readCameraState());
    });

    map.on('moveend', () => {
      this.emit('moveend', this.readCameraState());
    });

    map.on('zoomend', () => {
      this.emit('zoomend', this.readCameraState());
    });

    map.on('error', (event) => {
      const payload: RendererErrorEvent = {
        message: event.error?.message ?? 'MapLibre runtime error',
        cause: event.error,
      };
      this.emit('error', payload);
    });
  }

  private readCameraState(): CameraState {
    return {
      center: this.getCenter(),
      zoom: this.getZoom(),
      bounds: this.getBounds(),
    };
  }

  private emit<T extends RendererEventType>(event: T, payload: RendererEventMap[T]): void {
    const bucket = this.handlers.get(event);
    if (!bucket) {
      return;
    }

    for (const handler of bucket) {
      (handler as RendererEventHandler<T>)(payload);
    }
  }

  private requireMap(): MapLibreMap {
    if (!this.map) {
      throw new Error('MapLibreAdapter is not initialized');
    }
    return this.map;
  }

  private waitForMoveEnd(): Promise<void> {
    const map = this.requireMap();
    return new Promise((resolve) => {
      map.once('moveend', () => resolve());
    });
  }
}

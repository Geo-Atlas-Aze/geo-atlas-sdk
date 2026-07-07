import type { LayerPreset, LngLat } from '@geoatlas/sdk-core';
import { DatasetLoader } from '@geoatlas/sdk-dataset';

import {
  AZ_DEFAULT_VIEW,
  BOUNDARY_PAINT,
  DATASET_ARTIFACT_PATHS,
  LAYER_IDS,
  ROAD_PAINT,
  SOURCE_IDS,
} from './constants.js';
import { DebugOverlay } from './core/DebugOverlay.js';
import { ProgressiveRenderer } from './core/ProgressiveRenderer.js';
import type { MemoryStats } from './core/MemoryManager.js';
import type { PerformanceMetrics } from './core/PerformanceMonitor.js';
import type { IRenderer } from './contracts/IRenderer.js';
import type {
  Bounds,
  CameraOptions,
  CreateMapOptions,
  FitBoundsOptions,
  RendererEventHandler,
  RendererEventType,
  RendererOptions,
  Unsubscribe,
} from './types.js';
import { computeBoundsFromGeoJson, parseGeoJsonArtifact } from './utils/geoJson.js';

export interface MapControllerOptions {
  readonly verifyChecksums?: boolean;
  readonly streaming?: boolean;
  readonly debug?: boolean;
}

/**
 * High-level map API that orchestrates dataset loading and renderer commands.
 * Does not depend on any specific rendering engine.
 */
export class MapController {
  private readonly renderer: IRenderer;
  private readonly loader: DatasetLoader;
  private readonly streaming: boolean;
  private readonly debug: boolean;
  private progressive: ProgressiveRenderer | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private viewportUnsubscribe: (() => void) | null = null;
  private container: HTMLElement | null = null;
  private artifacts: Readonly<Record<string, string>> = Object.freeze({});
  private boundariesBounds: Bounds | null = null;
  private activeLayers: readonly LayerPreset[] = Object.freeze([]);

  constructor(renderer: IRenderer, options: MapControllerOptions = {}) {
    this.renderer = renderer;
    this.streaming = options.streaming ?? true;
    this.debug = options.debug === true;
    this.loader = new DatasetLoader({
      verifyChecksums: options.verifyChecksums,
      streaming: this.streaming,
    });
  }

  /**
   * Initializes the underlying renderer inside the provided container.
   */
  async initialize(container: HTMLElement, options?: RendererOptions): Promise<void> {
    this.container = container;
    await this.renderer.initialize(container, options);

    if (!this.streaming) {
      return;
    }

    this.progressive = new ProgressiveRenderer(this.renderer, this.loader.getChunkLoader(), {
      debug: this.debug,
    });
    this.viewportUnsubscribe = this.progressive.bindViewportUpdates((handler) =>
      this.renderer.on('moveend', () => handler()),
    );

    if (this.debug) {
      this.debugOverlay = new DebugOverlay(container);
      this.debugOverlay.setVisible(true);
    }
  }

  /**
   * Loads dataset artifacts for the given country and layer presets.
   */
  async loadDataset(
    iso2: string,
    version: string,
    layers: readonly LayerPreset[] = ['administrative', 'roads'],
    signal?: AbortSignal,
  ): Promise<void> {
    const ref = this.loader.resolve(iso2, version);
    this.artifacts = await this.loader.loadArtifacts(ref, layers, signal);
    this.activeLayers = layers;
    this.progressive?.setDataset(ref, this.artifacts);
  }

  /**
   * Renders administrative boundary polygons from loaded artifacts.
   */
  showAdministrativeBoundaries(): void {
    const raw = this.artifacts[DATASET_ARTIFACT_PATHS.BOUNDARIES];
    if (!raw) {
      throw new Error(`Missing artifact: ${DATASET_ARTIFACT_PATHS.BOUNDARIES}`);
    }

    const data = parseGeoJsonArtifact(raw);
    this.boundariesBounds = computeBoundsFromGeoJson(data);
    this.ensureGeoJsonSource(SOURCE_IDS.BOUNDARIES, data);

    if (!this.renderer.hasLayer(LAYER_IDS.BOUNDARIES_FILL)) {
      this.renderer.addLayer({
        id: LAYER_IDS.BOUNDARIES_FILL,
        sourceId: SOURCE_IDS.BOUNDARIES,
        kind: 'fill',
        paint: {
          fillColor: BOUNDARY_PAINT.fillColor,
          fillOpacity: BOUNDARY_PAINT.fillOpacity,
          fillOutlineColor: BOUNDARY_PAINT.lineColor,
        },
      });
    }

    if (!this.renderer.hasLayer(LAYER_IDS.BOUNDARIES_LINE)) {
      this.renderer.addLayer({
        id: LAYER_IDS.BOUNDARIES_LINE,
        sourceId: SOURCE_IDS.BOUNDARIES,
        kind: 'line',
        paint: {
          lineColor: BOUNDARY_PAINT.lineColor,
          lineWidth: BOUNDARY_PAINT.lineWidth,
        },
      });
    }

    this.renderer.setLayerVisibility(LAYER_IDS.BOUNDARIES_FILL, 'visible');
    this.renderer.setLayerVisibility(LAYER_IDS.BOUNDARIES_LINE, 'visible');
  }

  /**
   * Renders road linework from loaded artifacts.
   */
  showRoads(): void {
    const raw = this.artifacts[DATASET_ARTIFACT_PATHS.ROADS];
    if (!raw) {
      throw new Error(`Missing artifact: ${DATASET_ARTIFACT_PATHS.ROADS}`);
    }

    const data = parseGeoJsonArtifact(raw);
    this.ensureGeoJsonSource(SOURCE_IDS.ROADS, data);

    if (!this.renderer.hasLayer(LAYER_IDS.ROADS_LINE)) {
      this.renderer.addLayer({
        id: LAYER_IDS.ROADS_LINE,
        sourceId: SOURCE_IDS.ROADS,
        kind: 'line',
        paint: {
          lineColor: ROAD_PAINT.lineColor,
          lineWidth: ROAD_PAINT.lineWidth,
        },
      });
    }

    this.renderer.setLayerVisibility(LAYER_IDS.ROADS_LINE, 'visible');
  }

  /**
   * Hides all GeoAtlas-managed layers without destroying the map.
   */
  clear(): void {
    const layerIds = [
      LAYER_IDS.BOUNDARIES_FILL,
      LAYER_IDS.BOUNDARIES_LINE,
      LAYER_IDS.ROADS_LINE,
    ] as const;

    for (const layerId of layerIds) {
      if (this.renderer.hasLayer(layerId)) {
        this.renderer.setLayerVisibility(layerId, 'none');
      }
    }
  }

  /**
   * Fits the camera to the country boundary extent when available.
   */
  async zoomToCountry(options?: FitBoundsOptions): Promise<void> {
    const bounds = this.boundariesBounds ?? this.progressive?.getCountryBounds() ?? null;
    if (bounds) {
      await this.renderer.fitBounds(bounds, {
        padding: { top: 40, right: 40, bottom: 40, left: 40 },
        duration: options?.duration,
        maxZoom: options?.maxZoom ?? 10,
      });
      return;
    }

    await this.renderer.flyTo({
      center: AZ_DEFAULT_VIEW.center,
      zoom: AZ_DEFAULT_VIEW.zoom,
      duration: options?.duration,
    });
  }

  /**
   * Renders layers that match the provided presets.
   */
  async showLayers(layers: readonly LayerPreset[]): Promise<void> {
    this.activeLayers = layers;
    if (this.progressive) {
      await this.progressive.renderLayers(layers);
      this.boundariesBounds = this.progressive.getCountryBounds();
      this.updateDebugOverlay();
      return;
    }

    const layerSet = new Set(layers);
    if (layerSet.has('administrative') || layerSet.has('boundaries')) {
      this.showAdministrativeBoundaries();
    }
    if (layerSet.has('roads') || layerSet.has('transport')) {
      this.showRoads();
    }
  }

  /**
   * Returns collected performance metrics when streaming is enabled.
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.progressive?.getPerformanceMonitor().getMetrics() ?? null;
  }

  /**
   * Returns memory usage statistics when streaming is enabled.
   */
  getMemoryStats(): MemoryStats | null {
    return this.progressive?.getMemoryManager().getStats() ?? null;
  }

  /**
   * Animates the camera to the given view.
   */
  async flyTo(options: CameraOptions): Promise<void> {
    await this.renderer.flyTo(options);
  }

  /**
   * Fits the camera to explicit geographic bounds.
   */
  async fitBounds(bounds: Bounds, options?: FitBoundsOptions): Promise<void> {
    await this.renderer.fitBounds(bounds, options);
  }

  /**
   * Subscribes to renderer events.
   */
  on<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): Unsubscribe {
    return this.renderer.on(event, handler);
  }

  /**
   * Removes a renderer event handler.
   */
  off<T extends RendererEventType>(event: T, handler: RendererEventHandler<T>): void {
    this.renderer.off(event, handler);
  }

  /**
   * Fits the camera to explicit geographic bounds.
   */
  async zoomToBounds(bounds: Bounds, options?: FitBoundsOptions): Promise<void> {
    await this.renderer.fitBounds(bounds, options);
  }

  /**
   * Returns the current map center from the renderer.
   */
  getCenter(): LngLat {
    return this.renderer.getCenter();
  }

  /**
   * Returns the current zoom level from the renderer.
   */
  getZoom(): number {
    return this.renderer.getZoom();
  }

  /**
   * Returns the current visible bounds from the renderer.
   */
  getBounds(): Bounds {
    return this.renderer.getBounds();
  }

  /**
   * Propagates container resize events to the renderer.
   */
  resize(): void {
    this.renderer.resize();
  }

  /**
   * Destroys the map and releases renderer resources.
   */
  destroy(): void {
    this.viewportUnsubscribe?.();
    this.debugOverlay?.destroy();
    this.progressive?.destroy();
    this.loader.abortInflight();
    this.renderer.destroy();
    this.artifacts = Object.freeze({});
    this.boundariesBounds = null;
    this.container = null;
  }

  private updateDebugOverlay(): void {
    if (!this.debugOverlay || !this.progressive) {
      return;
    }
    const metrics = this.progressive.getPerformanceMonitor().getMetrics();
    const memory = this.progressive.getMemoryManager().getStats();
    this.debugOverlay.update(metrics, memory, {
      zoom: this.getZoom(),
      visibleFeatures: metrics.renderedFeatures,
      loadedChunks: metrics.loadedChunks,
      fps: metrics.fps,
      memoryBytes: memory.memoryEstimateBytes,
      renderedLayers: [...this.activeLayers],
    });
  }

  private ensureGeoJsonSource(sourceId: string, data: ReturnType<typeof parseGeoJsonArtifact>): void {
    if (this.renderer.hasSource(sourceId)) {
      this.renderer.updateGeoJsonSource(sourceId, data);
      return;
    }

    this.renderer.addSource({
      id: sourceId,
      type: 'geojson',
      data,
    });
  }
}

/**
 * Creates a map with the default MapLibre renderer adapter.
 */
export async function createMap(
  container: HTMLElement,
  options: CreateMapOptions = {},
): Promise<MapController> {
  const { MapLibreAdapter } = await import('./adapters/maplibre/MapLibreAdapter.js');
  const controller = new MapController(new MapLibreAdapter(), {
    verifyChecksums: options.verifyChecksums,
    streaming: options.streaming,
    debug: options.debug,
  });
  await controller.initialize(container, options.rendererOptions);
  return controller;
}

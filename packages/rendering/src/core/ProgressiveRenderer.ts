import type { LayerPreset } from '@geoatlas/sdk-core';
import { FeatureCache } from '@geoatlas/sdk-core';
import type { ChunkLoader } from '@geoatlas/sdk-dataset';
import type { GeoAtlasDatasetRef } from '@geoatlas/sdk-core';

import {
  BOUNDARY_PAINT,
  DATASET_ARTIFACT_PATHS,
  LAYER_IDS,
  ROAD_PAINT,
  SOURCE_IDS,
} from '../constants.js';
import type { IRenderer } from '../contracts/IRenderer.js';
import type { GeoJsonData } from '../types.js';
import { computeBoundsFromGeoJson, parseGeoJsonArtifact } from '../utils/geoJson.js';
import { MemoryManager } from './MemoryManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { RenderQueue } from './RenderQueue.js';
import { ViewportEngine } from './ViewportEngine.js';

export interface ProgressiveRendererOptions {
  readonly debug?: boolean;
}

/**
 * Progressive layer renderer with viewport-aware chunk loading.
 */
export class ProgressiveRenderer {
  private readonly renderer: IRenderer;
  private readonly chunkLoader: ChunkLoader;
  private readonly viewport = new ViewportEngine();
  private readonly queue = new RenderQueue();
  private readonly memory = new MemoryManager();
  private readonly performance: PerformanceMonitor;
  private readonly featureCache = new FeatureCache<GeoJsonData>();
  private datasetRef: GeoAtlasDatasetRef | null = null;
  private artifacts: Readonly<Record<string, string>> = Object.freeze({});
  private boundariesBounds: ReturnType<typeof computeBoundsFromGeoJson> = null;
  private abortController: AbortController | null = null;
  private readonly debug: boolean;

  constructor(
    renderer: IRenderer,
    chunkLoader: ChunkLoader,
    options: ProgressiveRendererOptions = {},
  ) {
    this.renderer = renderer;
    this.chunkLoader = chunkLoader;
    this.debug = options.debug === true;
    this.performance = new PerformanceMonitor(this.debug);
  }

  getViewportEngine(): ViewportEngine {
    return this.viewport;
  }

  getMemoryManager(): MemoryManager {
    return this.memory;
  }

  getPerformanceMonitor(): PerformanceMonitor {
    return this.performance;
  }

  setDataset(ref: GeoAtlasDatasetRef, artifacts: Readonly<Record<string, string>>): void {
    this.datasetRef = ref;
    this.artifacts = artifacts;
    for (const [path, raw] of Object.entries(artifacts)) {
      this.memory.trackDataset(path, new TextEncoder().encode(raw).byteLength);
    }
  }

  async renderLayers(layers: readonly LayerPreset[]): Promise<void> {
    const generation = this.queue.currentGeneration;
    const startedAt = performance.now();

    if (layers.some((layer) => layer === 'administrative' || layer === 'boundaries')) {
      await this.renderBoundaries(generation);
    }
    if (layers.some((layer) => layer === 'roads' || layer === 'transport')) {
      await this.renderRoads(generation);
    }

    this.performance.recordRender(performance.now() - startedAt, this.featureCache.hits);
    this.performance.recordMemory(this.memory.getStats().memoryEstimateBytes);
    if (this.debug) {
      this.performance.logTable();
    }
  }

  bindViewportUpdates(
    subscribeMoveEnd: (handler: () => void) => () => void,
  ): () => void {
    const unsubscribeMove = subscribeMoveEnd(() => {
      const bounds = this.renderer.getBounds();
      const zoom = this.renderer.getZoom();
      this.viewport.update(bounds, zoom);
      this.queue.scheduleViewportUpdate(async (generation) => {
        await this.refreshRoadsForViewport(generation);
      });
    });
    const unsubscribeViewport = this.viewport.on(() => {
      this.abortController?.abort();
      this.abortController = new AbortController();
    });
    return () => {
      unsubscribeMove();
      unsubscribeViewport();
    };
  }

  destroy(): void {
    this.abortController?.abort();
    this.queue.clear();
    this.viewport.clear();
    this.memory.clear();
    this.performance.destroy();
    this.featureCache.clear();
    this.datasetRef = null;
    this.artifacts = Object.freeze({});
    this.boundariesBounds = null;
  }

  getCountryBounds(): ReturnType<typeof computeBoundsFromGeoJson> {
    return this.boundariesBounds;
  }

  private async renderBoundaries(generation: number): Promise<void> {
    this.queue.enqueue({
      id: 'layer:boundaries',
      priority: 'boundaries',
      generation,
      run: async () => {
        const raw = this.artifacts[DATASET_ARTIFACT_PATHS.BOUNDARIES];
        if (!raw) {
          return;
        }
        const data = parseGeoJsonArtifact(raw);
        this.boundariesBounds = computeBoundsFromGeoJson(data);
        this.ensureGeoJsonSource(SOURCE_IDS.BOUNDARIES, data);
        this.ensureBoundaryLayers();
      },
    });
    await this.queue.flush();
  }

  private async renderRoads(generation: number): Promise<void> {
    this.queue.enqueue({
      id: 'layer:roads',
      priority: 'roads',
      generation,
      run: async () => {
        await this.refreshRoadsForViewport(generation);
      },
    });
    await this.queue.flush();
  }

  private async refreshRoadsForViewport(generation: number): Promise<void> {
    if (!this.datasetRef || generation !== this.queue.currentGeneration) {
      return;
    }
    const viewport = this.viewport.current ?? {
      bounds: this.renderer.getBounds(),
      expandedBounds: this.renderer.getBounds(),
      zoom: this.renderer.getZoom(),
      visibleFeatureIds: Object.freeze([]),
      visibleTileKeys: Object.freeze([]),
    };

    const controller = new AbortController();
    this.abortController = controller;
    const startedAt = performance.now();
    try {
      const collection = await this.chunkLoader.loadChunksForViewport(
        this.datasetRef,
        DATASET_ARTIFACT_PATHS.ROADS,
        {
          minLng: viewport.expandedBounds[0][0],
          minLat: viewport.expandedBounds[0][1],
          maxLng: viewport.expandedBounds[1][0],
          maxLat: viewport.expandedBounds[1][1],
        },
        controller.signal,
      );

      const data = collection as GeoJsonData;
      this.featureCache.set(SOURCE_IDS.ROADS, data, JSON.stringify(data).length);
      this.performance.recordCache(true);
      this.ensureGeoJsonSource(SOURCE_IDS.ROADS, data);
      this.ensureRoadLayer();
      this.performance.recordChunks(collection.features.length);
      this.performance.recordRender(performance.now() - startedAt, collection.features.length);
      this.memory.trackLayer(LAYER_IDS.ROADS_LINE, SOURCE_IDS.ROADS, JSON.stringify(data).length);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      throw error;
    }
  }

  private ensureGeoJsonSource(sourceId: string, data: GeoJsonData): void {
    if (this.renderer.hasSource(sourceId)) {
      this.renderer.updateGeoJsonSource(sourceId, data);
      return;
    }
    this.renderer.addSource({ id: sourceId, type: 'geojson', data });
    this.memory.trackFeature(sourceId, JSON.stringify(data).length);
  }

  private ensureBoundaryLayers(): void {
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

  private ensureRoadLayer(): void {
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
    this.memory.touchLayer(LAYER_IDS.ROADS_LINE);
  }
}

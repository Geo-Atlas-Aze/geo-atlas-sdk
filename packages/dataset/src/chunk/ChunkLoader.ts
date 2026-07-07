import {
  buildDatasetKey,
  globalDatasetManager,
  type BoundingBox,
  type GeoAtlasDatasetRef,
} from '@geoatlas/sdk-core';

import type { FetchClient } from '../FetchClient.js';
import {
  chunksIntersectingBounds,
  computeFeatureBBox,
  isChunkArtifactPath,
  listChunkArtifactPaths,
  mergeCollections,
  splitCollectionIntoChunks,
} from './geoJsonChunks.js';
import type { ChunkManifest, DatasetChunkDescriptor, GeoJsonCollectionLike } from './types.js';

export interface ChunkLoaderOptions {
  readonly fetchClient: FetchClient;
  readonly cellSize?: number;
  readonly maxRemoteChunkProbe?: number;
}

/**
 * Loads large GeoJSON artifacts in viewport-aware chunks.
 */
export class ChunkLoader {
  private readonly fetchClient: FetchClient;
  private readonly cellSize: number;
  private readonly maxRemoteChunkProbe: number;
  private readonly virtualChunks = new Map<string, Map<string, GeoJsonCollectionLike>>();
  private readonly chunkBounds = new Map<string, BoundingBox>();

  constructor(options: ChunkLoaderOptions) {
    this.fetchClient = options.fetchClient;
    this.cellSize = options.cellSize ?? 0.5;
    this.maxRemoteChunkProbe = options.maxRemoteChunkProbe ?? 32;
  }

  async loadArtifact(ref: GeoAtlasDatasetRef, artifactPath: string, signal?: AbortSignal): Promise<string> {
    const key = buildDatasetKey(ref, artifactPath);
    return globalDatasetManager.load(key, async (datasetKey, abortSignal) => {
      return this.fetchClient.fetchArtifact(ref, datasetKey.artifactPath, abortSignal);
    }, signal);
  }

  async loadChunksForViewport(
    ref: GeoAtlasDatasetRef,
    artifactPath: string,
    viewport: BoundingBox,
    signal?: AbortSignal,
  ): Promise<GeoJsonCollectionLike> {
    const manifest = await this.resolveManifest(ref, artifactPath, signal);
    const visibleChunkIds = chunksIntersectingBounds(
      new Map(manifest.chunks.map((chunk) => [chunk.id, chunk.bbox])),
      viewport,
    );

    const collections: GeoJsonCollectionLike[] = [];
    for (const chunkId of visibleChunkIds) {
      const chunk = manifest.chunks.find((item) => item.id === chunkId);
      if (!chunk) {
        continue;
      }
      const raw = await this.loadChunk(ref, chunk, signal);
      collections.push(JSON.parse(raw) as GeoJsonCollectionLike);
    }

    return mergeCollections(collections);
  }

  getChunkBounds(artifactPath: string): ReadonlyMap<string, BoundingBox> {
    const bounds = new Map<string, BoundingBox>();
    for (const [chunkId, bbox] of this.chunkBounds) {
      if (chunkId.startsWith(`${artifactPath}#`)) {
        bounds.set(chunkId, bbox);
      }
    }
    return bounds;
  }

  private async resolveManifest(
    ref: GeoAtlasDatasetRef,
    artifactPath: string,
    signal?: AbortSignal,
  ): Promise<ChunkManifest> {
    const remoteChunks = await this.probeRemoteChunks(ref, artifactPath, signal);
    if (remoteChunks.length > 0) {
      return {
        baseArtifactPath: artifactPath,
        chunks: remoteChunks,
      };
    }

    const virtual = await this.ensureVirtualChunks(ref, artifactPath, signal);
    const chunks: DatasetChunkDescriptor[] = [];
    for (const [chunkId, collection] of virtual) {
      const bbox = this.bboxForCollection(collection);
      if (!bbox) {
        continue;
      }
      chunks.push({
        id: chunkId,
        artifactPath,
        bbox,
      });
      this.chunkBounds.set(chunkId, bbox);
    }
    return {
      baseArtifactPath: artifactPath,
      chunks: Object.freeze(chunks),
    };
  }

  private async probeRemoteChunks(
    ref: GeoAtlasDatasetRef,
    artifactPath: string,
    signal?: AbortSignal,
  ): Promise<readonly DatasetChunkDescriptor[]> {
    const paths = listChunkArtifactPaths(artifactPath, this.maxRemoteChunkProbe);
    const found: DatasetChunkDescriptor[] = [];

    for (const path of paths) {
      if (!isChunkArtifactPath(path)) {
        continue;
      }
      try {
        const raw = await this.loadArtifact(ref, path, signal);
        const collection = JSON.parse(raw) as GeoJsonCollectionLike;
        const bbox = this.bboxForCollection(collection);
        if (!bbox) {
          continue;
        }
        found.push({
          id: path,
          artifactPath: path,
          bbox,
        });
      } catch {
        if (found.length === 0) {
          break;
        }
      }
    }

    return Object.freeze(found);
  }

  private async ensureVirtualChunks(
    ref: GeoAtlasDatasetRef,
    artifactPath: string,
    signal?: AbortSignal,
  ): Promise<Map<string, GeoJsonCollectionLike>> {
    const existing = this.virtualChunks.get(artifactPath);
    if (existing) {
      return existing;
    }

    const raw = await this.loadArtifact(ref, artifactPath, signal);
    const collection = JSON.parse(raw) as GeoJsonCollectionLike;
    const chunks = splitCollectionIntoChunks(collection, artifactPath, this.cellSize);
    this.virtualChunks.set(artifactPath, chunks);
    return chunks;
  }

  private async loadChunk(
    ref: GeoAtlasDatasetRef,
    chunk: DatasetChunkDescriptor,
    signal?: AbortSignal,
  ): Promise<string> {
    if (isChunkArtifactPath(chunk.id)) {
      return this.loadArtifact(ref, chunk.id, signal);
    }

    const virtual = await this.ensureVirtualChunks(ref, chunk.artifactPath, signal);
    const collection = virtual.get(chunk.id);
    if (!collection) {
      throw new Error(`Missing virtual chunk: ${chunk.id}`);
    }
    return JSON.stringify(collection);
  }

  private bboxForCollection(collection: GeoJsonCollectionLike): BoundingBox | null {
    let bbox: BoundingBox | null = null;
    for (const feature of collection.features) {
      const featureBBox = computeFeatureBBox(feature);
      if (!featureBBox) {
        continue;
      }
      bbox = bbox
        ? {
            minLng: Math.min(bbox.minLng, featureBBox.minLng),
            minLat: Math.min(bbox.minLat, featureBBox.minLat),
            maxLng: Math.max(bbox.maxLng, featureBBox.maxLng),
            maxLat: Math.max(bbox.maxLat, featureBBox.maxLat),
          }
        : featureBBox;
    }
    return bbox;
  }
}

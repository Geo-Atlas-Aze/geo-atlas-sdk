import type { GeoAtlasDatasetRef, LayerPreset } from '@geoatlas/sdk-core';
import { DatasetLoadError, buildDatasetKey, globalDatasetManager } from '@geoatlas/sdk-core';

import { ChunkLoader } from './chunk/ChunkLoader.js';
import { resolveLayerArtifacts, isCountrySupported } from './profiles/az.profile.js';
import { resolveDatasetRef } from './DatasetUrlResolver.js';
import { FetchClient, type FetchClientOptions } from './FetchClient.js';

export interface DatasetLoaderOptions extends FetchClientOptions {
  readonly verifyChecksums?: boolean;
  readonly streaming?: boolean;
}

export class DatasetLoader {
  private readonly fetchClient: FetchClient;
  private readonly chunkLoader: ChunkLoader;
  private readonly verifyChecksums: boolean;
  private readonly streaming: boolean;
  private activeController: AbortController | null = null;

  constructor(options: DatasetLoaderOptions = {}) {
    this.fetchClient = new FetchClient(options);
    this.chunkLoader = new ChunkLoader({ fetchClient: this.fetchClient });
    const isTest = process.env['NODE_ENV'] === 'test';
    this.verifyChecksums = options.verifyChecksums ?? !isTest;
    this.streaming = options.streaming ?? true;
  }

  resolve(iso2: string, version: string): GeoAtlasDatasetRef {
    if (!isCountrySupported(iso2)) {
      throw new DatasetLoadError('UNSUPPORTED_COUNTRY', `Country not supported: ${iso2}`);
    }
    return resolveDatasetRef({ iso2, version });
  }

  async loadArtifacts(
    ref: GeoAtlasDatasetRef,
    layers: readonly LayerPreset[],
    signal?: AbortSignal,
  ): Promise<Readonly<Record<string, string>>> {
    this.abortInflight();
    const controller = new AbortController();
    this.activeController = controller;
    const linkedSignal = signal
      ? this.linkSignals([signal, controller.signal])
      : controller.signal;

    const paths = resolveLayerArtifacts(layers);
    const result: Record<string, string> = {};

    try {
      for (const path of paths) {
        const key = buildDatasetKey(ref, path);
        result[path] = await globalDatasetManager.load(
          key,
          async (datasetKey, abortSignal) =>
            this.fetchClient.fetchArtifact(ref, datasetKey.artifactPath, abortSignal),
          linkedSignal,
        );
      }
      return Object.freeze(result);
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }

  getChunkLoader(): ChunkLoader {
    return this.chunkLoader;
  }

  abortInflight(): void {
    this.activeController?.abort();
    this.activeController = null;
  }

  private linkSignals(signals: readonly AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    return controller.signal;
  }
}

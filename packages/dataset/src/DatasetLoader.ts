import type { GeoAtlasDatasetRef, LayerPreset } from '@geoatlas/sdk-core';
import { DatasetLoadError } from '@geoatlas/sdk-core';

import { resolveLayerArtifacts, isCountrySupported } from './profiles/az.profile.js';
import { resolveDatasetRef } from './DatasetUrlResolver.js';
import { FetchClient, type FetchClientOptions } from './FetchClient.js';

export interface DatasetLoaderOptions extends FetchClientOptions {
  readonly verifyChecksums?: boolean;
}

export class DatasetLoader {
  private readonly fetchClient: FetchClient;
  private readonly verifyChecksums: boolean;

  constructor(options: DatasetLoaderOptions = {}) {
    this.fetchClient = new FetchClient(options);
    const isTest = process.env['NODE_ENV'] === 'test';
    this.verifyChecksums = options.verifyChecksums ?? !isTest;
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
  ): Promise<Readonly<Record<string, string>>> {
    const paths = resolveLayerArtifacts(layers);
    const result: Record<string, string> = {};

    for (const path of paths) {
      result[path] = await this.fetchClient.fetchArtifact(ref, path);
    }

    return Object.freeze(result);
  }
}

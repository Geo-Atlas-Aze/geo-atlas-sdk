import { DatasetLoader } from '@geoatlas/sdk-dataset';

import { resolveDatasetVersion, resolveLayers } from './utils.js';

type ResourceState = 'pending' | 'success' | 'error';

interface DatasetResource {
  read(): void;
}

const resourceCache = new Map<string, DatasetResource>();

function createResource(
  country: string,
  version: string,
  layers: ReturnType<typeof resolveLayers>,
  verifyChecksums?: boolean,
): DatasetResource {
  const loader = new DatasetLoader({ verifyChecksums, streaming: true });
  let state: ResourceState = 'pending';
  let error: unknown;
  const promise = (async () => {
    const ref = loader.resolve(country, resolveDatasetVersion(version));
    await loader.loadArtifacts(ref, layers);
    state = 'success';
  })().catch((cause: unknown) => {
    state = 'error';
    error = cause;
  });

  return {
    read(): void {
      if (state === 'pending') {
        throw promise;
      }
      if (state === 'error') {
        throw error;
      }
    },
  };
}

/**
 * Returns a Suspense-compatible dataset resource for the given map props.
 */
export function getDatasetResource(
  country: string,
  version: string,
  layers: ReturnType<typeof resolveLayers>,
  verifyChecksums?: boolean,
): DatasetResource {
  const key = `${country}:${resolveDatasetVersion(version)}:${layers.join(',')}:${verifyChecksums === true}`;
  const cached = resourceCache.get(key);
  if (cached) {
    return cached;
  }
  const resource = createResource(country, version, layers, verifyChecksums);
  resourceCache.set(key, resource);
  return resource;
}

/**
 * Clears cached Suspense dataset resources (testing helper).
 */
export function clearDatasetResourceCache(): void {
  resourceCache.clear();
}

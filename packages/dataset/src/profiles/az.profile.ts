import type { LayerPreset } from '@geoatlas/sdk-core';
import { DEFAULT_GEOATLAS_REPOSITORY } from '@geoatlas/sdk-core';

export const AZ_PROFILE = Object.freeze({
  iso2: 'AZ' as const,
  defaultCenter: [47.5769, 40.1431] as const,
  defaultZoom: 7,
  layerPresets: ['administrative', 'roads'] as const satisfies readonly LayerPreset[],
  repo: DEFAULT_GEOATLAS_REPOSITORY,
});

const LAYER_ARTIFACT_MAP: Record<LayerPreset, readonly string[]> = Object.freeze({
  administrative: Object.freeze([
    'datasets/geometry/boundaries.geojson',
    'datasets/administrative/cities.json',
    'datasets/administrative/districts.json',
    'datasets/administrative/countries.json',
  ]),
  boundaries: Object.freeze(['datasets/geometry/boundaries.geojson']),
  roads: Object.freeze(['datasets/geometry/roads.geojson']),
  pois: Object.freeze(['datasets/pois/']),
  transport: Object.freeze([
    'datasets/transport/roads.json',
    'datasets/transport/metro.json',
  ]),
});

const BASE_ARTIFACTS = Object.freeze([
  'checksums.json',
  'datasets/manifest.json',
  'datasets/metadata.json',
] as const);

export function resolveLayerArtifacts(layers: readonly LayerPreset[]): readonly string[] {
  const paths = new Set<string>(BASE_ARTIFACTS);
  for (const layer of layers) {
    for (const path of LAYER_ARTIFACT_MAP[layer]) {
      paths.add(path);
    }
  }
  return Object.freeze([...paths]);
}

export function isCountrySupported(iso2: string): boolean {
  return iso2.toUpperCase() === AZ_PROFILE.iso2;
}

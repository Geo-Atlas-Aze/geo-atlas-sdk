import {
  GeoAtlasError,
  type LayerPreset,
} from '@geoatlas/sdk-core';
import { ATTRIBUTION_TEXT, createMap } from '@geoatlas/sdk-rendering';

import {
  A11Y_LABELS,
  DEFAULT_CONTROLS,
  GEOATLAS_AZ_DEFAULTS,
  LATEST_DATASET_VERSION_FALLBACK,
  MAPLIBRE_CONTROL_SELECTORS,
} from './constants.js';
import type { ControlPreset, GeoAtlasMapProps } from './types.js';

/**
 * Resolves a dataset version string, including the `latest` alias.
 */
export function resolveDatasetVersion(version: GeoAtlasMapProps['version']): string {
  if (!version || version === 'latest') {
    return LATEST_DATASET_VERSION_FALLBACK;
  }
  return version;
}

/**
 * Maps control presets to renderer initialization flags.
 */
export function resolveControlOptions(controls: readonly ControlPreset[]): {
  readonly navigationControl: boolean;
  readonly attributionControl: boolean;
} {
  return {
    navigationControl: controls.includes('zoom'),
    attributionControl: controls.includes('attribution'),
  };
}

/**
 * Applies accessibility labels to MapLibre zoom buttons when present.
 */
export function enhanceMapAccessibility(container: HTMLElement): void {
  const zoomIn = container.querySelector(MAPLIBRE_CONTROL_SELECTORS.zoomIn);
  const zoomOut = container.querySelector(MAPLIBRE_CONTROL_SELECTORS.zoomOut);
  zoomIn?.setAttribute('aria-label', A11Y_LABELS.zoomIn);
  zoomOut?.setAttribute('aria-label', A11Y_LABELS.zoomOut);
}

/**
 * Converts unknown errors into {@link GeoAtlasError} instances for callbacks.
 */
export function toGeoAtlasError(error: unknown): GeoAtlasError {
  if (error instanceof GeoAtlasError) {
    return error;
  }

  if (error instanceof Error) {
    return new GeoAtlasError('RENDERER_INIT_FAILED', error.message, error);
  }

  return new GeoAtlasError('RENDERER_INIT_FAILED', String(error));
}

/**
 * Returns default layer presets when none are provided.
 */
export function resolveLayers(
  layers: readonly LayerPreset[] | undefined,
): readonly LayerPreset[] {
  return layers ?? GEOATLAS_AZ_DEFAULTS.layers;
}

/**
 * Returns default control presets when none are provided.
 */
export function resolveControls(
  controls: readonly ControlPreset[] | undefined,
): readonly ControlPreset[] {
  return controls ?? DEFAULT_CONTROLS;
}

export { ATTRIBUTION_TEXT, createMap };

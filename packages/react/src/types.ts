import type { CSSProperties, ReactNode } from 'react';

import type { GeoAtlasError, LayerPreset, LngLat } from '@geoatlas/sdk-core';

import type { CameraState, MapClickEvent, MapController } from '@geoatlas/sdk-rendering';

import type { DEFAULT_CONTROLS } from './constants.js';

/** Supported map engine identifiers. */
export type MapEngine = 'maplibre' | 'leaflet';

/** UI control presets exposed on the map. */
export type ControlPreset = (typeof DEFAULT_CONTROLS)[number];

/** Dataset version pin or latest pointer. */
export type DatasetVersion = string | 'latest';

/** Props for the {@link GeoAtlasMap} React component. */
export interface GeoAtlasMapProps {
  /** ISO 3166-1 alpha-2 country code. */
  readonly country: string;
  /** Dataset version pin. Defaults to `latest` (resolved to pinned AZ version in M2). */
  readonly version?: DatasetVersion;
  /** Initial map center in `[lng, lat]` order. */
  readonly initialCenter?: LngLat;
  /** Initial zoom level. */
  readonly initialZoom?: number;
  /** Layer presets to load and render. */
  readonly layers?: readonly LayerPreset[];
  /** When true, only cached artifacts may be used (not implemented in M2). */
  readonly offline?: boolean;
  /** Rendering engine adapter. Only `maplibre` is supported in M2. */
  readonly engine?: MapEngine;
  /** Built-in UI controls to display. */
  readonly controls?: readonly ControlPreset[];
  /** Invoked when the map and default layers are ready. */
  readonly onLoad?: (map: MapController) => void;
  /** Invoked when the user clicks the map. */
  readonly onClick?: (event: MapClickEvent) => void;
  /** Invoked when camera movement ends. */
  readonly onMoveEnd?: (state: CameraState) => void;
  /** Invoked when map initialization or data loading fails. */
  readonly onError?: (error: GeoAtlasError) => void;
  /** Optional container class name. */
  readonly className?: string;
  /** Optional container inline styles. */
  readonly style?: CSSProperties;
  /** Disable checksum verification for local development. */
  readonly verifyChecksums?: boolean;
  /** Enables streaming viewport rendering. Defaults to `true`. */
  readonly streaming?: boolean;
  /** Enables development diagnostics overlay. */
  readonly debug?: boolean;
  /** Suspense fallback while dataset artifacts preload. */
  readonly suspenseFallback?: ReactNode;
}

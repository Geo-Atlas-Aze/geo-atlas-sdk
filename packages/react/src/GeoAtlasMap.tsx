import { useEffect, useRef } from 'react';

import { DatasetLoadError, GeoAtlasError } from '@geoatlas/sdk-core';
import type { MapController } from '@geoatlas/sdk-rendering';

import { A11Y_LABELS, GEOATLAS_AZ_DEFAULTS } from './constants.js';
import type { GeoAtlasMapProps } from './types.js';
import {
  ATTRIBUTION_TEXT,
  createMap,
  enhanceMapAccessibility,
  resolveControlOptions,
  resolveControls,
  resolveDatasetVersion,
  resolveLayers,
  toGeoAtlasError,
} from './utils.js';

/**
 * Interactive GeoAtlas map component for React applications.
 */
export function GeoAtlasMap({
  country,
  version = 'latest',
  initialCenter = GEOATLAS_AZ_DEFAULTS.initialCenter,
  initialZoom = GEOATLAS_AZ_DEFAULTS.initialZoom,
  layers,
  offline = false,
  engine = 'maplibre',
  controls,
  onLoad,
  onClick,
  onMoveEnd,
  onError,
  className,
  style,
  verifyChecksums,
}: GeoAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapController | null>(null);
  const layerKey = (layers ?? GEOATLAS_AZ_DEFAULTS.layers).join(',');
  const controlKey = (controls ?? []).join(',');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (offline) {
      onError?.(
        new GeoAtlasError('OFFLINE_CACHE_MISS', 'Offline mode is not available in M2'),
      );
      return;
    }

    if (engine !== 'maplibre') {
      onError?.(
        new GeoAtlasError('UNSUPPORTED_ENGINE', `Engine "${engine}" is not supported yet`),
      );
      return;
    }

    let disposed = false;
    const unsubscribers: Array<() => void> = [];
    const resolvedLayers = resolveLayers(layers);
    const resolvedControls = resolveControls(controls);
    const controlOptions = resolveControlOptions(resolvedControls);
    const resolvedVersion = resolveDatasetVersion(version);

    const init = async (): Promise<void> => {
      try {
        const map = await createMap(container, {
          verifyChecksums,
          rendererOptions: {
            center: initialCenter,
            zoom: initialZoom,
            attributionControl: controlOptions.attributionControl,
            navigationControl: controlOptions.navigationControl,
            attributionText: ATTRIBUTION_TEXT,
          },
        });

        if (disposed) {
          map.destroy();
          return;
        }

        mapRef.current = map;
        enhanceMapAccessibility(container);

        if (onClick) {
          unsubscribers.push(map.on('click', onClick));
        }

        if (onMoveEnd) {
          unsubscribers.push(map.on('moveend', onMoveEnd));
        }

        await map.loadDataset(country, resolvedVersion, resolvedLayers);
        map.showLayers(resolvedLayers);
        await map.zoomToCountry();

        if (!disposed) {
          enhanceMapAccessibility(container);
          onLoad?.(map);
        }
      } catch (error: unknown) {
        if (error instanceof DatasetLoadError) {
          onError?.(error);
          return;
        }
        onError?.(toGeoAtlasError(error));
      }
    };

    void init();

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [
    country,
    version,
    initialCenter,
    initialZoom,
    layerKey,
    controlKey,
    offline,
    engine,
    onLoad,
    onClick,
    onMoveEnd,
    onError,
    verifyChecksums,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      role="application"
      aria-label={`${A11Y_LABELS.map} — ${country}`}
    />
  );
}

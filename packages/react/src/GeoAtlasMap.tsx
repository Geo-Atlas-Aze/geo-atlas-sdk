import { memo, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';

import { DatasetLoadError, GeoAtlasError } from '@geoatlas/sdk-core';
import type { MapController } from '@geoatlas/sdk-rendering';

import { A11Y_LABELS, GEOATLAS_AZ_DEFAULTS } from './constants.js';
import { getDatasetResource } from './datasetResource.js';
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

interface GeoAtlasMapInnerProps extends GeoAtlasMapProps {
  readonly suspense?: boolean;
}

function useStableLayerKey(layers: GeoAtlasMapProps['layers']): string {
  return useMemo(
    () => (layers ?? GEOATLAS_AZ_DEFAULTS.layers).join(','),
    [layers],
  );
}

function useStableControlKey(controls: GeoAtlasMapProps['controls']): string {
  return useMemo(() => (controls ?? []).join(','), [controls]);
}

const GeoAtlasMapInner = memo(function GeoAtlasMapInner({
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
  streaming = true,
  debug = false,
  suspense = false,
}: GeoAtlasMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapController | null>(null);
  const layerKey = useStableLayerKey(layers);
  const controlKey = useStableControlKey(controls);
  const resolvedLayers = useMemo(() => resolveLayers(layers), [layerKey, layers]);
  const resolvedControls = useMemo(() => resolveControls(controls), [controlKey, controls]);
  const resolvedVersion = useMemo(() => resolveDatasetVersion(version), [version]);

  if (suspense) {
    getDatasetResource(country, resolvedVersion, resolvedLayers, verifyChecksums).read();
  }

  const handleClick = useCallback(
    (event: Parameters<NonNullable<GeoAtlasMapProps['onClick']>>[0]) => {
      onClick?.(event);
    },
    [onClick],
  );

  const handleMoveEnd = useCallback(
    (state: Parameters<NonNullable<GeoAtlasMapProps['onMoveEnd']>>[0]) => {
      onMoveEnd?.(state);
    },
    [onMoveEnd],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') {
      return;
    }

    if (offline) {
      onError?.(
        new GeoAtlasError('OFFLINE_CACHE_MISS', 'Offline mode is not available in M2.5'),
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
    const controlOptions = resolveControlOptions(resolvedControls);

    const init = async (): Promise<void> => {
      try {
        const map = await createMap(container, {
          verifyChecksums,
          streaming,
          debug,
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
          unsubscribers.push(map.on('click', handleClick));
        }

        if (onMoveEnd) {
          unsubscribers.push(map.on('moveend', handleMoveEnd));
        }

        await map.loadDataset(country, resolvedVersion, resolvedLayers);
        await map.showLayers(resolvedLayers);
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
    resolvedVersion,
    initialCenter,
    initialZoom,
    layerKey,
    controlKey,
    offline,
    engine,
    onLoad,
    handleClick,
    handleMoveEnd,
    onError,
    verifyChecksums,
    streaming,
    debug,
    suspense,
    resolvedLayers,
    resolvedControls,
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
});

/**
 * Interactive GeoAtlas map component for React applications.
 */
export function GeoAtlasMap(props: GeoAtlasMapProps) {
  if (props.suspenseFallback !== undefined) {
    return (
      <Suspense fallback={props.suspenseFallback}>
        <GeoAtlasMapInner {...props} suspense />
      </Suspense>
    );
  }
  return <GeoAtlasMapInner {...props} />;
}

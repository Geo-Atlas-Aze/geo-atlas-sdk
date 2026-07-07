# ADR-M25: Streaming Dataset Architecture

## Status

Accepted — M2.5

## Context

Azerbaijan datasets can exceed 100K features (roads, POIs). Loading entire GeoJSON artifacts into memory and rendering them at once causes slow first paint, high memory usage, and poor viewport interaction.

## Decision

Introduce a streaming pipeline with these layers:

1. **DatasetManager** (`@geoatlas/sdk-core`) — deduplicated artifact registry with reference counting.
2. **ChunkLoader** (`@geoatlas/sdk-dataset`) — remote chunk probing plus virtual in-memory chunking for monolithic GeoJSON.
3. **GridIndex** (`@geoatlas/sdk-core`) — uniform-grid spatial index for bounds queries.
4. **ViewportEngine** (`@geoatlas/sdk-rendering`) — debounced viewport state and tile keys.
5. **ProgressiveRenderer** — boundaries → roads → future water/buildings/POI priority order.
6. **RenderQueue** — priority batching with generation-based cancellation.
7. **MemoryManager** + **FeatureCache** — LRU retention and cleanup hooks.
8. **PerformanceMonitor** — development-only metrics (`console.table`).

## Viewport Rendering Strategy

- Boundaries render immediately from cached artifact text.
- Roads render from viewport-intersecting chunks only.
- `moveend` triggers debounced chunk reload; outdated requests abort via `AbortController`.
- MapLibre GeoJSON sources update in place via `updateGeoJsonSource`.

## Chunk Loading

Priority order:

1. Probe CDN for `*_part_NNN.geojson` files.
2. Fallback: split monolithic artifact into virtual `#chunk/{lngCell}_{latCell}` buckets.
3. Load only chunks intersecting expanded viewport bounds (15% padding).

## Spatial Index

`GridIndex` uses fixed-degree cells (default 0.25°) for O(cells) candidate lookup instead of O(n) linear scans.

## Consequences

- Public React API unchanged; optional `streaming`, `debug`, `suspenseFallback` props added.
- `showLayers` is now async but remains backward compatible for `await` callers.
- Water/buildings/POI progressive stages reserved for M1.5/M3.
- CDN must eventually publish physical chunk files for optimal cross-country scaling.

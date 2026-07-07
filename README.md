# @geoatlas/sdk

GeoAtlas TypeScript SDK — CDN-first geographic data and interactive maps for Azerbaijan.

**Status:** M0 scaffold (data layer only; map rendering in M1).

## Packages

| Package | Description |
|---------|-------------|
| `@geoatlas/sdk-core` | Types, errors, fetch policy |
| `@geoatlas/sdk-dataset` | CDN loader, allowlist, retry |
| `@geoatlas/sdk-rendering` | REAL + MapController (M1) |
| `@geoatlas/sdk-react` | GeoAtlasMap (M2) |

## Quick start (M0)

```bash
pnpm install
pnpm build
pnpm test
pnpm dev   # playground — CDN connectivity check
```

## Architecture docs

Full SDK architecture (M0–M2, data layer, roadmap): see the GeoAtlas workspace `docs/geoatlassdk/` tree, or open an issue for published doc links.

## Related repositories

| Repository | Role |
|------------|------|
| [geo-data-generator](https://github.com/Geo-Atlas-Aze/geo-data-generator) | Dataset pipeline (OSM → release) |
| [geo-datasets](https://github.com/Geo-Atlas-Aze/geo-datasets) | Published CDN artifacts (`az/v*`) |
| **geoatlas-sdk** (this repo) | TypeScript SDK — load CDN data, render maps |

## Data source

```
https://cdn.jsdelivr.net/gh/Geo-Atlas-Aze/geo-datasets@main/az/v1.0.0/
```

## License

MIT — map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL).

const DENIED_EXACT = new Set(['datasets/hierarchy.json']);

const DENIED_PREFIXES = ['datasets/search/', 'datasets/lookup/'] as const;

const ALLOWED_PREFIXES = [
  'datasets/manifest.json',
  'datasets/metadata.json',
  'datasets/geometry/',
  'datasets/administrative/',
  'datasets/transport/roads.json',
  'datasets/transport/metro.json',
  'datasets/pois/',
  'release.json',
  'checksums.json',
] as const;

function normalizeArtifactPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function isArtifactPathAllowed(relativePath: string): boolean {
  const normalized = normalizeArtifactPath(relativePath);

  if (DENIED_EXACT.has(normalized)) {
    return false;
  }

  for (const prefix of DENIED_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return false;
    }
  }

  if (normalized === 'checksums.json' || normalized === 'release.json') {
    return true;
  }

  return ALLOWED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix),
  );
}

export function assertArtifactPathAllowed(relativePath: string): void {
  if (!isArtifactPathAllowed(relativePath)) {
    throw new Error(`Artifact path not allowed: ${relativePath}`);
  }
}

export const MVP_DEFAULT_ARTIFACTS = Object.freeze([
  'checksums.json',
  'datasets/manifest.json',
  'datasets/metadata.json',
  'datasets/geometry/boundaries.geojson',
  'datasets/geometry/roads.geojson',
  'datasets/administrative/cities.json',
  'datasets/administrative/districts.json',
  'datasets/administrative/countries.json',
] as const);

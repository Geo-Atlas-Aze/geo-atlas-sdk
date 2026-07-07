import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MapController } from '@geoatlas/sdk-rendering';

import { GeoAtlasMap } from '../src/GeoAtlasMap.js';

class ResizeObserverMock {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const mockMap = {
  destroy: vi.fn(),
  resize: vi.fn(),
  on: vi.fn(() => vi.fn()),
  loadDataset: vi.fn(async () => undefined),
  showLayers: vi.fn(async () => undefined),
  zoomToCountry: vi.fn(async () => undefined),
} satisfies Partial<MapController>;

vi.mock('../src/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils.js')>();
  return {
    ...actual,
    createMap: vi.fn(async () => mockMap),
  };
});

describe('GeoAtlasMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders map container with accessibility label', () => {
    render(<GeoAtlasMap country="AZ" version="1.0.0" />);
    expect(screen.getByRole('application', { name: /Interactive GeoAtlas map — AZ/i })).toBeTruthy();
  });

  it('invokes onLoad when map initialization completes', async () => {
    const onLoad = vi.fn();
    render(<GeoAtlasMap country="AZ" version="1.0.0" onLoad={onLoad} />);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledWith(mockMap);
    });
  });

  it('registers onClick handler on the map controller', async () => {
    const onClick = vi.fn();
    render(<GeoAtlasMap country="AZ" version="1.0.0" onClick={onClick} />);

    await waitFor(() => {
      expect(mockMap.on).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });
});

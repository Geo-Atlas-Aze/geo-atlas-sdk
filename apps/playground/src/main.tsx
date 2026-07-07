import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ATTRIBUTION_TEXT, createMap } from '@geoatlas/sdk-rendering';
import type { MapController } from '@geoatlas/sdk-rendering';

import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapController | null>(null);
  const [status, setStatus] = useState('Loading map...');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let disposed = false;

    const init = async (): Promise<void> => {
      try {
        const map = await createMap(container, {
          verifyChecksums: false,
          rendererOptions: {
            attributionControl: true,
            navigationControl: true,
            attributionText: ATTRIBUTION_TEXT,
          },
        });

        if (disposed) {
          map.destroy();
          return;
        }

        mapRef.current = map;
        setStatus('Loading dataset from CDN...');

        await map.loadDataset('AZ', '1.0.0', ['administrative', 'roads']);
        map.showAdministrativeBoundaries();
        map.showRoads();
        await map.zoomToCountry();

        if (!disposed) {
          setStatus('M1 map ready — boundaries + roads');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!disposed) {
          setStatus(`Error: ${message}`);
        }
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
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>GeoAtlas SDK Playground</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>Milestone: M1 — MapLibre rendering</p>
        <p style={{ margin: '0.25rem 0 0' }}>
          <strong>Status:</strong> {status}
        </p>
      </header>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, width: '100%' }} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

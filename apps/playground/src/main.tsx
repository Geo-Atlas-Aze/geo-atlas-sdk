import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { GeoAtlasMap } from '@geoatlas/sdk-react';
import type { MapClickEvent } from '@geoatlas/sdk-react';

import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const [status, setStatus] = useState('Loading map...');
  const [lastClick, setLastClick] = useState<string>('—');

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
        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>Milestone: M2 — GeoAtlasMap</p>
        <p style={{ margin: '0.25rem 0 0' }}>
          <strong>Status:</strong> {status}
        </p>
        <p style={{ margin: '0.25rem 0 0', color: '#4b5563' }}>
          <strong>Last click:</strong> {lastClick}
        </p>
      </header>
      <GeoAtlasMap
        country="AZ"
        version="1.0.0"
        verifyChecksums={false}
        style={{ flex: 1, minHeight: 0, width: '100%' }}
        onLoad={() => {
          setStatus('M2 map ready — boundaries + roads');
        }}
        onClick={(event: MapClickEvent) => {
          setLastClick(`${event.lngLat[1].toFixed(4)}, ${event.lngLat[0].toFixed(4)}`);
        }}
        onError={(error) => {
          setStatus(`Error: ${error.message}`);
        }}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

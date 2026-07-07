import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { DatasetLoader } from '@geoatlas/sdk-dataset';

function App() {
  const [status, setStatus] = useState('Connecting to CDN...');
  const [artifactCount, setArtifactCount] = useState(0);

  useEffect(() => {
    const loader = new DatasetLoader({ verifyChecksums: false });
    const ref = loader.resolve('AZ', '1.0.0');

    loader
      .loadArtifacts(ref, ['administrative', 'roads'])
      .then((artifacts) => {
        setArtifactCount(Object.keys(artifacts).length);
        setStatus('CDN connected — M0 dataset layer ready');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`CDN error: ${message}`);
      });
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>GeoAtlas SDK Playground</h1>
      <p>Milestone: M0 — data layer only (no map yet)</p>
      <p>
        <strong>Status:</strong> {status}
      </p>
      <p>
        <strong>Artifacts loaded:</strong> {artifactCount}
      </p>
      <p style={{ color: '#666' }}>© OpenStreetMap contributors | GeoAtlas</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

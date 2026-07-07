import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@geoatlas/sdk-core': path.resolve(rootDir, '../../packages/core/src/index.ts'),
      '@geoatlas/sdk-dataset': path.resolve(rootDir, '../../packages/dataset/src/index.ts'),
      '@geoatlas/sdk-rendering': path.resolve(rootDir, '../../packages/rendering/src/index.ts'),
      '@geoatlas/sdk-react': path.resolve(rootDir, '../../packages/react/src/index.ts'),
    },
  },
});

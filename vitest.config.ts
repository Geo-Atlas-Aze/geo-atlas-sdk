import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@geoatlas/sdk-core': path.resolve(rootDir, 'packages/core/src/index.ts'),
      '@geoatlas/sdk-dataset': path.resolve(rootDir, 'packages/dataset/src/index.ts'),
      '@geoatlas/sdk-rendering': path.resolve(rootDir, 'packages/rendering/src/index.ts'),
      '@geoatlas/sdk-react': path.resolve(rootDir, 'packages/react/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    environmentMatchGlobs: [
      ['packages/react/**', 'jsdom'],
    ],
    include: ['packages/**/tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**', 'packages/dataset/src/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});

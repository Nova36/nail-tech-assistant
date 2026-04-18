import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Vitest config scoped to the Firestore rules lane. Runs under Node (no jsdom)
 * because rules tests talk to the Firestore emulator over gRPC/HTTP. Invoked
 * via `pnpm test:rules`, which wraps this command in `firebase emulators:exec`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

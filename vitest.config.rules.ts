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
    // Storage emulator (added in c4) does not handle concurrent rules loads
    // from multiple test files cleanly — running file-parallel produces
    // flaky `storage/unauthorized` errors on the first write of each file
    // because rules deployment for one projectId can race with another file's
    // SDK call. Serializing keeps the rules deployment cycle deterministic.
    // The rules suite is small (~8 files); the runtime cost is negligible.
    fileParallelism: false,
  },
});

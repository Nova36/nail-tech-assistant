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
      // c5 storage helper imports `server-only`. Mirror the main vitest
      // config's shim so the rules-lane doesn't blow up when the helper
      // is exercised against the storage emulator.
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/rules/**/*.test.ts',
      // c5 storage helper integration tests run in this lane because they
      // need the storage emulator that `firebase emulators:exec` already
      // boots for the rules tests. They use the production Admin SDK
      // (NOT @firebase/rules-unit-testing) — separate concern from rules.
      'tests/integration/firebase/**/*.test.ts',
      // c6 ingest end-to-end test runs in this lane for the Firestore +
      // Storage emulators (Pinterest is still MSW-mocked via a per-test
      // setupServer instance — c2's global MSW setup is jsdom-lane-only).
      'tests/integration/references/**/*.test.ts',
    ],
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

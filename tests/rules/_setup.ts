/**
 * c4-firestore-storage-rules — shared test-environment setup.
 *
 * Each rules-test file defines its own beforeAll/afterAll hooks but reuses
 * this module to construct the @firebase/rules-unit-testing environment
 * with both Firestore and Storage rules registered. The file extension
 * intentionally lacks `.test.ts` so vitest's include glob skips it.
 *
 * Loads both `firestore.rules` and `storage.rules` from the repo root so
 * either surface can be exercised by importing the relevant SDK calls in
 * the test (`firebase/firestore` for Firestore, `firebase/storage` for
 * Storage). Emulator ports are read from the env vars the
 * `firebase emulators:exec` wrapper sets:
 *   - FIRESTORE_EMULATOR_HOST   (e.g., 127.0.0.1:8080)
 *   - FIREBASE_STORAGE_EMULATOR_HOST (e.g., 127.0.0.1:9199)
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';

const FIRESTORE_HOST_ENV = 'FIRESTORE_EMULATOR_HOST';
const STORAGE_HOST_ENV = 'FIREBASE_STORAGE_EMULATOR_HOST';

export const ALICE_UID = 'alice-uid';
export const BOB_UID = 'bob-uid';

interface SetupOptions {
  /**
   * Stable project ID for emulator-side state isolation. Each test file
   * passes a distinct value so rules-unit-testing's per-project caches do
   * not collide between concurrent test files.
   */
  projectId: string;
}

function parseHost(env: string): { host: string; port: number } {
  const value = process.env[env];
  if (!value) {
    throw new Error(
      `${env} is not set. Run rules tests via \`pnpm test:rules\` so the ` +
        `Firebase emulators are started by firebase-tools.`
    );
  }
  const [host, portStr] = value.split(':');
  const port = Number.parseInt(portStr ?? '0', 10);
  if (!host || !Number.isFinite(port) || port <= 0) {
    throw new Error(`${env} is malformed (got "${value}")`);
  }
  return { host, port };
}

export async function setupRulesEnv(
  options: SetupOptions
): Promise<RulesTestEnvironment> {
  const firestore = parseHost(FIRESTORE_HOST_ENV);
  const storage = parseHost(STORAGE_HOST_ENV);

  const firestoreRules = fs.readFileSync(
    path.resolve(process.cwd(), 'firestore.rules'),
    'utf8'
  );
  const storageRules = fs.readFileSync(
    path.resolve(process.cwd(), 'storage.rules'),
    'utf8'
  );

  return initializeTestEnvironment({
    projectId: options.projectId,
    firestore: {
      rules: firestoreRules,
      host: firestore.host,
      port: firestore.port,
    },
    storage: {
      rules: storageRules,
      host: storage.host,
      port: storage.port,
    },
  });
}

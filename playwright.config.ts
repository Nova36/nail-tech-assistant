import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite runs the Next.js dev server WRAPPED in firebase emulators:exec so
 * the app talks to the local Auth + Firestore emulators instead of real
 * Firebase. Prevents real emails from being sent by sendSignInLinkToEmail and
 * gives tests deterministic access to oob codes + Firestore state.
 *
 * Emulator ports match firebase.json: 9099 (auth), 8080 (firestore). All
 * Firebase env vars below are dummy values; the emulator does not validate
 * credentials, only requires the NEXT_PUBLIC_* to be present at module load.
 */
/**
 * Dedicated e2e port (3100) to avoid colliding with any other Next.js dev
 * server on the default 3000. The webServer launches `pnpm dev -p 3100`
 * wrapped in firebase emulators:exec so the app talks to the local Auth
 * emulator.
 */
const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

const RUN_REAL_TOKEN_SMOKE = Boolean(process.env.RUN_REAL_TOKEN_SMOKE);
const SMOKE_BASE_URL =
  process.env.SMOKE_BASE_URL ?? 'https://nail-tech-assistant.vercel.app';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      threshold: 0.02,
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: E2E_BASE_URL,
    ...devices['Desktop Chrome'],
  },
  // Default suite excludes the real-token smoke spec — that runs only when
  // RUN_REAL_TOKEN_SMOKE=1, against a deployed environment, with no local
  // webServer needed.
  testIgnore: RUN_REAL_TOKEN_SMOKE
    ? []
    : ['**/pinterest-real-token-smoke.spec.ts'],
  webServer: RUN_REAL_TOKEN_SMOKE
    ? undefined
    : {
        command: `firebase emulators:exec --only auth --project=nail-tech-assistant-e2e "pnpm dev:e2e -p ${E2E_PORT}"`,
        url: E2E_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',

          NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '127.0.0.1:9099',
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'nail-tech-assistant-e2e',
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
          NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:demo',
          NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',

          FIREBASE_PROJECT_ID: 'nail-tech-assistant-e2e',
          FIREBASE_CLIENT_EMAIL:
            'emulator-sa@nail-tech-assistant-e2e.iam.gserviceaccount.com',
          FIREBASE_PRIVATE_KEY:
            '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',

          ALLOWED_EMAIL: 'configured@example.test',
          APP_URL: E2E_BASE_URL,
          PINTEREST_ACCESS_TOKEN: 'dummy-pinterest-token-for-e2e',
        },
      },
  projects: RUN_REAL_TOKEN_SMOKE
    ? [
        {
          name: 'pinterest-real-token-smoke',
          testMatch: '**/pinterest-real-token-smoke.spec.ts',
          use: {
            baseURL: SMOKE_BASE_URL,
            ...devices['Desktop Chrome'],
          },
        },
      ]
    : [
        {
          name: 'default',
          use: { baseURL: E2E_BASE_URL, ...devices['Desktop Chrome'] },
        },
      ],
});

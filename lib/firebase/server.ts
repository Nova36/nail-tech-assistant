import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

/**
 * Hydrate the FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * triplet from FIREBASE_SERVICE_ACCOUNT_JSON when the triplet isn't set
 * directly. Mirrors the helper in lib/env.ts but inlined here because
 * Vercel route bundles that don't transitively import lib/env (e.g. the
 * authenticated layout) otherwise get an undefined private key.
 */
function hydrateFromServiceAccountJson(): void {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!blob) return;
  try {
    const parsed = JSON.parse(blob) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!process.env.FIREBASE_PROJECT_ID && parsed.project_id) {
      process.env.FIREBASE_PROJECT_ID = parsed.project_id;
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL && parsed.client_email) {
      process.env.FIREBASE_CLIENT_EMAIL = parsed.client_email;
    }
    if (!process.env.FIREBASE_PRIVATE_KEY && parsed.private_key) {
      process.env.FIREBASE_PRIVATE_KEY = parsed.private_key;
    }
  } catch {
    // Leave env vars unset; createServerFirebaseAdmin's getPrivateKey will
    // throw a clearer error than a swallowed JSON parse failure.
  }
}

const ADMIN_APP_KEY = Symbol.for('firebase-admin-app');

type GlobalAdminStore = Record<PropertyKey, unknown>;

function getPrivateKey(): string {
  return process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
}

function isEmulatorMode(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

export function createServerFirebaseAdmin(): App {
  const globalStore = globalThis as GlobalAdminStore;
  const existingGlobalApp = globalStore[ADMIN_APP_KEY];

  if (existingGlobalApp) {
    return existingGlobalApp as App;
  }

  hydrateFromServiceAccountJson();

  const initOptions = isEmulatorMode()
    ? { projectId: process.env.FIREBASE_PROJECT_ID! }
    : {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: getPrivateKey(),
        }),
      };

  const app =
    getApps().length === 0 ? initializeApp(initOptions) : getApps()[0]!;

  globalStore[ADMIN_APP_KEY] = app;
  return app;
}

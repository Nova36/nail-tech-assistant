import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

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

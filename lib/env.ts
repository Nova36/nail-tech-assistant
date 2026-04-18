// STUB — Codex implements in step 3. Export signature only.
export interface Env {
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ALLOWED_EMAIL: string;
  APP_URL: string;
  PINTEREST_ACCESS_TOKEN: string;
}

export function getEnv(): Env {
  throw new Error('NOT IMPLEMENTED');
}

// Module-load validation — Codex replaces this with real zod schema
export const env: Env = (() => {
  throw new Error('NOT IMPLEMENTED');
})();

import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Bucket type is derived from firebase-admin/storage to avoid a direct
// `@google-cloud/storage` import (it's a transitive dep of firebase-admin
// and is not declared in our package.json).
type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

/**
 * Server-only Firebase Cloud Storage helper.
 *
 * Mirrors `lib/firebase/server.ts` exactly:
 *   - INLINED `hydrateFromServiceAccountJson()` (per memory
 *     `feedback_env_hydration_import_order` — Vercel route bundles that
 *     don't transitively import lib/env or server.ts otherwise miss
 *     hydration of the FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY
 *     triplet).
 *   - SHARES `Symbol.for('firebase-admin-app')` with server.ts so the
 *     same App instance is reused across both helpers (one credential
 *     init, one emulator-detection branch). A separate
 *     `Symbol.for('firebase-admin-storage')` caches the Bucket.
 *
 * Path API: every storage write MUST go through `referencePath()` /
 * `generationPath()`. The grep-guard test enforces this across `app/**`
 * and `lib/**`. The path shape mirrors c4 storage.rules `match
 * /users/{uid}/{path=**}` exactly.
 *
 * Upload API: `uploadReferenceBytes` / `uploadGenerationBytes` return a
 * discriminated `{ ok: true; storagePath } | { ok: false; reason; message }`
 * envelope so c15 lifecycle (persistGenerationResult) can distinguish a
 * Storage write failure from a Firestore write failure deterministically.
 *
 * Download / signed-URL APIs are deliberately out of c5 scope — c10/c11
 * decide their own path (likely client-SDK download URLs).
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
    // Leave env vars unset; the cert() call below will throw a clearer
    // error than a swallowed JSON parse failure.
  }
}

const ADMIN_APP_KEY = Symbol.for('firebase-admin-app');
const STORAGE_BUCKET_KEY = Symbol.for('firebase-admin-storage');

type GlobalAdminStore = Record<PropertyKey, unknown>;

function getPrivateKey(): string {
  return process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
}

function isEmulatorMode(): boolean {
  return Boolean(
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.STORAGE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
}

function ensureAdminApp(): App {
  const globalStore = globalThis as GlobalAdminStore;
  const cached = globalStore[ADMIN_APP_KEY];
  if (cached) return cached as App;

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

export function getServerFirebaseStorage(): Bucket {
  const globalStore = globalThis as GlobalAdminStore;
  const cached = globalStore[STORAGE_BUCKET_KEY];
  if (cached) return cached as Bucket;

  const app = ensureAdminApp();
  const bucket = getStorage(app).bucket(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!
  );
  globalStore[STORAGE_BUCKET_KEY] = bucket;
  return bucket;
}

function normalizeExtension(ext: string): string {
  return ext.replace(/^\./, '').toLowerCase();
}

export function referencePath(uid: string, refId: string, ext: string): string {
  if (!uid) throw new Error('referencePath: uid required');
  if (!refId) throw new Error('referencePath: refId required');
  return `users/${uid}/references/${refId}.${normalizeExtension(ext)}`;
}

export function generationPath(
  uid: string,
  genId: string,
  ext: string
): string {
  if (!uid) throw new Error('generationPath: uid required');
  if (!genId) throw new Error('generationPath: genId required');
  return `users/${uid}/generations/${genId}.${normalizeExtension(ext)}`;
}

function contentTypeToExt(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/heic') return 'heic';
  throw new Error(`unsupported contentType: ${contentType}`);
}

export type UploadResult =
  | { ok: true; storagePath: string }
  | {
      ok: false;
      reason: 'storage_failure' | 'unauthorized';
      message: string;
    };

export async function uploadReferenceBytes(input: {
  uid: string;
  refId: string;
  bytes: Buffer | Uint8Array;
  contentType: string;
}): Promise<UploadResult> {
  const ext = contentTypeToExt(input.contentType);
  const storagePath = referencePath(input.uid, input.refId, ext);
  try {
    const bucket = getServerFirebaseStorage();
    await bucket.file(storagePath).save(Buffer.from(input.bytes), {
      metadata: { contentType: input.contentType },
      resumable: false,
    });
    return { ok: true, storagePath };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[storage] uploadReferenceBytes failed', {
      code,
      message,
      uid: input.uid,
      refId: input.refId,
    });
    return { ok: false, reason: 'storage_failure', message };
  }
}

export async function uploadGenerationBytes(input: {
  uid: string;
  genId: string;
  bytes: Buffer | Uint8Array;
  contentType: string;
}): Promise<UploadResult> {
  const ext = contentTypeToExt(input.contentType);
  const storagePath = generationPath(input.uid, input.genId, ext);
  try {
    const bucket = getServerFirebaseStorage();
    await bucket.file(storagePath).save(Buffer.from(input.bytes), {
      metadata: { contentType: input.contentType },
      resumable: false,
    });
    return { ok: true, storagePath };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[storage] uploadGenerationBytes failed', {
      code,
      message,
      uid: input.uid,
      genId: input.genId,
    });
    return { ok: false, reason: 'storage_failure', message };
  }
}

export async function readReferenceBytes(storagePath: string): Promise<
  | { ok: true; bytes: Buffer; contentType: string }
  | {
      ok: false;
      reason: 'not_found' | 'storage_failure';
      message: string;
    }
> {
  try {
    const bucket = getServerFirebaseStorage();
    const file = bucket.file(storagePath);
    const [bytes] = await file.download();
    const [metadata] = await file.getMetadata();
    return {
      ok: true,
      bytes,
      contentType: metadata.contentType ?? 'application/octet-stream',
    };
  } catch (err) {
    const code =
      (err as { code?: string | number }).code?.toString() ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[storage] readReferenceBytes failed', {
      storagePath,
      code,
      message,
    });
    const reason =
      code === 'storage/object-not-found' || code === '404'
        ? 'not_found'
        : 'storage_failure';
    return { ok: false, reason, message };
  }
}

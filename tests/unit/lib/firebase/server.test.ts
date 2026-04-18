/**
 * AC#2 — createServerFirebaseAdmin() returns a memoized FirebaseAdminApp.
 * Also asserts lib/firebase/server.ts starts with `import 'server-only'`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('server-only', () => ({}));

vi.mock('firebase-admin/app', () => {
  const fakeApp = { name: '[DEFAULT]', options: {}, _services: {} };
  return {
    getApps: vi.fn(() => []),
    initializeApp: vi.fn(() => fakeApp),
    cert: vi.fn((creds: unknown) => creds),
  };
});

describe('lib/firebase/server — createServerFirebaseAdmin (AC#2)', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear globalThis symbol so memoization resets between tests
    const key = Symbol.for('firebase-admin-app');
    delete (globalThis as Record<symbol, unknown>)[key];

    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL =
      'sa@test-project.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  });

  it('returns a truthy FirebaseAdminApp instance', async () => {
    const { createServerFirebaseAdmin } =
      await import('../../../../lib/firebase/server');
    const app = createServerFirebaseAdmin();
    expect(app).toBeTruthy();
    expect(app).toHaveProperty('name');
  });

  it('returns the SAME instance on second call (memoization)', async () => {
    const { createServerFirebaseAdmin } =
      await import('../../../../lib/firebase/server');
    const app1 = createServerFirebaseAdmin();
    const app2 = createServerFirebaseAdmin();
    expect(app1).toBe(app2);
  });

  it("lib/firebase/server.ts begins with import 'server-only'", () => {
    const serverFilePath = resolve(process.cwd(), 'lib/firebase/server.ts');
    const source = readFileSync(serverFilePath, 'utf-8');
    const lines = source
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.trim().startsWith('//'));
    expect(lines[0]).toMatch(/import ['"]server-only['"]/);
  });
});

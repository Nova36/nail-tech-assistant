/**
 * c10-create-design-action — Firestore failure mapping.
 * permission-denied → rules_denied; other codes → firestore_failure.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

let mockSetImpl: () => Promise<unknown> = async () => ({});
const mockFirestoreSet = vi.fn().mockImplementation(() => mockSetImpl());

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        withConverter: () => ({ set: mockFirestoreSet }),
      }),
    }),
  }),
}));

let createDesignDraft: typeof import('@/lib/designs/lifecycle').createDesignDraft;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-api-key');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:123456789:web:abc123');
  vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv(
    'FIREBASE_CLIENT_EMAIL',
    'sa@test-project.iam.gserviceaccount.com'
  );
  vi.stubEnv(
    'FIREBASE_PRIVATE_KEY',
    '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');

  const mod = await import('@/lib/designs/lifecycle');
  createDesignDraft = mod.createDesignDraft;
});

beforeEach(() => {
  mockFirestoreSet.mockClear();
  mockSetImpl = async () => ({});
});

const VALID_INPUT = {
  userId: 'alice-uid',
  primaryReferenceId: 'r1',
  secondaryReferenceIds: ['r2'],
  promptText: 'matte',
  nailShape: 'almond',
};

describe('createDesignDraft — error paths', () => {
  it('permission-denied error → rules_denied + tagged log', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetImpl = async () => {
      const err = Object.assign(
        new Error('Missing or insufficient permissions'),
        {
          code: 'permission-denied',
        }
      );
      throw err;
    };

    const out = await createDesignDraft(VALID_INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('rules_denied');
    expect(errorSpy).toHaveBeenCalled();
    const logArgs = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes('[createDesign] firestore rules denied')
    );
    expect(logArgs).toBeDefined();
    errorSpy.mockRestore();
  });

  it('other firestore error → firestore_failure + tagged log', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSetImpl = async () => {
      const err = Object.assign(new Error('service unavailable'), {
        code: 'unavailable',
      });
      throw err;
    };

    const out = await createDesignDraft(VALID_INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('firestore_failure');
    expect(errorSpy).toHaveBeenCalled();
    const logArgs = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes('[createDesign] firestore write failed')
    );
    expect(logArgs).toBeDefined();
    errorSpy.mockRestore();
  });
});

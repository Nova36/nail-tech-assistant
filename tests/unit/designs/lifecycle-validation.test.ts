/**
 * c10-create-design-action — c8 invariant failures propagate verbatim.
 * Firestore must NOT be touched on validation failure.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockFirestoreSet = vi.fn().mockResolvedValue({});

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
  mockFirestoreSet.mockReset().mockResolvedValue({});
});

describe('createDesignDraft — c8 invariant propagation', () => {
  it('empty primaryReferenceId → primary_required, no firestore write', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: '',
      secondaryReferenceIds: [],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('primary_required');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it('duplicate secondaryReferenceIds → duplicate_reference_id, no firestore write', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ['r1', 'r1'],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('duplicate_reference_id');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it('primary in secondary → primary_in_secondary, no firestore write', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r1'],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('primary_in_secondary');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it('prompt too long → prompt_too_long, no firestore write', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: 'a'.repeat(1001),
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('prompt_too_long');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });

  it('invalid nail shape → invalid_nail_shape, no firestore write', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      nailShape: 'stiletto',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('invalid_nail_shape');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

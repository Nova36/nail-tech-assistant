/**
 * c10-create-design-action — createDesignDraft happy-path unit test.
 *
 * Mocks: @/lib/firebase/server + firebase-admin/firestore.
 * Asserts the c3-locked Design shape is written via designConverter with
 * name: null, latestGenerationId: null, createdAt === updatedAt at create.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockFirestoreSet = vi.fn().mockResolvedValue({});
const mockWithConverter = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
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
  mockWithConverter.mockReset().mockReturnValue({ set: mockFirestoreSet });
  mockDoc.mockReset().mockReturnValue({ withConverter: mockWithConverter });
  mockCollection.mockReset().mockReturnValue({ doc: mockDoc });
});

describe('createDesignDraft — happy path', () => {
  it('returns ok envelope with a designId and writes a c3-shaped Design', async () => {
    const out = await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r2'],
      promptText: 'matte rose gold',
      nailShape: 'almond',
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.status).toBe('draft_created');
    expect(typeof out.designId).toBe('string');
    expect(out.designId.length).toBeGreaterThan(0);

    expect(mockCollection).toHaveBeenCalledWith('designs');
    expect(mockDoc).toHaveBeenCalledWith(out.designId);
    expect(mockWithConverter).toHaveBeenCalledOnce();
    expect(mockFirestoreSet).toHaveBeenCalledOnce();

    const written = mockFirestoreSet.mock.calls[0][0];
    expect(written).toMatchObject({
      id: out.designId,
      userId: 'alice-uid',
      name: null,
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r2'],
      promptText: 'matte rose gold',
      nailShape: 'almond',
      latestGenerationId: null,
    });
    expect(typeof written.createdAt).toBe('string');
    expect(typeof written.updatedAt).toBe('string');
    expect(written.createdAt).toBe(written.updatedAt);
    expect(() => new Date(written.createdAt).toISOString()).not.toThrow();
  });

  it('preserves secondary order verbatim', async () => {
    await createDesignDraft({
      userId: 'alice-uid',
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ['c', 'a', 'b'],
      promptText: null,
      nailShape: 'oval',
    });
    const written = mockFirestoreSet.mock.calls[0][0];
    expect(written.secondaryReferenceIds).toEqual(['c', 'a', 'b']);
    expect(written.promptText).toBeNull();
  });
});

/**
 * c6-pinterest-ingest — happy-path unit test.
 *
 * Mocks: @/lib/firebase/server + firebase-admin/firestore + @/lib/firebase/storage.
 * Real: lib/pinterest/client (its fetch is intercepted by MSW + lib/env stubs).
 *
 * Asserts the returned Reference matches the c3-locked shape exactly:
 *   source: 'pinterest', pinterestPinId: <pinId>, sourceUrl: <pin.link>,
 *   storagePath: 'users/<uid>/references/<refId>.<ext>', userId, id, createdAt.
 */
import { http, HttpResponse } from 'msw';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';

import { server } from '@/tests/__mocks__/msw-server';

const STUB_TOKEN = 'ptest_token_abc123';
const FAKE_IMAGE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header

// ─── Module-level mocks ────────────────────────────────────────────────────
const mockUploadReferenceBytes = vi.fn();
const mockFirestoreSet = vi.fn().mockResolvedValue({});

vi.mock('@/lib/firebase/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/storage')>(
    '@/lib/firebase/storage'
  );
  return {
    ...actual,
    uploadReferenceBytes: mockUploadReferenceBytes,
  };
});

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        withConverter: () => ({
          set: mockFirestoreSet,
        }),
      }),
    }),
  }),
}));

let ingestPinterestPin: typeof import('@/lib/references/ingest').ingestPinterestPin;

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
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', STUB_TOKEN);

  const mod = await import('@/lib/references/ingest');
  ingestPinterestPin = mod.ingestPinterestPin;
});

beforeEach(() => {
  mockUploadReferenceBytes.mockReset();
  mockFirestoreSet.mockReset().mockResolvedValue({});
});

afterEach(() => {
  server.resetHandlers();
});

describe('ingestPinterestPin — happy path', () => {
  it('returns a Reference with the c3-locked shape on success', async () => {
    const PIN_URL = 'https://i.pinimg.com/1200x/aa/bb/cc/abc123.jpg';
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json({
          id: 'p1',
          link: 'https://www.pinterest.com/pin/p1/',
          media: {
            media_type: 'image',
            images: { '1200x': { url: PIN_URL, width: 1200, height: 1600 } },
          },
        })
      ),
      http.get(PIN_URL, () =>
        HttpResponse.arrayBuffer(FAKE_IMAGE_BYTES.buffer, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      )
    );

    mockUploadReferenceBytes.mockImplementation(async ({ uid, refId }) => ({
      ok: true,
      storagePath: `users/${uid}/references/${refId}.jpg`,
    }));

    const result = await ingestPinterestPin({
      userId: 'alice-uid',
      pinId: 'p1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ref = result.reference;
    expect(ref.source).toBe('pinterest');
    expect(ref.pinterestPinId).toBe('p1');
    expect(ref.userId).toBe('alice-uid');
    expect(ref.sourceUrl).toBe('https://www.pinterest.com/pin/p1/');
    expect(ref.storagePath).toMatch(
      /^users\/alice-uid\/references\/[a-f0-9-]+\.jpg$/
    );
    expect(ref.id).toBeTruthy();
    expect(ref.id).toBe(ref.storagePath.split('/').pop()?.replace('.jpg', ''));
    expect(ref.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Two-write order: storage called once, firestore called once.
    expect(mockUploadReferenceBytes).toHaveBeenCalledTimes(1);
    expect(mockFirestoreSet).toHaveBeenCalledTimes(1);
  });
});

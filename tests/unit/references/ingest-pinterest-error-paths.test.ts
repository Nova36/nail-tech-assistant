/**
 * c6-pinterest-ingest — error path coverage.
 *
 * Each scenario asserts the discriminated reason + verifies that no Storage
 * / Firestore writes happened for upstream failures, OR that Firestore was
 * NOT called when Storage failed (post-Storage Firestore failure is the
 * exception — Storage was called, Firestore failure is logged).
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
const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const PIN_URL = 'https://i.pinimg.com/1200x/aa.jpg';

const mockUploadReferenceBytes = vi.fn();
const mockFirestoreSet = vi.fn();

vi.mock('@/lib/firebase/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/storage')>(
    '@/lib/firebase/storage'
  );
  return { ...actual, uploadReferenceBytes: mockUploadReferenceBytes };
});

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
  mockFirestoreSet.mockReset();
});

afterEach(() => {
  server.resetHandlers();
});

function pinSuccessHandlers() {
  return [
    http.get('https://api.pinterest.com/v5/pins/p1', () =>
      HttpResponse.json({
        id: 'p1',
        link: 'https://www.pinterest.com/pin/p1/',
        media: {
          media_type: 'image',
          images: { '1200x': { url: PIN_URL } },
        },
      })
    ),
    http.get(PIN_URL, () =>
      HttpResponse.arrayBuffer(FAKE_BYTES.buffer, {
        headers: { 'Content-Type': 'image/jpeg' },
      })
    ),
  ];
}

describe('ingestPinterestPin — Pinterest API errors', () => {
  it.each([
    [401, 'invalid_token'],
    [403, 'insufficient_scope'],
    [404, 'not_found'],
    [429, 'rate_limit'],
  ] as const)(
    'returns reason=%s on Pinterest %i',
    async (status, expectedReason) => {
      server.use(
        http.get(
          'https://api.pinterest.com/v5/pins/p1',
          () => new HttpResponse(null, { status })
        )
      );
      const result = await ingestPinterestPin({
        userId: 'alice',
        pinId: 'p1',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe(expectedReason);
      expect(mockUploadReferenceBytes).not.toHaveBeenCalled();
      expect(mockFirestoreSet).not.toHaveBeenCalled();
    }
  );
});

describe('ingestPinterestPin — image fetch errors', () => {
  it('returns image_fetch_failed when CDN GET returns 500', async () => {
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json({
          id: 'p1',
          link: null,
          media: {
            media_type: 'image',
            images: { '1200x': { url: PIN_URL } },
          },
        })
      ),
      http.get(PIN_URL, () => new HttpResponse(null, { status: 500 }))
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('image_fetch_failed');
    expect(mockUploadReferenceBytes).not.toHaveBeenCalled();
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

describe('ingestPinterestPin — Storage helper failures', () => {
  it('propagates storage_failure and skips Firestore write', async () => {
    server.use(...pinSuccessHandlers());
    mockUploadReferenceBytes.mockResolvedValueOnce({
      ok: false,
      reason: 'storage_failure',
      message: 'emulator 5xx',
    });
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('storage_failure');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

describe('ingestPinterestPin — Firestore write failures', () => {
  it('returns firestore_failure and logs identifiers when Firestore throws', async () => {
    server.use(...pinSuccessHandlers());
    mockUploadReferenceBytes.mockResolvedValueOnce({
      ok: true,
      storagePath: 'users/alice/references/r1.jpg',
    });
    const error = new Error('grpc unavailable');
    (error as { code?: string }).code = 'unavailable';
    mockFirestoreSet.mockRejectedValueOnce(error);

    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      consoleSpy.mockRestore();
      return;
    }
    expect(result.reason).toBe('firestore_failure');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ingest] firestore write failed after storage write succeeded',
      expect.objectContaining({
        uid: 'alice',
        storagePath: 'users/alice/references/r1.jpg',
        code: 'unavailable',
        message: 'grpc unavailable',
      })
    );
    consoleSpy.mockRestore();
  });
});

describe('ingestPinterestPin — unsupported media type', () => {
  it('returns unsupported_media_type for video pins (no Storage / Firestore writes)', async () => {
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json({
          id: 'p1',
          link: null,
          media: {
            media_type: 'video',
            images: { '1200x': { url: PIN_URL } },
          },
        })
      )
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unsupported_media_type');
    expect(mockUploadReferenceBytes).not.toHaveBeenCalled();
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

/**
 * c6-pinterest-ingest — variant selection fallback chain.
 *
 * Fallback order: 1200x → 600x → 400x300 → 150x150. The first available
 * wins. Asserts which CDN URL gets fetched by recording the URL the MSW
 * handler intercepts.
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

const URL_1200 = 'https://i.pinimg.com/1200x/aa.jpg';
const URL_600 = 'https://i.pinimg.com/600x/bb.jpg';
const URL_400 = 'https://i.pinimg.com/400x300/cc.jpg';
const URL_150 = 'https://i.pinimg.com/150x150/dd.jpg';

const mockUploadReferenceBytes = vi.fn(async ({ uid, refId }) => ({
  ok: true as const,
  storagePath: `users/${uid}/references/${refId}.jpg`,
}));
const mockFirestoreSet = vi.fn().mockResolvedValue({});

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

function pinPayload(images: Record<string, { url: string }>) {
  return {
    id: 'p1',
    link: 'https://www.pinterest.com/pin/p1/',
    media: { media_type: 'image', images },
  };
}

function recordingImageHandler() {
  const fetched: string[] = [];
  const handlers = [URL_1200, URL_600, URL_400, URL_150].map((url) =>
    http.get(url, () => {
      fetched.push(url);
      return HttpResponse.arrayBuffer(FAKE_BYTES.buffer, {
        headers: { 'Content-Type': 'image/jpeg' },
      });
    })
  );
  return { handlers, fetched };
}

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
  mockUploadReferenceBytes.mockClear();
  mockFirestoreSet.mockClear().mockResolvedValue({});
});

afterEach(() => {
  server.resetHandlers();
});

describe('ingestPinterestPin — variant selection', () => {
  it('picks 1200x when all four variants are present', async () => {
    const { handlers, fetched } = recordingImageHandler();
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json(
          pinPayload({
            '1200x': { url: URL_1200 },
            '600x': { url: URL_600 },
            '400x300': { url: URL_400 },
            '150x150': { url: URL_150 },
          })
        )
      ),
      ...handlers
    );

    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(true);
    expect(fetched).toEqual([URL_1200]);
  });

  it('falls back to 600x when 1200x is absent', async () => {
    const { handlers, fetched } = recordingImageHandler();
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json(
          pinPayload({
            '600x': { url: URL_600 },
            '400x300': { url: URL_400 },
          })
        )
      ),
      ...handlers
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(true);
    expect(fetched).toEqual([URL_600]);
  });

  it('falls back to 400x300 when only 400x300 + 150x150 are present', async () => {
    const { handlers, fetched } = recordingImageHandler();
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json(
          pinPayload({
            '400x300': { url: URL_400 },
            '150x150': { url: URL_150 },
          })
        )
      ),
      ...handlers
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(true);
    expect(fetched).toEqual([URL_400]);
  });

  it('falls back to 150x150 when nothing larger is present', async () => {
    const { handlers, fetched } = recordingImageHandler();
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json(pinPayload({ '150x150': { url: URL_150 } }))
      ),
      ...handlers
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(true);
    expect(fetched).toEqual([URL_150]);
  });

  it('returns no_image_variant when media.images is empty', async () => {
    server.use(
      http.get('https://api.pinterest.com/v5/pins/p1', () =>
        HttpResponse.json(pinPayload({}))
      )
    );
    const result = await ingestPinterestPin({
      userId: 'alice',
      pinId: 'p1',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no_image_variant');
    expect(mockUploadReferenceBytes).not.toHaveBeenCalled();
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

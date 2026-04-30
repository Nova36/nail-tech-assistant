/**
 * c7-upload-ingest-route — POST /api/references/upload route handler tests.
 *
 * Strategy: directly invoke the exported POST function with a constructed
 * NextRequest + FormData. ingestUpload is mocked to keep this test layer
 * focused on the route's request validation, status codes, and discriminated
 * envelope shape — the ingest function has its own coverage in
 * tests/unit/references/ingest-upload-*.test.ts.
 *
 * The file is named .tsx purely so the main jsdom lane (`tests/integration/
 * **\/*.test.tsx` in vitest.config.ts) picks it up. There is no JSX inside.
 *
 * @vitest-environment node
 *
 * Per-file env override: jsdom's Request polyfill does not encode a FormData
 * body into a multipart/form-data byte stream the way Node 20's undici fetch
 * does, so the outgoing Content-Type header lands empty and every request
 * trips the route's `unsupported_content_type` guard. Running this file in
 * node restores native FormData → multipart encoding and lets the validation
 * pipeline exercise its real branches.
 */
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header bytes
const ROUTE_URL = 'https://nail-tech.example.com/api/references/upload';

const mockGetSession = vi.fn();
const mockIngestUpload = vi.fn();

vi.mock('@/lib/firebase/session', () => ({
  getSession: mockGetSession,
}));

vi.mock('@/lib/references/ingest', () => ({
  ingestUpload: mockIngestUpload,
}));

let POST: typeof import('@/app/api/references/upload/route').POST;

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
  // The route module pulls in @/lib/references/ingest which transitively
  // imports @/lib/pinterest/client — stub the token so module evaluation
  // succeeds even though this layer mocks ingestUpload entirely.
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'ptest_unused_for_upload_tests');

  const mod = await import('@/app/api/references/upload/route');
  POST = mod.POST;
});

beforeEach(() => {
  mockGetSession.mockReset();
  mockIngestUpload.mockReset();
});

function makeMultipartRequest(form: FormData): NextRequest {
  // FormData → multipart Request via the Fetch API. Browsers + undici both
  // assemble correct multipart/form-data boundaries for FormData bodies.
  const req = new Request(ROUTE_URL, { method: 'POST', body: form });
  return new NextRequest(req);
}

function jpegFile(name = 'nail.jpg', sizeOverride?: number): File {
  const bytes = sizeOverride
    ? new Uint8Array(sizeOverride)
    : FAKE_BYTES.slice();
  return new File([bytes], name, { type: 'image/jpeg' });
}

describe('POST /api/references/upload — happy path', () => {
  it('200 + reference body for an authenticated JPEG upload under 10 MB', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: true,
      reference: {
        id: 'ref-1',
        userId: 'alice-uid',
        source: 'upload',
        sourceUrl: null,
        storagePath: 'users/alice-uid/references/ref-1.jpg',
        pinterestPinId: null,
        createdAt: '2026-04-30T00:00:00.000Z',
      },
    });

    const form = new FormData();
    form.append('file', jpegFile());
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reference.source).toBe('upload');
    expect(body.reference.pinterestPinId).toBeNull();
    expect(body.reference.userId).toBe('alice-uid');

    expect(mockIngestUpload).toHaveBeenCalledTimes(1);
    const callArg = mockIngestUpload.mock.calls[0]?.[0];
    expect(callArg.userId).toBe('alice-uid');
    expect(callArg.contentType).toBe('image/jpeg');
    expect(callArg.originalFilename).toBe('nail.jpg');
    // bytes is a Buffer/Uint8Array carrying the file body
    expect(callArg.bytes.length).toBe(FAKE_BYTES.length);
  });

  it('accepts HEIC and threads it through without rewriting the content type', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: true,
      reference: {
        id: 'ref-2',
        userId: 'alice-uid',
        source: 'upload',
        sourceUrl: null,
        storagePath: 'users/alice-uid/references/ref-2.heic',
        pinterestPinId: null,
        createdAt: '2026-04-30T00:00:00.000Z',
      },
    });

    const form = new FormData();
    form.append(
      'file',
      new File([FAKE_BYTES], 'phone.heic', { type: 'image/heic' })
    );
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reference.storagePath.endsWith('.heic')).toBe(true);
    expect(mockIngestUpload.mock.calls[0]?.[0].contentType).toBe('image/heic');
  });

  it('normalizes HEIF → HEIC before calling ingestUpload (c5 helper rejects heif)', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: true,
      reference: {
        id: 'ref-3',
        userId: 'alice-uid',
        source: 'upload',
        sourceUrl: null,
        storagePath: 'users/alice-uid/references/ref-3.heic',
        pinterestPinId: null,
        createdAt: '2026-04-30T00:00:00.000Z',
      },
    });

    const form = new FormData();
    form.append(
      'file',
      new File([FAKE_BYTES], 'phone.heif', { type: 'image/heif' })
    );
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(200);
    expect(mockIngestUpload.mock.calls[0]?.[0].contentType).toBe('image/heic');
  });
});

describe('POST /api/references/upload — auth + content-type guards', () => {
  it('401 unauthorized when session is missing — does not call ingestUpload', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const form = new FormData();
    form.append('file', jpegFile());
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('unauthorized');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });

  it('415 unsupported_content_type when Content-Type is application/json', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(ROUTE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hello: 'world' }),
      })
    );
    const res = await POST(req);

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('unsupported_content_type');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });
});

describe('POST /api/references/upload — file field validations', () => {
  it('400 missing_file when the multipart body has no `file` field', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    const form = new FormData();
    form.append('something_else', 'x');
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('missing_file');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });

  it('400 empty_file when the file field has 0 bytes', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    const form = new FormData();
    form.append(
      'file',
      new File([new Uint8Array()], 'empty.jpg', { type: 'image/jpeg' })
    );
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('empty_file');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });

  it('413 file_too_large when the file exceeds 10 MB', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    const form = new FormData();
    const elevenMb = 11 * 1024 * 1024;
    form.append('file', jpegFile('big.jpg', elevenMb));
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('file_too_large');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });

  it('415 unsupported_file_type when the file is application/pdf', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    const form = new FormData();
    form.append(
      'file',
      new File([FAKE_BYTES], 'doc.pdf', { type: 'application/pdf' })
    );
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('unsupported_file_type');
    expect(mockIngestUpload).not.toHaveBeenCalled();
  });
});

describe('POST /api/references/upload — session-uid trust', () => {
  it('uses session uid only — ignores any userId field smuggled in formData', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: true,
      reference: {
        id: 'ref-4',
        userId: 'alice-uid',
        source: 'upload',
        sourceUrl: null,
        storagePath: 'users/alice-uid/references/ref-4.jpg',
        pinterestPinId: null,
        createdAt: '2026-04-30T00:00:00.000Z',
      },
    });
    const form = new FormData();
    form.append('userId', 'mallory-uid'); // spoof attempt
    form.append('file', jpegFile());
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(200);
    expect(mockIngestUpload).toHaveBeenCalledTimes(1);
    expect(mockIngestUpload.mock.calls[0]?.[0].userId).toBe('alice-uid');
  });
});

describe('POST /api/references/upload — ingestUpload failure surfaces', () => {
  it('500 storage_failure when ingestUpload returns storage_failure', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: false,
      reason: 'storage_failure',
      message: 'bucket 5xx',
    });
    const form = new FormData();
    form.append('file', jpegFile());
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('storage_failure');
  });

  it('500 firestore_failure when ingestUpload returns firestore_failure', async () => {
    mockGetSession.mockResolvedValueOnce({
      uid: 'alice-uid',
      email: 'alice@example.com',
      name: null,
    });
    mockIngestUpload.mockResolvedValueOnce({
      ok: false,
      reason: 'firestore_failure',
      message: 'grpc unavailable',
    });
    const form = new FormData();
    form.append('file', jpegFile());
    const res = await POST(makeMultipartRequest(form));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('firestore_failure');
  });
});

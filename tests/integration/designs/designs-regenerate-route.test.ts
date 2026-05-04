// @vitest-environment node
/**
 * d8-regenerate-route — emulator-backed integration test for
 * POST /api/designs/[id]/regenerate
 *
 * The route shells out to the existing generateDesign pipeline (server action)
 * which already uses STORED design inputs (primary + secondary references,
 * promptText, nailShape) — never the request body. Body is empty/ignored.
 *
 * Mocks the `generate` provider to avoid live Vertex AI calls, but exercises
 * the real Firestore + Storage emulators booted by `firebase emulators:exec`.
 *
 * Asserts the route's contract:
 *   - 200 success → { status: 'success', generationId, imageUrl? }
 *   - 4xx failure → { status: 'failure', errorCode, message }
 *   - auth via getSession(req): 401 if unauthenticated
 *   - cross-user owner mismatch → 403/404
 *   - stale primary reference → controlled failure (no provider call swallowed)
 *   - generate provider receives stored inputs only — UI-state body is ignored
 */
import { NextRequest } from 'next/server';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

process.env.PINTEREST_ACCESS_TOKEN ??= 'test-unused';

const mockGenerate = vi.fn();
vi.mock('@/lib/ai/generate', () => ({ generate: mockGenerate }));

const mockGetSession = vi.fn();
vi.mock('@/lib/firebase/session', () => ({
  getSession: mockGetSession,
  getSessionForServerAction: mockGetSession,
}));

const ALICE_UID = 'alice-regen-route-uid';
const BOB_UID = 'bob-regen-route-uid';
const ROUTE_URL = 'http://localhost:3100/api/designs';
const STORED_PROMPT = 'matte rose with chrome accents';

let POST: (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;
let designConverter: typeof import('@/lib/firestore/converters').designConverter;
let referenceConverter: typeof import('@/lib/firestore/converters').referenceConverter;
let getServerFirebaseStorage: typeof import('@/lib/firebase/storage').getServerFirebaseStorage;

const FAKE_PNG = Buffer.from('fake-png-bytes');

async function makeParams(id: string): Promise<{ id: string }> {
  return { id };
}

let db: ReturnType<typeof import('firebase-admin/firestore').getFirestore>;
let designId: string;
let primaryReferenceId: string;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Run via `pnpm test:rules` so Firestore + Storage emulators are booted.'
    );
  }

  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= 'test.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= 'nail-tech-assistant';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??=
    'nail-tech-assistant.appspot.com';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= '123456789';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= '1:123456789:web:abc123';
  process.env.FIREBASE_PROJECT_ID ??= 'nail-tech-assistant';
  process.env.FIREBASE_CLIENT_EMAIL ??=
    'sa@nail-tech-assistant.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY ??=
    '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  process.env.ALLOWED_EMAIL ??= 'allowed@example.com';
  process.env.APP_URL ??= 'http://localhost:3100';

  const serverMod = await import('@/lib/firebase/server');
  createServerFirebaseAdmin = serverMod.createServerFirebaseAdmin;
  const firestoreMod = await import('firebase-admin/firestore');
  getFirestoreFn = firestoreMod.getFirestore;
  const convertersMod = await import('@/lib/firestore/converters');
  designConverter = convertersMod.designConverter;
  referenceConverter = convertersMod.referenceConverter;
  const storageMod = await import('@/lib/firebase/storage');
  getServerFirebaseStorage = storageMod.getServerFirebaseStorage;

  db = getFirestoreFn(createServerFirebaseAdmin());

  const routeMod = await import('@/app/api/designs/[id]/regenerate/route');
  POST = routeMod.POST;
});

beforeEach(async () => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();

  const suffix = Date.now() + '-' + Math.random().toString(36).slice(2);
  designId = 'design-regen-' + suffix;
  primaryReferenceId = 'ref-regen-' + suffix;

  // Seed primary reference + bytes
  const refStoragePath =
    'users/' + ALICE_UID + '/references/' + primaryReferenceId + '.jpg';
  await db
    .collection('references')
    .doc(primaryReferenceId)
    .withConverter(referenceConverter)
    .set({
      id: primaryReferenceId,
      userId: ALICE_UID,
      source: 'pinterest',
      sourceUrl: 'https://pin.it/' + suffix,
      storagePath: refStoragePath,
      pinterestPinId: 'pin-' + suffix,
      createdAt: new Date().toISOString(),
    });
  const bucket = getServerFirebaseStorage();
  await bucket.file(refStoragePath).save(FAKE_PNG, {
    contentType: 'image/jpeg',
  });

  // Seed design with stored prompt + shape + primary reference
  await db
    .collection('designs')
    .doc(designId)
    .withConverter(designConverter)
    .set({
      id: designId,
      userId: ALICE_UID,
      name: null,
      primaryReferenceId,
      secondaryReferenceIds: [],
      promptText: STORED_PROMPT,
      nailShape: 'almond',
      latestGenerationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
});

afterAll(() => {
  // emulator teardown owned by firebase emulators:exec
});

function buildReq(id: string, body: unknown = {}): NextRequest {
  return new NextRequest(
    new Request(`${ROUTE_URL}/${id}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/designs/[id]/regenerate', () => {
  it('happy path: provider receives STORED inputs and route returns 200 success envelope', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: FAKE_PNG,
      mimeType: 'image/png',
      metadata: null,
    });

    // Send a body that would be a UI-state leak if the route honored it.
    const req = buildReq(designId, {
      promptText: 'evil-leaked-prompt',
      nailShape: 'square',
    });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(typeof body.generationId).toBe('string');

    // The provider must have seen the STORED prompt, not the body's leak.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const call = mockGenerate.mock.calls[0][0];
    expect(call.promptText).toBe(STORED_PROMPT);
    expect(call.nailShape).toBe('almond');

    // Design's latestGenerationId now points at the new generation.
    const designSnap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(designSnap.data()?.latestGenerationId).toBe(body.generationId);
  });

  it('unauthenticated → 401', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = buildReq(designId);
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('cross-user POST → 403 or 404 (no provider call)', async () => {
    mockGetSession.mockResolvedValue({
      uid: BOB_UID,
      email: 'bob@test.com',
      name: null,
    });
    const req = buildReq(designId);
    const res = await POST(req, { params: makeParams(designId) });
    expect([403, 404]).toContain(res.status);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('non-existent design → 404 (no provider call)', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const ghost = 'does-not-exist-' + Date.now();
    const req = buildReq(ghost);
    const res = await POST(req, { params: makeParams(ghost) });
    expect(res.status).toBe(404);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('provider failure surfaces as 4xx failure envelope (no false-success)', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'rate_limit',
      message: 'rate limit exceeded',
    });

    const req = buildReq(designId);
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = await res.json();
    expect(body.status).toBe('failure');
    expect(body.errorCode).toBeDefined();
  });

  it('missing primary reference → controlled failure, NO provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    // Delete the primary reference doc so the design points at a stale id.
    await db.collection('references').doc(primaryReferenceId).delete();

    const req = buildReq(designId);
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = await res.json();
    expect(body.status).toBe('failure');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('body is ignored entirely — empty body also succeeds', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: FAKE_PNG,
      mimeType: 'image/png',
      metadata: null,
    });

    // No body.
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/regenerate`, {
        method: 'POST',
      })
    );
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
  });
});

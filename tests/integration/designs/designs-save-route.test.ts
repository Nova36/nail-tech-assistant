// @vitest-environment node
/**
 * d7-save-route — emulator-backed integration test for POST /api/designs/[id]/save
 *
 * Mirrors the d2 shape-route harness (designs-shape-route.test.tsx). Uses real
 * Firestore + Auth emulators booted by `firebase emulators:exec` (rules lane).
 *
 * Body contract:
 *   { name: string | null }   // null or '' = unnamed; non-empty up to 80 chars
 *
 * Owner-only field-scoped write to design.name + updatedAt. Generation provider
 * must NOT be called.
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

const ALICE_UID = 'alice-save-route-uid';
const BOB_UID = 'bob-save-route-uid';
const ROUTE_URL = 'http://localhost:3100/api/designs';

let POST: (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;
let designConverter: typeof import('@/lib/firestore/converters').designConverter;

async function makeParams(id: string): Promise<{ id: string }> {
  return { id };
}

const baseDesign = {
  userId: ALICE_UID,
  name: null,
  primaryReferenceId: 'ref-1',
  secondaryReferenceIds: [] as string[],
  promptText: null,
  nailShape: 'almond' as const,
  latestGenerationId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let db: ReturnType<typeof import('firebase-admin/firestore').getFirestore>;
let designId: string;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Run via `pnpm test:rules` so Firestore emulator is booted.'
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

  db = getFirestoreFn(createServerFirebaseAdmin());

  const routeMod = await import('@/app/api/designs/[id]/save/route');
  POST = routeMod.POST;
});

beforeEach(async () => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();
  designId =
    'design-save-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const design = { ...baseDesign, id: designId };
  await db
    .collection('designs')
    .doc(designId)
    .withConverter(designConverter)
    .set(design);
});

afterAll(() => {
  // emulator teardown owned by firebase emulators:exec
});

function buildReq(designIdParam: string, body: unknown): NextRequest {
  return new NextRequest(
    new Request(`${ROUTE_URL}/${designIdParam}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

describe('POST /api/designs/[id]/save', () => {
  it('happy path: owner sets name → 200 + name persisted', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: 'Floral French Tips' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      status: 'saved',
      designId,
      name: 'Floral French Tips',
    });

    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    const data = snap.data();
    expect(data?.name).toBe('Floral French Tips');
    expect(data?.updatedAt).toBeTruthy();
  });

  it('null name clears to unnamed → 200 + name=null', async () => {
    // Seed with an existing name first
    await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .set({ ...baseDesign, id: designId, name: 'Prior Name' });

    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: null });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('saved');
    expect(body.name).toBeNull();

    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.data()?.name).toBeNull();
  });

  it('empty string name clears to unnamed → 200 + name=null', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: '' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBeNull();
  });

  it('whitespace-only name clears to unnamed', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: '   ' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBeNull();
  });

  it('name > 80 chars → 400 + design unchanged', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const longName = 'x'.repeat(81);
    const req = buildReq(designId, { name: longName });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);

    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.data()?.name).toBeNull();
  });

  it('exactly 80 chars → 200', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const exactName = 'y'.repeat(80);
    const req = buildReq(designId, { name: exactName });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
  });

  it('non-string name (number) → 400', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: 42 });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
  });

  it('extra body keys → 400', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, {
      name: 'ok',
      promptText: 'evil',
    });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
  });

  it('unauthenticated → 401', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = buildReq(designId, { name: 'whatever' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(401);
  });

  it('cross-user POST → 403 or 404', async () => {
    mockGetSession.mockResolvedValue({
      uid: BOB_UID,
      email: 'bob@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: 'hijack' });
    const res = await POST(req, { params: makeParams(designId) });
    expect([403, 404]).toContain(res.status);

    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.data()?.name).toBeNull();
  });

  it('non-existent design → 404', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq('does-not-exist-' + Date.now(), { name: 'ghost' });
    const res = await POST(req, {
      params: makeParams('does-not-exist-' + Date.now()),
    });
    expect(res.status).toBe(404);
  });

  it('generation provider is never called', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { name: 'safe' });
    await POST(req, { params: makeParams(designId) });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

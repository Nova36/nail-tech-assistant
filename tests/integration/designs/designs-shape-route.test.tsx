// @vitest-environment node
/**
 * d2-shape-route — emulator-backed integration test for PATCH /api/designs/[id]/shape
 *
 * Uses real Firestore + Auth emulators (booted by `firebase emulators:exec`).
 * Generation provider is mocked — this route must NOT call it.
 *
 * Per reference_jsdom_formdata_node_env.md: `@vitest-environment node` ensures
 * native fetch/Request behaviour for JSON bodies (jsdom gap is FormData only,
 * but node is correct here since we use getSession which depends on next/headers).
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

const ALICE_UID = 'alice-shape-route-uid';
const BOB_UID = 'bob-shape-route-uid';
const ROUTE_URL = 'http://localhost:3100/api/designs';

let PATCH: (
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

  const routeMod = await import('@/app/api/designs/[id]/shape/route');
  PATCH = routeMod.PATCH;
});

beforeEach(async () => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();
  // Create a fresh design for each test
  designId =
    'design-shape-' + Date.now() + '-' + Math.random().toString(36).slice(2);
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

describe('PATCH /api/designs/[id]/shape', () => {
  it('happy path: authenticated owner → 200 + nailShape persisted', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'coffin' }),
      })
    );

    const res = await PATCH(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'updated', nailShape: 'coffin' });

    // Firestore doc reflects nail_shape: 'coffin' and updatedAt bumped
    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    const data = snap.data();
    expect(data?.nailShape).toBe('coffin');
    expect(data?.updatedAt).toBeTruthy();
  });

  it('generation provider is never called', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'round' }),
      })
    );
    await PATCH(req, { params: makeParams(designId) });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('invalid shape → 400 + design unchanged', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'banana' }),
      })
    );
    const res = await PATCH(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);

    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.data()?.nailShape).toBe('almond');
  });

  it('extra body keys → 400', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'almond', name: 'evil' }),
      })
    );
    const res = await PATCH(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
  });

  it('unauthenticated → 401', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'oval' }),
      })
    );
    const res = await PATCH(req, { params: makeParams(designId) });
    expect(res.status).toBe(401);
  });

  it('cross-user PATCH → 403 or not_found', async () => {
    mockGetSession.mockResolvedValue({
      uid: BOB_UID,
      email: 'bob@test.com',
      name: null,
    });
    const req = new NextRequest(
      new Request(`${ROUTE_URL}/${designId}/shape`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailShape: 'stiletto' }),
      })
    );
    const res = await PATCH(req, { params: makeParams(designId) });
    expect([403, 404]).toContain(res.status);

    // Design must be unchanged
    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.data()?.nailShape).toBe('almond');
  });
});

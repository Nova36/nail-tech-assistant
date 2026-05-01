// @vitest-environment node
/**
 * d6 TDD — GET /api/designs/[id] DesignDetail loader
 *
 * Uses real Firestore emulator (booted by `pnpm test:rules` via
 * firebase emulators:exec). Generation provider is mocked — this
 * route must NOT call it.
 *
 * DesignDetail shape:
 *   { design: Design, references: { primary: Reference, secondary: Reference[],
 *     staleReferenceCount: number }, latestGeneration: Generation | null }
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

const ALICE_UID = 'alice-detail-route-uid';
const BOB_UID = 'bob-detail-route-uid';
const ROUTE_URL = 'http://localhost:3100/api/designs';

type GET_FN = (
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => Promise<Response>;

let GET: GET_FN;
let db: ReturnType<typeof import('firebase-admin/firestore').getFirestore>;
let designConverter: typeof import('@/lib/firestore/converters').designConverter;
let referenceConverter: typeof import('@/lib/firestore/converters').referenceConverter;
let generationConverter: typeof import('@/lib/firestore/converters').generationConverter;

const now = new Date().toISOString();

const baseRef = (id: string, userId = ALICE_UID) => ({
  id,
  userId,
  source: 'upload' as const,
  sourceUrl: null,
  storagePath: `users/${userId}/references/${id}.jpg`,
  pinterestPinId: null,
  createdAt: now,
});

const baseGeneration = (
  id: string,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  designId: 'will-be-set',
  userId: ALICE_UID,
  requestJson: {},
  resultStoragePath: null,
  providerResponseMetadata: null,
  status: 'success' as const,
  errorCode: null,
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

async function makeParams(id: string): Promise<{ id: string }> {
  return { id };
}

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
  const firestoreMod = await import('firebase-admin/firestore');
  const convertersMod = await import('@/lib/firestore/converters');

  db = firestoreMod.getFirestore(serverMod.createServerFirebaseAdmin());
  designConverter = convertersMod.designConverter;
  referenceConverter = convertersMod.referenceConverter;
  generationConverter = convertersMod.generationConverter;

  const routeMod = await import('@/app/api/designs/[id]/route');
  GET = routeMod.GET;
});

beforeEach(() => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();
});

afterAll(() => {
  // emulator teardown owned by firebase emulators:exec
});

async function seedDesign(overrides: Record<string, unknown> = {}) {
  const designId =
    'design-detail-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const primaryRef = baseRef('primary-' + designId);
  const secondaryRef = baseRef('secondary-' + designId);

  await db
    .collection('references')
    .doc(primaryRef.id)
    .withConverter(referenceConverter)
    .set(primaryRef);
  await db
    .collection('references')
    .doc(secondaryRef.id)
    .withConverter(referenceConverter)
    .set(secondaryRef);

  const design = {
    id: designId,
    userId: ALICE_UID,
    name: 'Test design',
    primaryReferenceId: primaryRef.id,
    secondaryReferenceIds: [secondaryRef.id],
    promptText: 'soft marble with gold',
    nailShape: 'almond' as const,
    latestGenerationId: null as string | null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };

  await db
    .collection('designs')
    .doc(designId)
    .withConverter(designConverter)
    .set(design);

  return {
    designId,
    primaryRefId: primaryRef.id,
    secondaryRefId: secondaryRef.id,
  };
}

describe('GET /api/designs/[id] — DesignDetail loader', () => {
  it('happy path: authenticated owner → 200 + full DesignDetail body', async () => {
    const { designId } = await seedDesign();
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('design');
    expect(body).toHaveProperty('references');
    expect(body).toHaveProperty('latestGeneration');
    // userId field on design
    expect(body.design.userId).toBe(ALICE_UID);
    // references shape
    expect(body.references).toHaveProperty('primary');
    expect(body.references).toHaveProperty('secondary');
    expect(body.references).toHaveProperty('staleReferenceCount');
    expect(body.references.staleReferenceCount).toBe(0);
  });

  it('owner field is userId (not ownerUid)', async () => {
    const { designId } = await seedDesign();
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });
    const body = await res.json();

    expect(body.design).toHaveProperty('userId');
    expect(body.design).not.toHaveProperty('ownerUid');
    expect(body.design.userId).toBe(ALICE_UID);
  });

  it('cross-user → 404 (existence not leaked)', async () => {
    const { designId } = await seedDesign();
    mockGetSession.mockResolvedValue({
      uid: BOB_UID,
      email: 'bob@test.com',
      name: null,
    });

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(404);
  });

  it('missing design → 404', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });

    const req = new NextRequest(
      new Request(`${ROUTE_URL}/nonexistent-design-id`)
    );
    const res = await GET(req, { params: makeParams('nonexistent-design-id') });

    expect(res.status).toBe(404);
  });

  it('design with deleted references → staleReferenceCount > 0; resolved list excludes missing', async () => {
    const designId =
      'design-stale-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const primaryRef = baseRef('primary-stale-' + designId);
    const deletedSecondaryId = 'deleted-secondary-ref-' + designId;

    // Only seed the primary ref; secondary ref is intentionally NOT seeded (simulates deletion)
    await db
      .collection('references')
      .doc(primaryRef.id)
      .withConverter(referenceConverter)
      .set(primaryRef);

    const design = {
      id: designId,
      userId: ALICE_UID,
      name: null,
      primaryReferenceId: primaryRef.id,
      secondaryReferenceIds: [deletedSecondaryId],
      promptText: null,
      nailShape: 'coffin' as const,
      latestGenerationId: null,
      createdAt: now,
      updatedAt: now,
    };

    await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .set(design);

    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.references.staleReferenceCount).toBeGreaterThan(0);
    const secondaryIds = body.references.secondary.map(
      (r: { id: string }) => r.id
    );
    expect(secondaryIds).not.toContain(deletedSecondaryId);
  });

  it('latestGenerationId === null → latestGeneration is null (no error)', async () => {
    const { designId } = await seedDesign({ latestGenerationId: null });
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.latestGeneration).toBeNull();
  });

  it('design with successful latestGenerationId → latestGeneration includes status, imageUrl, createdAt', async () => {
    const designId =
      'design-gen-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const genId = 'gen-' + designId;
    const primaryRef = baseRef('primary-gen-' + designId);

    await db
      .collection('references')
      .doc(primaryRef.id)
      .withConverter(referenceConverter)
      .set(primaryRef);

    const gen = {
      ...baseGeneration(genId),
      designId,
      resultStoragePath: `users/${ALICE_UID}/generations/${genId}.jpg`,
      status: 'success' as const,
    };
    await db
      .collection('generations')
      .doc(genId)
      .withConverter(generationConverter)
      .set(gen);

    const design = {
      id: designId,
      userId: ALICE_UID,
      name: null,
      primaryReferenceId: primaryRef.id,
      secondaryReferenceIds: [],
      promptText: null,
      nailShape: 'almond' as const,
      latestGenerationId: genId,
      createdAt: now,
      updatedAt: now,
    };
    await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .set(design);

    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.latestGeneration).not.toBeNull();
    expect(body.latestGeneration).toHaveProperty('status');
    expect(body.latestGeneration).toHaveProperty('createdAt');
    // imageUrl or resultStoragePath must be present
    const hasImageSurface =
      'imageUrl' in body.latestGeneration ||
      'resultStoragePath' in body.latestGeneration;
    expect(hasImageSurface).toBe(true);
  });

  it('generation provider is never called', async () => {
    const { designId } = await seedDesign();
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    await GET(req, { params: makeParams(designId) });

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('unauthenticated → 401', async () => {
    const { designId } = await seedDesign();
    mockGetSession.mockResolvedValue(null);

    const req = new NextRequest(new Request(`${ROUTE_URL}/${designId}`));
    const res = await GET(req, { params: makeParams(designId) });

    expect(res.status).toBe(401);
  });
});

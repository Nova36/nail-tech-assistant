// @vitest-environment node
/**
 * e4-chat-route — emulator-backed integration test for
 * POST /api/designs/[id]/chat
 *
 * The chat route inlines the d8 regenerate pipeline (no `actions.ts` import,
 * per feedback_actions_file_transitive_env). It mounts auth via getSession,
 * loads the stored design + references, validates the message, loads prior
 * chat_turns, calls e2 accumulateChatInstructions to compose the provider
 * prompt, persists a chat_turn (status:'pending'), runs the generation
 * pipeline (e3 lifecycle linkage), and finalizes the chat_turn via e3 or by
 * marking it 'failed' on any post-create failure path.
 *
 * Mocks the `generate` provider — no Vertex AI calls. Real Firestore + Storage
 * emulators (booted by `firebase emulators:exec`).
 *
 * Asserts the route's contract:
 *   - 200 success → { status:'success', chatTurnId, generationId }
 *   - 4xx failure → { status:'failure', errorCode, message }
 *   - 409 sessionFull when 5 prior turns exist (no chat_turn write, no provider call)
 *   - 401 unauth, 403/404 cross-user, 404 non-existent design
 *   - empty / whitespace / >500-char message → 400 (no side effects)
 *   - stale primary reference → controlled failure, no provider call
 *   - provider failure → chat_turn ends 'failed', non-200 envelope
 *   - prior turns + new message → provider promptText contains compiled
 *     [Refinement N]: blocks in chronological order
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
vi.mock('@/lib/ai/generate', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/ai/generate')>(
      '@/lib/ai/generate'
    );
  return { ...actual, generate: mockGenerate };
});

const mockGetSession = vi.fn();
vi.mock('@/lib/firebase/session', () => ({
  getSession: mockGetSession,
  getSessionForServerAction: mockGetSession,
}));

const ALICE_UID = 'alice-chat-route-uid';
const BOB_UID = 'bob-chat-route-uid';
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

  const routeMod = await import('@/app/api/designs/[id]/chat/route');
  POST = routeMod.POST;
});

beforeEach(async () => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();

  const suffix = Date.now() + '-' + Math.random().toString(36).slice(2);
  designId = 'design-chat-' + suffix;
  primaryReferenceId = 'ref-chat-' + suffix;

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

function buildReq(id: string, body: unknown): NextRequest {
  return new NextRequest(
    new Request(`${ROUTE_URL}/${id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

async function seedChatTurn(
  designIdInput: string,
  turnId: string,
  message: string,
  createdAt: string
) {
  await db
    .collection('designs')
    .doc(designIdInput)
    .collection('chat_turns')
    .doc(turnId)
    .set({
      userId: ALICE_UID,
      designId: designIdInput,
      message,
      status: 'success',
      generationId: 'gen-prior-' + turnId,
      createdAt,
      updatedAt: createdAt,
    });
}

type StoredChatTurn = {
  id: string;
  userId: string;
  designId: string;
  message: string;
  status: 'pending' | 'success' | 'failed';
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
};

async function listChatTurns(designIdInput: string): Promise<StoredChatTurn[]> {
  const snap = await db
    .collection('designs')
    .doc(designIdInput)
    .collection('chat_turns')
    .orderBy('createdAt', 'asc')
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<StoredChatTurn, 'id'>),
  }));
}

describe('POST /api/designs/[id]/chat — happy path', () => {
  it('0 prior turns: 200 success envelope and chat_turn persisted with generationId linkage', async () => {
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

    const req = buildReq(designId, { message: 'add gold accents' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(typeof body.chatTurnId).toBe('string');
    expect(typeof body.generationId).toBe('string');

    // Provider received the new refinement message in its promptText slot.
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const call = mockGenerate.mock.calls[0][0];
    expect(typeof call.promptText).toBe('string');
    expect(call.promptText).toContain('add gold accents');

    // chat_turn doc exists, links to the new generation, status:'success'.
    const turns = await listChatTurns(designId);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      userId: ALICE_UID,
      designId,
      message: 'add gold accents',
      status: 'success',
      generationId: body.generationId,
    });
  });

  it('multi-prior: provider promptText includes accumulated [Refinement N]: blocks in chronological order', async () => {
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

    await seedChatTurn(designId, 't-1', 'first prior', '2026-05-01T00:00:00Z');
    await seedChatTurn(designId, 't-2', 'second prior', '2026-05-01T00:01:00Z');

    const req = buildReq(designId, { message: 'third new' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(200);

    const call = mockGenerate.mock.calls[0][0];
    const prompt: string = call.promptText;
    expect(prompt).toContain('[Refinement 1]: first prior');
    expect(prompt).toContain('[Refinement 2]: second prior');
    expect(prompt).toContain('[Refinement 3]: third new');
    // Chronological: first must appear before second, second before third.
    expect(prompt.indexOf('[Refinement 1]')).toBeLessThan(
      prompt.indexOf('[Refinement 2]')
    );
    expect(prompt.indexOf('[Refinement 2]')).toBeLessThan(
      prompt.indexOf('[Refinement 3]')
    );
  });
});

describe('POST /api/designs/[id]/chat — input validation', () => {
  it('empty message → 400, no chat_turn created, no provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { message: '' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
    const turns = await listChatTurns(designId);
    expect(turns).toHaveLength(0);
  });

  it('whitespace-only message → 400, no side effects', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { message: '   \n\t' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('>500 char message → 400, no side effects', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const req = buildReq(designId, { message: 'a'.repeat(501) });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/designs/[id]/chat — auth and authorization', () => {
  it('unauthenticated → 401, no provider call', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = buildReq(designId, { message: 'test' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(401);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('cross-user → 403 or 404, no provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: BOB_UID,
      email: 'bob@test.com',
      name: null,
    });
    const req = buildReq(designId, { message: 'test' });
    const res = await POST(req, { params: makeParams(designId) });
    expect([403, 404]).toContain(res.status);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('non-existent design → 404, no provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    const ghost = 'does-not-exist-' + Date.now();
    const req = buildReq(ghost, { message: 'test' });
    const res = await POST(req, { params: makeParams(ghost) });
    expect(res.status).toBe(404);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/designs/[id]/chat — guards and limits', () => {
  it('5-turn cap: 6th attempt → 409 sessionFull, no chat_turn create, no provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    for (let i = 0; i < 5; i += 1) {
      const ts = `2026-05-01T00:0${i}:00Z`;
      await seedChatTurn(designId, `t-${i}`, `prior ${i + 1}`, ts);
    }

    const req = buildReq(designId, { message: 'sixth attempt' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBe(409);
    expect(mockGenerate).not.toHaveBeenCalled();

    const turns = await listChatTurns(designId);
    expect(turns).toHaveLength(5);
    expect(turns.every((t) => t.message !== 'sixth attempt')).toBe(true);
  });

  it('stale primary reference → 4xx failure, no provider call', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    await db.collection('references').doc(primaryReferenceId).delete();

    const req = buildReq(designId, { message: 'test' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/designs/[id]/chat — failure orphan prevention', () => {
  it('provider failure → chat_turn ends status:"failed", non-200 envelope', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'refusal',
      message: 'blocked by provider',
      metadata: { retryCount: 0, durationMs: 100 },
    });

    const req = buildReq(designId, { message: 'orphan-prevention probe' });
    const res = await POST(req, { params: makeParams(designId) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = await res.json();
    expect(body.status).toBe('failure');
    expect(body.errorCode).toBeDefined();

    // chat_turn must NOT remain stuck at 'pending' — orphan prevention.
    const turns = await listChatTurns(designId);
    expect(turns).toHaveLength(1);
    expect(turns[0].status).toBe('failed');
    expect(turns[0].message).toBe('orphan-prevention probe');
  });
});

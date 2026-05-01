// @vitest-environment node
/**
 * c16 — generateDesign end-to-end integration test.
 *
 * Real Firestore + Storage emulators (booted via `firebase emulators:exec`).
 * `generate` from lib/ai/generate is mocked to avoid live Vertex AI calls.
 * Asserts: success envelope, generation row at 'success', design.latestGenerationId
 * updated, bytes readable at users/{uid}/generations/{genId}.png, metadata persisted.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.PINTEREST_ACCESS_TOKEN ??= 'test';

const mockGenerate = vi.fn();

vi.mock('@/lib/ai/generate', () => ({
  generate: mockGenerate,
}));

const ALICE_UID = 'alice-generate-design-uid';
const FAKE_PNG = Buffer.from('fake-png-bytes');

let generateDesign: typeof import('@/app/(authenticated)/design/actions').generateDesign;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;
let designConverter: typeof import('@/lib/firestore/converters').designConverter;
let referenceConverter: typeof import('@/lib/firestore/converters').referenceConverter;
let generationConverter: typeof import('@/lib/firestore/converters').generationConverter;
let getServerFirebaseStorage: typeof import('@/lib/firebase/storage').getServerFirebaseStorage;

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

  const sessionMod = await import('@/lib/firebase/session');
  vi.spyOn(sessionMod, 'getSessionForServerAction').mockResolvedValue({
    uid: ALICE_UID,
    email: 'alice@test.com',
    name: null,
  });

  const actionsMod = await import('@/app/(authenticated)/design/actions');
  generateDesign = actionsMod.generateDesign;

  const serverMod = await import('@/lib/firebase/server');
  createServerFirebaseAdmin = serverMod.createServerFirebaseAdmin;

  const firestoreMod = await import('firebase-admin/firestore');
  getFirestoreFn = firestoreMod.getFirestore;

  const convertersMod = await import('@/lib/firestore/converters');
  designConverter = convertersMod.designConverter;
  referenceConverter = convertersMod.referenceConverter;
  generationConverter = convertersMod.generationConverter;

  const storageMod = await import('@/lib/firebase/storage');
  getServerFirebaseStorage = storageMod.getServerFirebaseStorage;
});

afterAll(() => {
  // emulator teardown owned by firebase emulators:exec
});

describe('generateDesign — emulator end-to-end', () => {
  it('full pipeline: writes success generation row, updates design.latestGenerationId, bytes readable', async () => {
    const db = getFirestoreFn(createServerFirebaseAdmin());

    // Write primary reference
    const primaryRef = {
      id: 'ref-primary-e2e',
      userId: ALICE_UID,
      source: 'pinterest' as const,
      sourceUrl: 'https://pin.it/e2e',
      storagePath: 'users/' + ALICE_UID + '/references/ref-primary-e2e.jpg',
      pinterestPinId: 'pin-e2e',
      createdAt: new Date().toISOString(),
    };
    await db
      .collection('references')
      .doc(primaryRef.id)
      .withConverter(referenceConverter)
      .set(primaryRef);

    // Write secondary reference
    const secondaryRef = {
      id: 'ref-secondary-e2e',
      userId: ALICE_UID,
      source: 'upload' as const,
      sourceUrl: null,
      storagePath: 'users/' + ALICE_UID + '/references/ref-secondary-e2e.png',
      pinterestPinId: null,
      createdAt: new Date().toISOString(),
    };
    await db
      .collection('references')
      .doc(secondaryRef.id)
      .withConverter(referenceConverter)
      .set(secondaryRef);

    // Write design
    const designId = 'design-e2e-' + Date.now();
    const design = {
      id: designId,
      userId: ALICE_UID,
      name: null,
      primaryReferenceId: primaryRef.id,
      secondaryReferenceIds: [secondaryRef.id],
      promptText: 'glossy ombre',
      nailShape: 'coffin' as const,
      latestGenerationId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .set(design);

    // Mock generate to return success
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: FAKE_PNG,
      mimeType: 'image/png',
      metadata: { retryCount: 1, durationMs: 8500 },
    });

    const result = await generateDesign({ designId });

    // Envelope asserts
    expect(result).toMatchObject({
      status: 'success',
      generationId: expect.any(String),
      imageUrl: expect.any(String),
    });

    if (result.status !== 'success') return;
    const genId = result.generationId;

    // Generation row at success
    const genSnap = await db
      .collection('generations')
      .doc(genId)
      .withConverter(generationConverter)
      .get();
    expect(genSnap.exists).toBe(true);
    const genData = genSnap.data();
    expect(genData).toMatchObject({
      id: genId,
      designId,
      userId: ALICE_UID,
      status: 'success',
    });
    expect(genData?.providerResponseMetadata).toMatchObject({
      retryCount: 1,
      durationMs: 8500,
    });

    // design.latestGenerationId updated
    const designSnap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(designSnap.data()?.latestGenerationId).toBe(genId);

    // Output bytes readable at expected storage path
    const bucket = getServerFirebaseStorage();
    const filePath = 'users/' + ALICE_UID + '/generations/' + genId + '.png';
    const [fileExists] = await bucket.file(filePath).exists();
    expect(fileExists).toBe(true);
  });
});

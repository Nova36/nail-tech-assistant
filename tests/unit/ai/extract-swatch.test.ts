// @vitest-environment node
/**
 * d10 — extractNailSwatch unit tests (TDD-red).
 * Mocks @google/genai's GoogleGenAI + lib/firebase/storage.
 * Asserts: never throws; bucket.save called with designs/{designId}/swatch.png;
 * returns { ok: true, storagePath } on happy path; logs and returns { ok: false }
 * on every failure mode (Vertex throws, no inlineData, bucket.save throws,
 * source bytes unreadable).
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();
const mockReadReferenceBytes = vi.fn();
const mockBucketSave = vi.fn();
const mockBucketFile = vi.fn(() => ({ save: mockBucketSave }));
const mockGetServerFirebaseStorage = vi.fn(() => ({ file: mockBucketFile }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

vi.mock('@/lib/firebase/storage', () => ({
  readReferenceBytes: mockReadReferenceBytes,
  getServerFirebaseStorage: mockGetServerFirebaseStorage,
}));

let extractNailSwatch: typeof import('@/lib/ai/extract-swatch').extractNailSwatch;

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
    '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');
  vi.stubEnv(
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    JSON.stringify({
      project_id: 'test-project',
      client_email: 'sa@test-project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    })
  );

  const mod = await import('@/lib/ai/extract-swatch');
  extractNailSwatch = mod.extractNailSwatch;
});

beforeEach(() => {
  mockGenerateContent.mockReset();
  mockReadReferenceBytes.mockReset();
  mockBucketSave.mockReset().mockResolvedValue(undefined);
  mockBucketFile.mockClear();
  mockGetServerFirebaseStorage.mockClear();
});

const SWATCH_PNG_B64 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a,
]).toString('base64');

const ARGS = {
  sourceStoragePath: 'users/alice-uid/generations/g1.png',
  designId: 'd1',
  userId: 'alice-uid',
} as const;

describe('extractNailSwatch — happy path', () => {
  it('reads source bytes, calls Vertex, uploads PNG, returns { ok: true, storagePath }', async () => {
    mockReadReferenceBytes.mockResolvedValue({
      ok: true,
      bytes: Buffer.from([0x01, 0x02]),
      contentType: 'image/png',
    });
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: { data: SWATCH_PNG_B64, mimeType: 'image/png' },
              },
            ],
          },
        },
      ],
    });

    const out = await extractNailSwatch(ARGS);

    expect(out).toEqual({
      ok: true,
      storagePath: 'designs/d1/swatch.png',
    });
    expect(mockBucketFile).toHaveBeenCalledWith('designs/d1/swatch.png');
    expect(mockBucketSave).toHaveBeenCalledOnce();
  });
});

describe('extractNailSwatch — failure paths', () => {
  it('Vertex returns no inlineData → { ok: false }, never throws, logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadReferenceBytes.mockResolvedValue({
      ok: true,
      bytes: Buffer.from([0x01]),
      contentType: 'image/png',
    });
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ text: 'I cannot do that.' }],
          },
        },
      ],
    });

    const out = await extractNailSwatch(ARGS);

    expect(out).toEqual({ ok: false });
    expect(mockBucketSave).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('Vertex throws → { ok: false }, never throws, logs code+message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadReferenceBytes.mockResolvedValue({
      ok: true,
      bytes: Buffer.from([0x01]),
      contentType: 'image/png',
    });
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error('vertex down'), { code: '500' })
    );

    const out = await extractNailSwatch(ARGS);

    expect(out).toEqual({ ok: false });
    expect(mockBucketSave).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('bucket.save throws → { ok: false }, never throws, logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadReferenceBytes.mockResolvedValue({
      ok: true,
      bytes: Buffer.from([0x01]),
      contentType: 'image/png',
    });
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: { data: SWATCH_PNG_B64, mimeType: 'image/png' },
              },
            ],
          },
        },
      ],
    });
    mockBucketSave.mockRejectedValueOnce(
      Object.assign(new Error('bucket nope'), { code: 'storage/internal' })
    );

    const out = await extractNailSwatch(ARGS);

    expect(out).toEqual({ ok: false });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('source bytes unreadable → { ok: false }, never calls Vertex, logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockReadReferenceBytes.mockResolvedValue({
      ok: false,
      reason: 'not_found',
      message: 'object missing',
    });

    const out = await extractNailSwatch(ARGS);

    expect(out).toEqual({ ok: false });
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(mockBucketSave).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

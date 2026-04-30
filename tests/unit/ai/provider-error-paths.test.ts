/**
 * c13 — error path tests. SDK error.code → reason mapping; refusal via
 * promptFeedback.blockReason; missing inlineData → unknown.
 *
 * Each catch should log [provider] generateImage failed with code+message+model.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();

class MockGoogleGenAI {
  models: { generateContent: typeof mockGenerateContent };
  constructor() {
    this.models = { generateContent: mockGenerateContent };
  }
}

vi.mock('@google/genai', () => ({
  GoogleGenAI: MockGoogleGenAI,
}));

let generateImage: typeof import('@/lib/ai/provider').generateImage;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-api-key');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'nail-tech-assistant');
  vi.stubEnv(
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'nail-tech-assistant.appspot.com'
  );
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:123456789:web:abc123');
  vi.stubEnv('FIREBASE_PROJECT_ID', 'nail-tech-assistant');
  vi.stubEnv(
    'FIREBASE_CLIENT_EMAIL',
    'sa@nail-tech-assistant.iam.gserviceaccount.com'
  );
  vi.stubEnv(
    'FIREBASE_PRIVATE_KEY',
    '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');
  vi.stubEnv(
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    JSON.stringify({
      type: 'service_account',
      project_id: 'nail-tech-assistant',
      private_key_id: 'fake-key-id',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
      client_email: 'sa@nail-tech-assistant.iam.gserviceaccount.com',
      client_id: '123',
    })
  );

  const mod = await import('@/lib/ai/provider');
  generateImage = mod.generateImage;
});

beforeEach(() => {
  mockGenerateContent.mockReset();
});

const REQ = {
  images: [
    {
      bytes: Buffer.from([0xff]),
      mimeType: 'image/jpeg' as const,
      role: 'primary' as const,
    },
  ],
  promptText: 'matte',
  nailShape: 'almond' as const,
};

describe('generateImage — error paths', () => {
  it('promptFeedback.blockReason "SAFETY" → refusal', async () => {
    mockGenerateContent.mockResolvedValue({
      promptFeedback: { blockReason: 'SAFETY' },
      candidates: [],
    });

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('refusal');
  });

  it('promptFeedback.blockReason "RECITATION" → refusal', async () => {
    mockGenerateContent.mockResolvedValue({
      promptFeedback: { blockReason: 'RECITATION' },
      candidates: [],
    });

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('refusal');
  });

  it('SDK throws with code "429" → rate_limit', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error('rate limit exceeded'), { code: '429' })
    );

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('rate_limit');
    const log = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes('[provider] generateImage failed')
    );
    expect(log).toBeDefined();
    errorSpy.mockRestore();
  });

  it('SDK throws "rate limit" message → rate_limit (string-match fallback)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('rate limit hit'));

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('rate_limit');
  });

  it('SDK throws ECONNRESET → network', async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })
    );

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('network');
  });

  it('SDK throws ETIMEDOUT → network', async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })
    );

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('network');
  });

  it('SDK throws generic error → unknown', async () => {
    mockGenerateContent.mockRejectedValue(new Error('something weird'));

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('unknown');
  });

  it('response missing inlineData → unknown', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'no image here' }] } }],
    });

    const out = await generateImage(REQ);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('unknown');
  });
});

/**
 * c13-ai-env-provider-boundary — happy-path test.
 *
 * Mocks @google/genai with a constructor that captures init args and
 * exposes a stub models.generateContent(). Asserts:
 * - Vertex AI mode (vertexai: true)
 * - googleAuthOptions.credentials are the parsed FIREBASE_SERVICE_ACCOUNT_JSON
 * - call payload uses { model, contents: [{ role: 'user', parts }], config }
 * - response inlineData → returned as Buffer + mimeType
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'nail-tech-assistant',
  private_key_id: 'fake-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  client_email: 'sa@nail-tech-assistant.iam.gserviceaccount.com',
  client_id: '123',
};

const mockGenerateContent = vi.fn();
let lastConstructorArgs: unknown = null;

class MockGoogleGenAI {
  models: { generateContent: typeof mockGenerateContent };
  constructor(args: unknown) {
    lastConstructorArgs = args;
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
    JSON.stringify(FAKE_SERVICE_ACCOUNT)
  );

  const mod = await import('@/lib/ai/provider');
  generateImage = mod.generateImage;
});

beforeEach(() => {
  mockGenerateContent.mockReset();
  lastConstructorArgs = null;
});

const VALID_REQUEST = {
  images: [
    {
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      mimeType: 'image/jpeg' as const,
      role: 'primary' as const,
    },
  ],
  promptText: 'matte rose gold',
  nailShape: 'almond' as const,
};

describe('generateImage — happy path', () => {
  it('initializes GoogleGenAI in Vertex mode with parsed service account credentials', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString(
                    'base64'
                  ),
                },
              },
            ],
          },
        },
      ],
    });

    await generateImage(VALID_REQUEST);

    expect(lastConstructorArgs).toMatchObject({
      vertexai: true,
      project: 'nail-tech-assistant',
      location: 'global',
      googleAuthOptions: {
        credentials: expect.objectContaining({
          client_email: FAKE_SERVICE_ACCOUNT.client_email,
          private_key: FAKE_SERVICE_ACCOUNT.private_key,
        }),
      },
    });
  });

  it('returns Buffer + mimeType from response.candidates[0].content.parts inlineData', async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { text: 'Here is your nail design.' },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: pngBytes.toString('base64'),
                },
              },
            ],
          },
        },
      ],
    });

    const out = await generateImage(VALID_REQUEST);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(Buffer.compare(out.imageBytes, pngBytes)).toBe(0);
    expect(out.mimeType).toBe('image/png');
  });

  it('serializes request as { model, contents: [{ role: user, parts }], config }', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: Buffer.from([0x89]).toString('base64'),
                },
              },
            ],
          },
        },
      ],
    });

    await generateImage(VALID_REQUEST);

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    const payload = mockGenerateContent.mock.calls[0][0] as {
      model: string;
      contents: Array<{ role: string; parts: unknown[] }>;
      config?: { responseModalities?: string[] };
    };
    expect(payload.model).toBe('gemini-3.1-flash-image-preview');
    expect(payload.contents).toHaveLength(1);
    expect(payload.contents[0].role).toBe('user');
    expect(payload.contents[0].parts.length).toBeGreaterThanOrEqual(2);
    const inlineParts = payload.contents[0].parts.filter(
      (p) => (p as { inlineData?: unknown }).inlineData !== undefined
    );
    expect(inlineParts).toHaveLength(1);
    const textParts = payload.contents[0].parts.filter(
      (p) => typeof (p as { text?: string }).text === 'string'
    );
    expect(textParts.length).toBeGreaterThanOrEqual(1);
    expect(payload.config?.responseModalities).toEqual(['IMAGE', 'TEXT']);
  });
});

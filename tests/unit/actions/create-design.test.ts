/**
 * c10-create-design-action — server action unit test.
 * Mocks getSession + createDesignDraft. Asserts uid sourced from session.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockGetSession = vi.fn();
const mockCreateDesignDraft = vi.fn();

vi.mock('@/lib/firebase/session', () => ({
  getSessionForServerAction: mockGetSession,
}));

vi.mock('@/lib/designs/lifecycle', () => ({
  createDesignDraft: mockCreateDesignDraft,
}));

let createDesign: typeof import('@/app/(authenticated)/design/actions').createDesign;

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
  // c9 added selectPinterestPin to actions.ts which transitively imports
  // lib/pinterest/client → requires PINTEREST_ACCESS_TOKEN at module load
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');

  const mod = await import('@/app/(authenticated)/design/actions');
  createDesign = mod.createDesign;
});

beforeEach(() => {
  mockGetSession.mockReset();
  mockCreateDesignDraft.mockReset();
});

const INPUT = {
  primaryReferenceId: 'r1',
  secondaryReferenceIds: ['r2'],
  promptText: 'matte',
  nailShape: 'almond',
};

describe('createDesign action', () => {
  it('forwards uid from session into createDesignDraft', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });
    mockCreateDesignDraft.mockResolvedValue({
      ok: true,
      designId: 'd1',
      status: 'draft_created',
    });

    const out = await createDesign(INPUT);

    expect(mockCreateDesignDraft).toHaveBeenCalledWith({
      userId: 'alice-uid',
      ...INPUT,
    });
    expect(out).toEqual({
      ok: true,
      designId: 'd1',
      status: 'draft_created',
    });
  });

  it('returns unauthorized when session missing — does not call lifecycle', async () => {
    mockGetSession.mockResolvedValue(null);

    const out = await createDesign(INPUT);

    expect(mockCreateDesignDraft).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('unauthorized');
  });

  it('propagates lifecycle failure envelope verbatim', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });
    mockCreateDesignDraft.mockResolvedValue({
      ok: false,
      reason: 'rules_denied',
      message: 'denied',
    });

    const out = await createDesign(INPUT);

    expect(out).toEqual({
      ok: false,
      reason: 'rules_denied',
      message: 'denied',
    });
  });
});

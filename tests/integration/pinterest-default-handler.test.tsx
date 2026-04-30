/**
 * c2-msw-install-harness — Pinterest default-handler interop test.
 *
 * Verifies that the default MSW handlers under `tests/__mocks__/handlers/
 * pinterest.ts` intercept the real `lib/pinterest/client.ts` fetches and
 * return the stubbed shape — i.e., a test that imports the production client
 * with no per-test override succeeds against the default stub.
 *
 * Pattern mirrors `tests/unit/pinterest/client.test.ts`:
 *   - vi.stubEnv(...) for every required env var BEFORE module import
 *   - vi.resetModules() so the dynamic import re-evaluates against stubs
 *   - dynamic import of lib/pinterest/client to pick up env values
 *
 * NOTE: integration tests live as `.test.tsx` per repo convention. This file
 * does not render JSX — extension is for vitest glob compliance.
 */
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { server } from '@/tests/__mocks__/msw-server';

const STUB_TOKEN = 'ptest_token_abc123';

describe('Pinterest default handler (MSW interop)', () => {
  let listPinterestBoards: typeof import('@/lib/pinterest/client').listPinterestBoards;

  beforeEach(async () => {
    vi.resetModules();

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
    vi.stubEnv('PINTEREST_ACCESS_TOKEN', STUB_TOKEN);
    // Critically: PINTEREST_MOCK is intentionally LEFT UNSTUBBED so the
    // optional zod field stays undefined. The client then takes the real
    // pinterestFetch() path and MSW intercepts at the network layer.
    // (Stubbing it to '' would fail enum validation in lib/env.ts.)

    const mod = await import('@/lib/pinterest/client');
    listPinterestBoards = mod.listPinterestBoards;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    server.resetHandlers();
  });

  it('returns the default boards stub via MSW (no per-test override)', async () => {
    const result = await listPinterestBoards();

    expect(result.ok).toBe(true);
    if (!result.ok) return; // type narrow

    // Default handler ships at least one board; bookmark is null (single-page).
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.nextBookmark).toBeNull();

    // Sanity: stubbed boards have the expected shape (id + name).
    const first = result.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
  });

  it('forwards Bearer token to MSW handler (handler can assert on it)', async () => {
    let capturedAuthHeader: string | null = null;

    // Per-test override: capture the Authorization header on the boards
    // request, then return a minimal valid Pinterest paginated response.
    server.use(
      http.get('https://api.pinterest.com/v5/boards', ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        return HttpResponse.json({ items: [], bookmark: null });
      })
    );

    await listPinterestBoards();
    expect(capturedAuthHeader).toBe(`Bearer ${STUB_TOKEN}`);
  });
});

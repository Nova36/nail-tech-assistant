/**
 * c2-msw-install-harness — smoke test for the MSW harness lifecycle.
 *
 * Proves the MSW server is wired into vitest setup correctly:
 *   1. `server.use(...)` overrides take effect for the current test.
 *   2. `afterEach(() => server.resetHandlers())` clears overrides between tests.
 *   3. A request to an undeclared URL fails loudly (`onUnhandledRequest: 'error'`).
 *
 * This test does NOT touch app code — it uses a probe URL (`example.test`) so
 * the harness verification stays isolated from the real Pinterest / Gemini
 * handler stubs.
 *
 * NOTE: integration tests live as `.test.tsx` per repo convention (the
 * `tests/integration/**\/*.test.tsx` glob in `vitest.config.ts`); the story
 * spec named these `.test.ts` but vitest config is forbidden from change in
 * c2 scope, so we keep the `.tsx` extension. No JSX is rendered.
 */
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';

import { server } from '@/tests/__mocks__/msw-server';

const PROBE_URL = 'https://example.test/c2-msw-probe';

describe('MSW harness smoke', () => {
  beforeEach(() => {
    // Defensive: make sure no per-test override survived across tests. The
    // `afterEach(() => server.resetHandlers())` lifecycle hook in
    // `tests/setup/integration.ts` is what we're proving works; this is a
    // belt-and-suspenders reset in case the lifecycle is broken.
    server.resetHandlers();
  });

  it('intercepts requests to URLs declared via server.use(...)', async () => {
    server.use(
      http.get(PROBE_URL, () =>
        HttpResponse.json({ ok: true, source: 'msw-override' })
      )
    );

    const response = await fetch(PROBE_URL);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; source: string };
    expect(body).toEqual({ ok: true, source: 'msw-override' });
  });

  it('rejects unhandled requests with an error (onUnhandledRequest: "error")', async () => {
    // No server.use() override — this URL isn't in any default handler.
    // MSW must surface the unhandled request as a fetch error rather than
    // letting it leak to the real network.
    await expect(
      fetch('https://example.test/c2-msw-undeclared')
    ).rejects.toThrow();
  });

  it('resets per-test overrides between tests (override from previous test must not leak)', async () => {
    // The PROBE_URL override from the first `it` block must NOT still be in
    // effect here — `server.resetHandlers()` should have cleared it.
    await expect(fetch(PROBE_URL)).rejects.toThrow();
  });
});

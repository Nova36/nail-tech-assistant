/**
 * c2-msw-install-harness — vitest-side MSW server.
 *
 * IMPORTANT: this file targets MSW 2.x (msw@^2). MSW 1.x snippets from
 * external docs (e.g., `rest.get(...)` from `msw`) are NOT compatible —
 * MSW 2.x exposes `http.get(...)` / `HttpResponse.json(...)` from `msw`
 * and `setupServer` from `msw/node`.
 *
 * Lifecycle is owned by `tests/setup/integration.ts`:
 *   beforeAll → server.listen({ onUnhandledRequest: 'error' })
 *   afterEach → server.resetHandlers()
 *   afterAll  → server.close()
 *
 * Per-test overrides land in individual test files via `server.use(...)`.
 */
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);

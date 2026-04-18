/**
 * A4 — tests/unit/api-health.test.ts
 *
 * Unit tests for the `GET` handler at `app/api/health/route.ts`.
 *
 * Contract (per A4 story + research brief):
 *   - GET returns 200 with a JSON body shaped `{ ok: true, ts: <number> }`.
 *   - Handler must NOT transitively import firebase-admin or any A2 session
 *     helper (keeps health check cheap and dependency-free; also lets it
 *     run at the edge if implement chooses `export const runtime = 'edge'`).
 *
 * These tests are RED by design — the route currently throws a
 * `TODO(a4.implement)` error; the developer overwrites it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GET } from '../../app/api/health/route';

describe('app/api/health — GET', () => {
  it('returns a Response with status 200', async () => {
    const res = await GET();
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  it('JSON body has { ok: true, ts: <number> }', async () => {
    const res = await GET();
    const body = (await res.json()) as { ok: unknown; ts: unknown };

    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
    expect(Number.isFinite(body.ts as number)).toBe(true);
  });
});

describe('app/api/health — dependency hygiene', () => {
  // Source-level grep: the file must not import firebase-admin or the A2
  // session helper. Checking static imports catches the common regression
  // (someone drops `import { getSession } from ...` into the handler).
  const ROUTE_SRC = readFileSync(
    join(process.cwd(), 'app', 'api', 'health', 'route.ts'),
    'utf-8'
  );

  it('does NOT import from `firebase-admin`', () => {
    expect(ROUTE_SRC).not.toMatch(/from\s+['"]firebase-admin/);
  });

  it('does NOT import from `@/lib/firebase/server`', () => {
    expect(ROUTE_SRC).not.toMatch(/from\s+['"]@\/lib\/firebase\/server['"]/);
    expect(ROUTE_SRC).not.toMatch(/from\s+['"].*lib\/firebase\/server['"]/);
  });

  it('does NOT import from `@/lib/firebase/session`', () => {
    expect(ROUTE_SRC).not.toMatch(/from\s+['"]@\/lib\/firebase\/session['"]/);
    expect(ROUTE_SRC).not.toMatch(/from\s+['"].*lib\/firebase\/session['"]/);
  });
});

/**
 * A3 — tests/unit/auth/allowlist.test.ts
 *
 * Covers story AC#5: `assertAllowedEmail(email)` returns `{ ok: true }` for
 * the configured ALLOWED_EMAIL and `{ ok: false, reason: ... }` otherwise.
 *
 * This test authors the contract BEFORE implementation; the developer will
 * create `lib/auth/allowlist.ts` next. The allowlist module is imported
 * dynamically so we can stub env vars before module evaluation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ALLOWED = 'configured@example.test';

const BASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc123',
  FIREBASE_PROJECT_ID: 'test-project',
  FIREBASE_CLIENT_EMAIL: 'sa@test-project.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
  ALLOWED_EMAIL: ALLOWED,
  APP_URL: 'http://localhost:3000',
  PINTEREST_ACCESS_TOKEN: 'ptest_token_abc123',
} as const;

async function loadAllowlist(): Promise<
  typeof import('../../../lib/auth/allowlist')
> {
  return import('../../../lib/auth/allowlist');
}

describe('lib/auth/allowlist — assertAllowedEmail (AC#5)', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [k, v] of Object.entries(BASE_ENV)) {
      vi.stubEnv(k, v);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns { ok: true } for exact match with ALLOWED_EMAIL', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(assertAllowedEmail(ALLOWED)).toEqual({ ok: true });
  });

  it('returns { ok: true } for case-insensitive (uppercase) match', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(assertAllowedEmail(ALLOWED.toUpperCase())).toEqual({ ok: true });
  });

  it('returns { ok: true } when leading/trailing whitespace is trimmed', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(assertAllowedEmail(`  ${ALLOWED}  `)).toEqual({ ok: true });
  });

  it('returns { ok: false, reason: "not_allowed" } for a wrong email', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(assertAllowedEmail('attacker@example.com')).toEqual({
      ok: false,
      reason: 'not_allowed',
    });
  });

  it('returns { ok: false, reason: "invalid_format" } for an empty string (no throw)', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(() => assertAllowedEmail('')).not.toThrow();
    expect(assertAllowedEmail('')).toEqual({
      ok: false,
      reason: 'invalid_format',
    });
  });

  it('returns { ok: false, reason: "invalid_format" } for a string without an "@"', async () => {
    const { assertAllowedEmail } = await loadAllowlist();
    expect(assertAllowedEmail('not-an-email')).toEqual({
      ok: false,
      reason: 'invalid_format',
    });
  });
});

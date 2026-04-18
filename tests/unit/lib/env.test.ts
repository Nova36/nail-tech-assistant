/**
 * AC#1 — lib/env.ts throws a descriptive error naming the missing var.
 *
 * Strategy: for each required var, stub process.env with all OTHER vars
 * set to valid values and the target var deleted, then dynamically import
 * lib/env to trigger module-load validation. vi.resetModules() is called
 * before each dynamic import so the module is re-evaluated.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ALL_REQUIRED = {
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
  ALLOWED_EMAIL: 'allowed@example.com',
  APP_URL: 'https://nail-tech.example.com',
  PINTEREST_ACCESS_TOKEN: 'ptest_token_abc123',
} as const;

type EnvKey = keyof typeof ALL_REQUIRED;

function envWithout(key: EnvKey): NodeJS.ProcessEnv {
  const copy = { ...ALL_REQUIRED } as Record<string, string>;
  delete copy[key];
  return copy as NodeJS.ProcessEnv;
}

describe('lib/env — module-load validation (AC#1)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function expectMissingVarThrows(key: EnvKey): Promise<void> {
    // envWithout used to verify the key exists in ALL_REQUIRED before stubbing
    envWithout(key);
    for (const [k, v] of Object.entries(ALL_REQUIRED) as [EnvKey, string][]) {
      if (k === key) {
        vi.stubEnv(k, undefined as unknown as string);
      } else {
        vi.stubEnv(k, v);
      }
    }
    delete (process.env as Record<string, string | undefined>)[key];

    await expect(import('../../../lib/env')).rejects.toThrow(key);
  }

  it('throws naming NEXT_PUBLIC_FIREBASE_API_KEY when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_API_KEY');
  });

  it('throws naming NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  });

  it('throws naming NEXT_PUBLIC_FIREBASE_PROJECT_ID when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  });

  it('throws naming NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  });

  it('throws naming NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  });

  it('throws naming NEXT_PUBLIC_FIREBASE_APP_ID when missing', async () => {
    await expectMissingVarThrows('NEXT_PUBLIC_FIREBASE_APP_ID');
  });

  it('throws naming FIREBASE_PROJECT_ID when missing', async () => {
    await expectMissingVarThrows('FIREBASE_PROJECT_ID');
  });

  it('throws naming FIREBASE_CLIENT_EMAIL when missing', async () => {
    await expectMissingVarThrows('FIREBASE_CLIENT_EMAIL');
  });

  it('throws naming FIREBASE_PRIVATE_KEY when missing', async () => {
    await expectMissingVarThrows('FIREBASE_PRIVATE_KEY');
  });

  it('throws naming ALLOWED_EMAIL when missing', async () => {
    await expectMissingVarThrows('ALLOWED_EMAIL');
  });

  it('throws naming APP_URL when missing', async () => {
    await expectMissingVarThrows('APP_URL');
  });

  it('throws naming PINTEREST_ACCESS_TOKEN when missing', async () => {
    await expectMissingVarThrows('PINTEREST_ACCESS_TOKEN');
  });

  it('resolves with typed env object when all vars are present', async () => {
    for (const [k, v] of Object.entries(ALL_REQUIRED)) {
      vi.stubEnv(k, v);
    }
    vi.resetModules();
    const mod = await import('../../../lib/env');
    expect(mod.env).toBeDefined();
    expect(typeof mod.env.APP_URL).toBe('string');
    expect(typeof mod.env.ALLOWED_EMAIL).toBe('string');
    expect(typeof mod.env.PINTEREST_ACCESS_TOKEN).toBe('string');
  });
});

/**
 * A3 — tests/unit/auth/login-action.test.ts
 *
 * Covers AC#1 (allowed path → sendSignInLinkToEmail + { status: 'sent' }),
 * AC#2 (rejection path → { status: 'rejected', message } + NO firebase call),
 * AC#3 (direct-call bypass → same rejection, no firebase call),
 * plus the malformed-input contract from the research brief.
 *
 * The server action lives at `app/(auth)/login/actions.ts` and exports
 * `loginAction` (the @/lib path alias resolves via tsconfig + vitest). We
 * mock `firebase/auth` so we can assert the spy was NOT called on rejection
 * (the FR-A-2 invariant — see sign-off #1).
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';

const ALLOWED = 'configured@example.test';
const APP_URL = 'http://localhost:3000';

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
  APP_URL,
  PINTEREST_ACCESS_TOKEN: 'ptest_token_abc123',
} as const;

const fakeApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
};
const fakeAuth = { __tag: 'fake-auth' };

type ActionCodeSettings = { url: string; handleCodeInApp: boolean };
const sendSignInLinkToEmail = vi.fn(
  async (
    ...args: [auth: unknown, email: string, settings: ActionCodeSettings]
  ) => {
    void args;
    return undefined;
  }
);
const getAuth = vi.fn(() => fakeAuth);

vi.mock('firebase/auth', () => ({
  getAuth,
  sendSignInLinkToEmail,
}));

vi.mock('@/lib/firebase/client', () => ({
  createBrowserFirebaseClient: vi.fn(() => fakeApp),
}));

// server-only throws when imported outside the server context; stub to a no-op.
vi.mock('server-only', () => ({}));

type LoginResult =
  | { status: 'sent' }
  | { status: 'rejected'; message?: string; reason?: string };

type LoginActionModule = {
  loginAction: (formData: FormData) => Promise<LoginResult>;
};

async function loadLoginAction(): Promise<LoginActionModule> {
  return (await import('../../../app/(auth)/login/actions')) as unknown as LoginActionModule;
}

function fd(email: string): FormData {
  const form = new FormData();
  form.set('email', email);
  return form;
}

describe('app/(auth)/login/actions — loginAction', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [k, v] of Object.entries(BASE_ENV)) {
      vi.stubEnv(k, v);
    }
    sendSignInLinkToEmail.mockClear();
    getAuth.mockClear();
    (sendSignInLinkToEmail as Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('AC#1: allowed email → returns { status: "sent" } and calls sendSignInLinkToEmail exactly once with ActionCodeSettings', async () => {
    const { loginAction } = await loadLoginAction();
    const result = await loginAction(fd(ALLOWED));

    expect(result).toEqual({ status: 'sent' });
    expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1);
    const [authArg, emailArg, settingsArg] =
      sendSignInLinkToEmail.mock.calls[0]!;
    expect(authArg).toBeTruthy();
    expect(emailArg).toBe(ALLOWED);
    expect(settingsArg).toMatchObject({
      url: `${APP_URL}/login/finish`,
      handleCodeInApp: true,
    });
  });

  it('AC#2: disallowed email → returns the AC#2-verbatim rejection AND does NOT call Firebase', async () => {
    const { loginAction } = await loadLoginAction();
    const result = await loginAction(fd('attacker@example.com'));

    expect(result).toEqual({
      status: 'rejected',
      message: 'Only the configured email can sign in.',
    });
    // CRITICAL invariant from FR-A-2: firebase must not be touched on reject.
    expect(sendSignInLinkToEmail).not.toHaveBeenCalled();
    expect(sendSignInLinkToEmail.mock.calls.length).toBe(0);
  });

  it('AC#3: direct-call bypass (invoking the exported action directly with a disallowed email) still rejects and still does NOT call Firebase', async () => {
    const { loginAction } = await loadLoginAction();
    // Simulate an attacker calling the action export directly (no UI).
    const result = await loginAction(fd('sneaky@attacker.test'));

    expect(result).toMatchObject({ status: 'rejected' });
    expect((result as { message?: string }).message).toBe(
      'Only the configured email can sign in.'
    );
    expect(sendSignInLinkToEmail.mock.calls.length).toBe(0);
  });

  it('malformed email ("not-an-email") → returns { status: "rejected", reason: "invalid_format" } and does NOT call Firebase', async () => {
    const { loginAction } = await loadLoginAction();
    const result = await loginAction(fd('not-an-email'));

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'invalid_format',
    });
    expect(sendSignInLinkToEmail).not.toHaveBeenCalled();
  });
});

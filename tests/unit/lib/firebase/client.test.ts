/**
 * AC#3 — createBrowserFirebaseClient() returns a memoized FirebaseApp.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
};
const mockGetApps = vi.fn(() => [] as (typeof fakeApp)[]);
const mockInitializeApp = vi.fn(() => fakeApp);

vi.mock('firebase/app', () => ({
  getApps: mockGetApps,
  initializeApp: mockInitializeApp,
}));

describe('lib/firebase/client — createBrowserFirebaseClient (AC#3)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue(fakeApp);

    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abc123';
  });

  it('returns a truthy FirebaseApp', async () => {
    const { createBrowserFirebaseClient } =
      await import('../../../../lib/firebase/client');
    const app = createBrowserFirebaseClient();
    expect(app).toBeTruthy();
  });

  it('returns the SAME instance on second call (memoization via getApps guard)', async () => {
    // First call: getApps returns empty → initializeApp called → returns fakeApp
    mockGetApps
      .mockReturnValueOnce([])
      .mockReturnValue([fakeApp] as (typeof fakeApp)[]);
    const { createBrowserFirebaseClient } =
      await import('../../../../lib/firebase/client');
    const app1 = createBrowserFirebaseClient();
    const app2 = createBrowserFirebaseClient();
    expect(app1).toBe(app2);
  });

  it('does NOT call initializeApp when getApps already has an entry', async () => {
    mockGetApps.mockReturnValue([fakeApp] as (typeof fakeApp)[]);
    const { createBrowserFirebaseClient } =
      await import('../../../../lib/firebase/client');
    createBrowserFirebaseClient();
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it('passes NEXT_PUBLIC_FIREBASE_* vars to initializeApp', async () => {
    const { createBrowserFirebaseClient } =
      await import('../../../../lib/firebase/client');
    createBrowserFirebaseClient();
    const calls = mockInitializeApp.mock.calls as unknown as [
      Record<string, string>,
    ][];
    expect(calls.length).toBeGreaterThan(0);
    const config = calls[0]?.[0];
    expect(config).toMatchObject({
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
    });
  });
});

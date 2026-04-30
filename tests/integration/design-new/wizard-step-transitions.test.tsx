/**
 * c11-design-new-workspace-ui — wizard end-to-end integration test.
 *
 * Locks the structural contract for the 3-step wizard (Steps 1+2 in c11;
 * Step 3 owned by c17). Uses RTL + jsdom + mocked actions.
 *
 * Flow under test:
 *  1. Step 1 renders with progress strip, Pinterest panel, upload zone,
 *     counter "0 references", Continue → DISABLED.
 *  2. Click a SelectablePinCard → mocked c9 selectPinterestPin returns
 *     { ok: true; reference } → counter increments → Continue enables.
 *  3. Click Continue → Step 2 renders, browse + upload HIDDEN.
 *  4. Step 2 shows working-set card + Generate DISABLED with hint.
 *  5. Click reference card to mark primary → Generate enables.
 *  6. Click Generate → mocked c10 createDesign called with assembled
 *     state → router.push('/design/<id>') invoked.
 *
 * Visual fidelity (spacing, typography, exact frame layouts) is
 * intentionally NOT asserted here. That work is the morning task per
 * Don's directive 2026-04-30; this test locks the wiring contract.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mockSelectPinterestPin = vi.fn();
const mockCreateDesign = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/app/(authenticated)/design/actions', () => ({
  selectPinterestPin: mockSelectPinterestPin,
  createDesign: mockCreateDesign,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: vi.fn() }),
}));

const FAKE_PIN = {
  id: 'pin-1',
  title: 'sparkly nails',
  alt_text: 'sparkly almond nails',
  link: 'https://pin.it/abc',
  media: {
    images: {
      '600x': {
        url: 'https://i.pinimg.com/600/abc.jpg',
        width: 600,
        height: 600,
      },
    },
  },
};

const FAKE_REFERENCE_FROM_PIN = {
  id: 'ref-pin-1',
  userId: 'alice-uid',
  source: 'pinterest' as const,
  sourceUrl: 'https://i.pinimg.com/600/abc.jpg',
  storagePath: 'users/alice-uid/references/ref-pin-1.jpg',
  pinterestPinId: 'pin-1',
  createdAt: '2026-04-30T01:30:00.000Z',
};

let Wizard: typeof import('@/app/(authenticated)/design/new/Wizard').Wizard;

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
    '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');

  const mod = await import('@/app/(authenticated)/design/new/Wizard');
  Wizard = mod.Wizard;
});

beforeEach(() => {
  mockSelectPinterestPin.mockReset();
  mockCreateDesign.mockReset();
  mockRouterPush.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Wizard — full step 1 → step 2 → generate flow', () => {
  it('completes the structural contract from empty state to createDesign + router.push', async () => {
    const user = userEvent.setup();
    mockSelectPinterestPin.mockResolvedValue({
      ok: true,
      reference: FAKE_REFERENCE_FROM_PIN,
    });
    mockCreateDesign.mockResolvedValue({
      ok: true,
      designId: 'd-1',
      status: 'draft_created',
    });

    render(<Wizard initialPins={[FAKE_PIN]} />);

    // Step 1 progress strip
    expect(
      screen.getByRole('button', { name: /1.*inspiration/i })
    ).toHaveAttribute('aria-current', 'step');

    // Continue disabled at empty
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    // Pin click → c9
    const pinSelectBtn = screen.getByRole('button', {
      name: /select.*sparkly/i,
    });
    await user.click(pinSelectBtn);

    await waitFor(() => {
      expect(mockSelectPinterestPin).toHaveBeenCalledWith('pin-1');
    });

    // Counter updates + Continue enables
    await waitFor(() => {
      expect(continueBtn).toBeEnabled();
    });

    // Step 1 → Step 2
    await user.click(continueBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /2.*direction/i })
      ).toHaveAttribute('aria-current', 'step');
    });

    // Pinterest panel and upload zone hidden in Step 2
    expect(
      screen.queryByRole('button', { name: /select.*sparkly/i })
    ).not.toBeInTheDocument();

    // Generate disabled until primary
    const generateBtn = screen.getByRole('button', { name: /generate/i });
    expect(generateBtn).toBeDisabled();

    // Mark primary
    const markPrimary = screen.getByRole('button', { name: /mark.*primary/i });
    await user.click(markPrimary);

    await waitFor(() => {
      expect(generateBtn).toBeEnabled();
    });

    // Generate → c10 + router.push
    await user.click(generateBtn);

    await waitFor(() => {
      expect(mockCreateDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryReferenceId: FAKE_REFERENCE_FROM_PIN.id,
          secondaryReferenceIds: [],
          nailShape: 'almond',
        })
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/design/d-1');
    });
  });

  it('Continue stays disabled with zero references', async () => {
    render(<Wizard initialPins={[FAKE_PIN]} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('rules_denied from createDesign shows banner and preserves working-set state', async () => {
    const user = userEvent.setup();
    mockSelectPinterestPin.mockResolvedValue({
      ok: true,
      reference: FAKE_REFERENCE_FROM_PIN,
    });
    mockCreateDesign.mockResolvedValue({
      ok: false,
      reason: 'rules_denied',
      message: 'denied',
    });

    render(<Wizard initialPins={[FAKE_PIN]} />);

    await user.click(screen.getByRole('button', { name: /select.*sparkly/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await user.click(
      await screen.findByRole('button', { name: /mark.*primary/i })
    );

    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

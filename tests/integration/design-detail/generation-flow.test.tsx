process.env.PINTEREST_ACCESS_TOKEN = 'test-token';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateDesign, mockRouterPush } = vi.hoisted(() => ({
  mockGenerateDesign: vi.fn(),
  mockRouterPush: vi.fn(),
}));

vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: mockGenerateDesign,
  selectPinterestPin: vi.fn(),
  createDesign: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: vi.fn() }),
}));

import { Confirm } from '@/app/(authenticated)/design/[designId]/Confirm';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('generation-flow integration', () => {
  it('case 23: mount → immediately pending (aria-busy="true"), generateDesign called once', async () => {
    mockGenerateDesign.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves — stays pending */
        })
    );

    render(
      <Confirm
        designId="d1"
        nailShape="almond"
        promptText="soft marble"
        latestGenerationId={null}
      />
    );

    await waitFor(() => {
      expect(mockGenerateDesign).toHaveBeenCalledTimes(1);
      expect(mockGenerateDesign).toHaveBeenCalledWith({ designId: 'd1' });
    });

    const region = screen.getByRole('region', { name: /result/i });
    expect(region).toHaveAttribute('aria-busy', 'true');
  });

  it('case 24: generateDesign resolves success → preview shows <img> with correct src', async () => {
    mockGenerateDesign.mockResolvedValue({
      status: 'success',
      generationId: 'g1',
      imageUrl: 'https://example.com/g1.png',
    });

    render(
      <Confirm
        designId="d1"
        nailShape="almond"
        promptText="soft marble"
        latestGenerationId={null}
      />
    );

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute(
        'src',
        expect.stringContaining('https://example.com/g1.png')
      );
    });
  });

  it('case 25: generateDesign resolves failure → error state with refusal heading and role="alert"', async () => {
    mockGenerateDesign.mockResolvedValue({
      status: 'failure',
      errorCode: 'refusal',
      cta: 'adjust_inputs',
      message: 'declined',
    });

    render(
      <Confirm
        designId="d1"
        nailShape="almond"
        promptText="soft marble"
        latestGenerationId={null}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't generate this design.")
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('case 26: failure state → click "← Back to adjust" → router.push("/design/new")', async () => {
    const user = userEvent.setup();
    mockGenerateDesign.mockResolvedValue({
      status: 'failure',
      errorCode: 'refusal',
      cta: 'adjust_inputs',
      message: 'declined',
    });

    render(
      <Confirm
        designId="d1"
        nailShape="almond"
        promptText="soft marble"
        latestGenerationId={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /back to adjust/i });
    await user.click(backBtn);

    expect(mockRouterPush).toHaveBeenCalledWith('/design/new');
  });

  it('case 27: WizardProgressStrip with step={3} is rendered, Step 3 has aria-current="step"', async () => {
    mockGenerateDesign.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    render(
      <Confirm
        designId="d1"
        nailShape="almond"
        promptText="soft marble"
        latestGenerationId={null}
      />
    );

    await waitFor(() => {
      const step3 = screen.getByRole('button', { name: /3/i });
      expect(step3).toHaveAttribute('aria-current', 'step');
    });
  });
});

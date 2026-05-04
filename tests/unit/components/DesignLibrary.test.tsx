/**
 * d9 TDD — DesignLibrary client component.
 *
 * Receives an array of { design, latestImageUrl } cards from the server
 * component and renders one DesignCard per entry. Surfaces the empty state
 * when the array is empty. Card click navigates to /design/[id] via next/link
 * (the underlying anchor href is what we assert — no useRouter wiring).
 *
 * jsdom env (default).
 */
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { DesignLibrary } from '@/components/DesignLibrary';

import type { Design } from '@/lib/types';

const now = '2026-05-01T00:00:00Z';

const designFixture = (overrides: Partial<Design> = {}): Design => ({
  id: 'd-1',
  userId: 'alice-uid',
  name: 'Soft pinks',
  primaryReferenceId: 'ref-1',
  secondaryReferenceIds: [],
  promptText: null,
  nailShape: 'almond',
  latestGenerationId: 'gen-1',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

type Card = { design: Design; latestImageUrl: string | null };

const cardsFixture = (): Card[] => [
  {
    design: designFixture({ id: 'd-1', name: 'Soft pinks' }),
    latestImageUrl: 'https://cdn.test/d-1.png',
  },
  {
    design: designFixture({ id: 'd-2', name: null }),
    latestImageUrl: 'https://cdn.test/d-2.png',
  },
  {
    design: designFixture({
      id: 'd-3',
      name: 'Holiday set',
      latestGenerationId: null,
    }),
    latestImageUrl: null,
  },
];

describe('DesignLibrary — populated grid', () => {
  it('renders one card per design', () => {
    render(<DesignLibrary cards={cardsFixture()} />);
    const cards = screen.getAllByTestId(/^DesignCard-/);
    expect(cards).toHaveLength(3);
  });

  it('renders the data-component="DesignLibrary" attribute on root', () => {
    const { container } = render(<DesignLibrary cards={cardsFixture()} />);
    expect(
      container.querySelector('[data-component="DesignLibrary"]')
    ).toBeTruthy();
  });

  it('does NOT render an empty state when cards are present', () => {
    render(<DesignLibrary cards={cardsFixture()} />);
    expect(
      screen.queryByRole('link', { name: /start a new design|new design/i })
    ).toBeFalsy();
  });

  it('routes a card click to /design/{id} via the anchor href', () => {
    render(<DesignLibrary cards={cardsFixture()} />);
    const card1 = screen.getByTestId('DesignCard-d-1');
    const link = within(card1).getByRole('link');
    expect(link).toHaveAttribute('href', '/design/d-1');
  });

  it('integrates DesignNameField on unnamed cards (inline naming affordance)', () => {
    render(<DesignLibrary cards={cardsFixture()} />);
    const unnamed = screen.getByTestId('DesignCard-d-2');
    expect(
      within(unnamed).getByRole('textbox', { name: /name/i }) ??
        within(unnamed).getByRole('button', { name: /name/i })
    ).toBeTruthy();
  });
});

describe('DesignLibrary — empty state', () => {
  it('renders the empty state when cards is []', () => {
    const { container } = render(<DesignLibrary cards={[]} />);
    expect(
      container.querySelector('[data-component="LibraryEmptyState"]')
    ).toBeTruthy();
  });

  it('empty state CTA links to /design/new', () => {
    render(<DesignLibrary cards={[]} />);
    const cta = screen.getByRole('link', { name: /new design|start/i });
    expect(cta).toHaveAttribute('href', '/design/new');
  });

  it('still renders DesignLibrary root even when empty', () => {
    const { container } = render(<DesignLibrary cards={[]} />);
    expect(
      container.querySelector('[data-component="DesignLibrary"]')
    ).toBeTruthy();
  });
});

/**
 * d9 TDD — DesignCard client component.
 *
 * Renders a single design tile inside DesignLibrary. Receives a server-resolved
 * latestImageUrl prop (per research Q1 — resolveImageUrl runs in the server
 * component; DesignCard stays jsdom-friendly). Thumbnail is a mini visualizer
 * per wireframe dd-1.
 *
 * jsdom env (default). next/link href is what we assert — no router mock needed.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { DesignCard } from '@/components/DesignCard';

import type { Design } from '@/lib/types';

const now = '2026-05-01T00:00:00Z';

const designFixture = (overrides: Partial<Design> = {}): Design => ({
  id: 'd-card-1',
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

describe('DesignCard — root + identity', () => {
  it('has data-component="DesignCard" on the root element', () => {
    const { container } = render(
      <DesignCard
        design={designFixture()}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    expect(
      container.querySelector('[data-component="DesignCard"]')
    ).toBeTruthy();
  });

  it('roots the card as a navigation anchor to /design/{id}', () => {
    render(
      <DesignCard
        design={designFixture({ id: 'abc-123' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/design/abc-123');
  });
});

describe('DesignCard — thumbnail composition', () => {
  it('renders a NailVisualizer-themed thumbnail container', () => {
    const { container } = render(
      <DesignCard
        design={designFixture({ nailShape: 'coffin' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    // The visualizer renders an SVG root. Per dd-1 the thumbnail IS the
    // mini visualizer — assert presence of its themed container, not internals.
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('handles a null latestImageUrl without crashing (placeholder thumbnail)', () => {
    const { container } = render(
      <DesignCard
        design={designFixture({ latestGenerationId: null })}
        latestImageUrl={null}
      />
    );
    expect(
      container.querySelector('[data-component="DesignCard"]')
    ).toBeTruthy();
  });
});

describe('DesignCard — name surface', () => {
  it('renders the design name when present', () => {
    render(
      <DesignCard
        design={designFixture({ name: 'Holiday set' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    expect(screen.getByText(/holiday set/i)).toBeTruthy();
  });

  it('renders the unnamed placeholder when name is null', () => {
    render(
      <DesignCard
        design={designFixture({ name: null })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    expect(screen.getByText(/unnamed|untitled|name this/i)).toBeTruthy();
  });

  it('renders the unnamed placeholder when name is an empty string', () => {
    render(
      <DesignCard
        design={designFixture({ name: '' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    expect(screen.getByText(/unnamed|untitled|name this/i)).toBeTruthy();
  });
});

describe('DesignCard — updated-at metadata', () => {
  it('renders a <time> element with a dateTime attribute equal to updatedAt', () => {
    const { container } = render(
      <DesignCard
        design={designFixture({ updatedAt: '2026-04-15T12:00:00Z' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    const time = container.querySelector('time');
    expect(time).toBeTruthy();
    expect(time).toHaveAttribute('dateTime', '2026-04-15T12:00:00Z');
  });

  it('renders human-readable relative text inside <time>', () => {
    const { container } = render(
      <DesignCard
        design={designFixture({ updatedAt: '2026-04-15T12:00:00Z' })}
        latestImageUrl="https://cdn.test/img.png"
      />
    );
    const time = container.querySelector('time');
    // Don't lock to a specific format — just assert non-empty text.
    expect(time?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

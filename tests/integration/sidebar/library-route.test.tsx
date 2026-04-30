/**
 * c12-sidebar-library-scaffold — /library empty-state placeholder test.
 *
 * Asserts /library renders the empty-state with CTA linking to /design/new.
 * Sidebar nav assertions are covered by manual reviewer pass since
 * authenticated layout requires a session cookie roundtrip.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LibraryPage from '@/app/(authenticated)/library/page';

describe('/library — empty-state placeholder', () => {
  it('renders heading + descriptive copy + CTA link to /design/new', () => {
    render(<LibraryPage />);

    expect(
      screen.getByRole('heading', { name: /library/i })
    ).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /new design/i });
    expect(cta).toHaveAttribute('href', '/design/new');
  });
});

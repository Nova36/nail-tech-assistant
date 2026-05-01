import React from 'react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

import { server } from '../__mocks__/msw-server';

globalThis.React = React;

// MSW server lifecycle (c2-msw-install-harness).
// `onUnhandledRequest: 'error'` is intentional — surfaces missing handlers
// loudly instead of letting tests silently leak to the real network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

afterEach(() => {
  cleanup();
});

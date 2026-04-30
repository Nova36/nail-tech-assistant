/**
 * c2-msw-install-harness — Pinterest default MSW handlers.
 *
 * Default-shape stubs for the three Pinterest endpoints consumed by
 * `lib/pinterest/client.ts`. Tests can override per-test via
 * `server.use(http.get(...))` for failure / pagination scenarios.
 *
 * Reuses the existing `lib/pinterest/__fixtures__/` data so the stub shape
 * tracks production fixture drift automatically.
 */
import { http, HttpResponse } from 'msw';

import { mockBoardsPage1 } from '@/lib/pinterest/__fixtures__/boards';
import { getMockPinsPage1 } from '@/lib/pinterest/__fixtures__/pins';

const PINTEREST_API = 'https://api.pinterest.com/v5';

export const pinterestHandlers = [
  // /v5/user_account — drives verifyPinterestToken() ok branch
  http.get(`${PINTEREST_API}/user_account`, () =>
    HttpResponse.json({
      username: 'mock-user',
      account_type: 'BUSINESS',
    })
  ),

  // /v5/boards — single-page default (story AC: `bookmark: null`).
  // Tests that need pagination override per-test via server.use() and may
  // reference MOCK_BOOKMARK_PAGE_2 / mockBoardsPage2 when wiring a paginated
  // override — both stay exported from `__fixtures__/boards.ts`.
  http.get(`${PINTEREST_API}/boards`, () =>
    HttpResponse.json({ items: mockBoardsPage1, bookmark: null })
  ),

  // /v5/boards/:boardId/pins — single-page default (story AC: `bookmark: null`).
  // Multi-page override pattern: pin a board id, return getMockPinsPage1
  // with bookmark MOCK_PINS_BOOKMARK_PAGE_2, then page 2 on the bookmark
  // query — see `lib/pinterest/__fixtures__/pins.ts` for the full fixture set.
  http.get(`${PINTEREST_API}/boards/:boardId/pins`, ({ params }) => {
    const boardId = params.boardId as string;
    return HttpResponse.json({
      items: getMockPinsPage1(boardId),
      bookmark: null,
    });
  }),
];

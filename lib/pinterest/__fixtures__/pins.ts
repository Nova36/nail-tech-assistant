import type { PinterestPin } from '@/lib/pinterest/types';

const PIN_DATA_URI = (label: string, from: string, to: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${from}'/><stop offset='100%' stop-color='${to}'/></linearGradient></defs><rect width='600' height='600' fill='url(%23g)' rx='36'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' fill='white' font-family='Georgia, serif' font-size='42'>${label}</text></svg>`
  )}`;

function makePin(
  boardId: string,
  id: string,
  title: string,
  from: string,
  to: string
): PinterestPin {
  const src = PIN_DATA_URI(title, from, to);

  return {
    id,
    title,
    board_id: boardId,
    board_owner: { username: 'mock-user' },
    media: {
      media_type: 'image',
      images: {
        '600x': { url: src, width: 600, height: 600 },
        '400x300': { url: src, width: 400, height: 300 },
        '150x150': { url: src, width: 150, height: 150 },
      },
    },
  };
}

const PINS_BY_BOARD: Record<
  string,
  { page1: PinterestPin[]; page2: PinterestPin[] }
> = {
  'mock-board-1': {
    page1: [
      makePin('mock-board-1', 'pin-1', 'Soft Bloom', '#f0ebe3', '#d4a5a8'),
      makePin('mock-board-1', 'pin-2', 'Mauve Chrome', '#efe4da', '#c9a96e'),
    ],
    page2: [
      makePin('mock-board-1', 'pin-3', 'Petal French', '#f7efe7', '#b08d6f'),
    ],
  },
  'mock-board-2': {
    page1: [
      makePin('mock-board-2', 'pin-4', 'Glossy Nude', '#ede6df', '#b08d6f'),
      makePin('mock-board-2', 'pin-5', 'Rose Aura', '#f4eae4', '#d4a5a8'),
    ],
    page2: [
      makePin('mock-board-2', 'pin-6', 'Mirror Sheen', '#ece2d4', '#6b3f5e'),
    ],
  },
};

const DEFAULT_PAGE_1 = [
  makePin(
    'default-board',
    'pin-default-1',
    'Editorial Gel',
    '#f0ebe3',
    '#d4a5a8'
  ),
  makePin(
    'default-board',
    'pin-default-2',
    'Velvet Almond',
    '#fbf6f1',
    '#c9a96e'
  ),
];

const DEFAULT_PAGE_2 = [
  makePin(
    'default-board',
    'pin-default-3',
    'Classic Gloss',
    '#f5ede2',
    '#9bb3c0'
  ),
];

export const MOCK_PINS_BOOKMARK_PAGE_2 = 'mock-pins-pagination-cursor-page-2';

export function getMockPinsPage1(boardId: string): PinterestPin[] {
  return (
    PINS_BY_BOARD[boardId]?.page1 ??
    DEFAULT_PAGE_1.map((pin) => ({
      ...pin,
      board_id: boardId,
    }))
  );
}

export function getMockPinsPage2(boardId: string): PinterestPin[] {
  return (
    PINS_BY_BOARD[boardId]?.page2 ??
    DEFAULT_PAGE_2.map((pin) => ({
      ...pin,
      board_id: boardId,
    }))
  );
}

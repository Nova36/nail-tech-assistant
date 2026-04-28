import type { PinterestBoard } from '@/lib/pinterest/types';

/**
 * Local-dev fixtures for the Pinterest boards grid. Used ONLY when
 * `PINTEREST_MOCK` is set in dev (see lib/pinterest/client.ts mock branch);
 * never reached in production. Cover images are inline SVG data URIs so the
 * fixture is fully self-contained — no Pinterest CDN dependency.
 *
 * The shapes here mirror what the real Pinterest /v5/boards endpoint returns
 * (per the b2 researcher's validation note: cover-image sub-field path is
 * unconfirmed; we use `media.image_cover_url` to match BoardCard's read).
 */

const COVER_GRADIENT = (from: string, to: string): string =>
  // Tiny SVG; URL-encoded inline so it works as a `next/image` src.
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${from}'/><stop offset='100%' stop-color='${to}'/></linearGradient></defs><rect width='400' height='400' fill='url(%23g)'/></svg>`
  )}`;

export const mockBoardsPage1: PinterestBoard[] = [
  {
    id: 'mock-board-1',
    name: 'Spring Pastels',
    pin_count: 47,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f0ebe3', '#d4a5a8') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-2',
    name: 'Gel Inspo',
    pin_count: 132,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#ede6df', '#b08d6f') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-3',
    name: 'Holiday Reds',
    pin_count: 28,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f4eae4', '#b04848') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-4',
    name: 'French Tips',
    pin_count: 89,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#fbf6f1', '#dcc7b3') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-5',
    name: 'Wedding Day',
    pin_count: 64,
    privacy: 'PRIVATE',
    media: { image_cover_url: COVER_GRADIENT('#f6efe7', '#c9a96e') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-6',
    name: 'Autumn Earthtones',
    pin_count: 53,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#ece2d4', '#a06a4e') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-7',
    name: 'Minimalist Nudes',
    pin_count: 71,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f4ece2', '#cdb89f') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-8',
    name: 'Glitter & Glam',
    pin_count: 95,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f0e2d2', '#caa86c') },
    owner: { username: 'mock-user' },
  },
];

export const mockBoardsPage2: PinterestBoard[] = [
  {
    id: 'mock-board-9',
    name: 'Halloween Nails',
    pin_count: 22,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#3d3530', '#7c4f3a') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-10',
    name: 'Pastel Easter',
    pin_count: 39,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f3e8e1', '#cbb0d0') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-11',
    name: 'Black & Gold',
    pin_count: 58,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#2a2520', '#c9a96e') },
    owner: { username: 'mock-user' },
  },
  {
    id: 'mock-board-12',
    name: 'Beach Bridal',
    pin_count: 18,
    privacy: 'PUBLIC',
    media: { image_cover_url: COVER_GRADIENT('#f5ede2', '#9bb3c0') },
    owner: { username: 'mock-user' },
  },
];

/**
 * Bookmark sentinel value used to separate page 1 from page 2 in the mock
 * paginated fetch. Real Pinterest returns opaque cursor strings; ours is a
 * recognizable literal so debugging is obvious.
 */
export const MOCK_BOOKMARK_PAGE_2 = 'mock-pagination-cursor-page-2';

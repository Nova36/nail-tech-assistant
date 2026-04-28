import 'server-only';

import { env } from '@/lib/env';
import {
  MOCK_BOOKMARK_PAGE_2,
  mockBoardsPage1,
  mockBoardsPage2,
} from '@/lib/pinterest/__fixtures__/boards';
import { normalizePinterestResponse } from '@/lib/pinterest/errors';

import type {
  PinterestBoard,
  PinterestPaginated,
  PinterestUserAccount,
} from '@/lib/pinterest/types';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

// Dev mock mode. Active when env.PINTEREST_MOCK is set to one of the
// supported sentinels AND we're not running on Vercel. Vercel sets
// VERCEL=1 automatically on every deploy, so accidental Vercel-env
// leakage of PINTEREST_MOCK silently no-ops in prod while still letting
// the flag work under BOTH `pnpm dev` and `pnpm start` locally —
// local production-mode is a legitimate visual-iteration path.
// See lib/env.ts and .env.example for usage.
function getMockMode():
  | 'ok'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'network'
  | null {
  if (process.env.VERCEL === '1') return null;
  return env.PINTEREST_MOCK ?? null;
}

type VerifyPinterestTokenResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'insufficient_scope' | 'network' };

type ListPinterestBoardsResult =
  | { ok: true; items: PinterestBoard[]; nextBookmark: string | null }
  | {
      ok: false;
      reason:
        | 'invalid_token'
        | 'insufficient_scope'
        | 'not_found'
        | 'rate_limit'
        | 'network'
        | 'unknown';
    };

async function pinterestFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${env.PINTEREST_ACCESS_TOKEN}`);

  const request = new Request(`${PINTEREST_API_BASE}${path}`, {
    ...init,
    headers,
    cache: init?.cache ?? 'no-store',
  });

  return fetch(request);
}

export async function verifyPinterestToken(): Promise<VerifyPinterestTokenResult> {
  const mock = getMockMode();
  if (mock === 'ok') return { ok: true };
  if (mock === 'invalid_token') return { ok: false, reason: 'invalid_token' };
  if (mock === 'insufficient_scope')
    return { ok: false, reason: 'insufficient_scope' };
  if (mock === 'network') return { ok: false, reason: 'network' };

  try {
    const response = await pinterestFetch('/user_account', { method: 'GET' });
    const error = normalizePinterestResponse(response);

    if (error) {
      if (
        error.reason === 'invalid_token' ||
        error.reason === 'insufficient_scope'
      ) {
        return { ok: false, reason: error.reason };
      }

      return { ok: false, reason: 'network' };
    }

    (await response.json()) as PinterestUserAccount;

    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export async function listPinterestBoards(opts?: {
  bookmark?: string;
  pageSize?: number;
}): Promise<ListPinterestBoardsResult> {
  const mock = getMockMode();
  if (mock === 'ok') {
    if (opts?.bookmark === MOCK_BOOKMARK_PAGE_2) {
      return { ok: true, items: mockBoardsPage2, nextBookmark: null };
    }
    return {
      ok: true,
      items: mockBoardsPage1,
      nextBookmark: MOCK_BOOKMARK_PAGE_2,
    };
  }
  if (mock === 'invalid_token') return { ok: false, reason: 'invalid_token' };
  if (mock === 'insufficient_scope')
    return { ok: false, reason: 'insufficient_scope' };
  if (mock === 'network') return { ok: false, reason: 'network' };

  const searchParams = new URLSearchParams();
  searchParams.set('page_size', String(opts?.pageSize ?? 25));

  if (opts?.bookmark) {
    searchParams.set('bookmark', opts.bookmark);
  }

  try {
    const response = await pinterestFetch(
      `/boards?${searchParams.toString()}`,
      {
        method: 'GET',
      }
    );
    const error = normalizePinterestResponse(response);

    if (error) {
      return {
        ok: false,
        reason: error.reason,
      };
    }

    const data = (await response.json()) as PinterestPaginated<PinterestBoard>;

    return {
      ok: true,
      items: data.items ?? [],
      nextBookmark: data.bookmark ?? null,
    };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

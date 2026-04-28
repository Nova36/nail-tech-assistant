import 'server-only';

import { env } from '@/lib/env';
import { normalizePinterestResponse } from '@/lib/pinterest/errors';

import type {
  PinterestBoard,
  PinterestPaginated,
  PinterestUserAccount,
} from '@/lib/pinterest/types';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

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

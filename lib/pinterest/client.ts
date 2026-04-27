import 'server-only';

import { env } from '@/lib/env';
import { normalizePinterestResponse } from '@/lib/pinterest/errors';

import type { PinterestUserAccount } from '@/lib/pinterest/types';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

type VerifyPinterestTokenResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_token' | 'insufficient_scope' | 'network' };

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

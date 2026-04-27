export type PinterestError =
  | { reason: 'invalid_token' }
  | { reason: 'insufficient_scope' }
  | { reason: 'not_found' }
  | { reason: 'rate_limit'; retryAfterMs?: number }
  | { reason: 'network' }
  | { reason: 'unknown'; status?: number };

export function normalizePinterestResponse(
  res: Response
): PinterestError | null {
  if (res.ok) {
    return null;
  }

  switch (res.status) {
    case 401:
      return { reason: 'invalid_token' };
    case 403:
      return { reason: 'insufficient_scope' };
    case 404:
      return { reason: 'not_found' };
    case 429:
      return { reason: 'rate_limit' };
    default:
      return { reason: 'unknown', status: res.status };
  }
}

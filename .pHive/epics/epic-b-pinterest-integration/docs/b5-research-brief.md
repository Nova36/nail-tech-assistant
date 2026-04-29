# b5 Research Brief — Empty States + Inline Retryable Browse Error + Real-Token Smoke

**Author:** orchestrator (research-lite — story complexity small + files named explicitly)
**Date:** 2026-04-29
**Story:** b5-pinterest-polish-and-smoke

## Q1 — Inline retryable browse-error pattern (Next 15 / React 19)

**Idiomatic answer:** the existing `BoardGrid` / `PinGrid` client components should track error state locally and render `<InlineBrowseError onRetry={...}/>` at the sentinel position when their server-action call (`loadMoreBoards` / `loadMorePins`) fails with `rate_limit`, `network`, or `unknown`. Existing items above the failure stay mounted (no list-state loss). A separate error boundary at the grid level is **not** the right tool — boundaries unmount their children on throw, defeating the "items remain intact" acceptance criterion.

**Critical architecture issue** discovered during read: `app/(authenticated)/pinterest/actions.ts` currently does:

```ts
if (!result.ok) {
  throw new Error(`Failed to load Pinterest boards: ${result.reason}`);
}
```

This **loses the typed `PinterestError` reason** — `result` is a discriminated union from `lib/pinterest/errors.ts` with `'invalid_token' | 'insufficient_scope' | 'not_found' | 'rate_limit' | 'network' | 'unknown'`, but we throw a string-formatted Error. The client can't distinguish `rate_limit` (inline retry) from `invalid_token` (bubble to `error.tsx` → b4 token remediation).

**Recommended fix in implement step:** change actions to throw with typed cause:

```ts
if (!result.ok) {
  throw new Error(`Failed to load Pinterest boards: ${result.reason}`, {
    cause: result,
  });
}
```

Client-side dispatch in `BoardGrid.handleLoadMore` / `PinGrid.handleLoadMore`:

```ts
catch (err) {
  const cause = (err as Error).cause as PinterestError | undefined;
  if (cause?.reason === 'rate_limit' || cause?.reason === 'network' || cause?.reason === 'unknown') {
    setBrowseError(cause); // render InlineBrowseError
  } else {
    throw err; // let error.tsx + b4 token remediation handle invalid_token / insufficient_scope / not_found
  }
}
```

Retry button calls `handleLoadMore(lastAttemptedBookmark)` — same handler, same bookmark. On success, error state clears and append proceeds normally.

## Q2 — Real-token Vercel preview smoke

**Resolved 2026-04-29 by Don (orchestrator question):** preview scope has zero env vars per app-infra-gotchas #4 — preview was punted because the Vercel CLI's branch prompt is unfriendly. Smoke target retargeted to **production alias `https://nail-tech-assistant.vercel.app`** where APP_URL + PINTEREST_ACCESS_TOKEN + Firebase blob are populated. Story AC #5 reworded to match.

**Test config:** `playwright.config.ts` adds a separate project `pinterest-real-token-smoke` that:

- Uses `process.env.SMOKE_BASE_URL ?? 'https://nail-tech-assistant.vercel.app'` so a future preview-with-token target retargets via env var, no code change.
- Default-skipped via `RUN_REAL_TOKEN_SMOKE=1` env flag check inside the spec (`test.skip(!process.env.RUN_REAL_TOKEN_SMOKE)`).
- Marked `test.describe.configure({ mode: 'serial' })`.

## Files inspected (orchestrator direct-read)

- `components/pinterest/BoardGrid.tsx` — client component, has `card-enter` keyframes + `prefers-reduced-motion` reset (b2 animations baseline; b5 reuses pattern for any new motion).
- `components/pinterest/PinGrid.tsx` — same shape as BoardGrid.
- `lib/pinterest/errors.ts` — `PinterestError` discriminated union.
- `app/(authenticated)/pinterest/error.tsx` — token-remediation boundary (b4); MUST NOT be touched by b5.
- `app/(authenticated)/pinterest/actions.ts` — server actions; **modify to thread typed cause**.

## Empty-state surfaces (per ADDENDUM.md v2)

- `EmptyBoardsState.tsx` (server-renderable): Fraunces heading "No boards yet.", Inter sentence, dashed-board-outline silhouette, 40×40 pushpin glyph (aria-hidden=true), `role='status' aria-live='polite'`. 5-col layout (2 silhouette + 3 copy), left-aligned.
- `EmptyPinsState.tsx` (server-renderable): same layout, copy "This board is empty."
- `InlineBrowseError.tsx` (client — needs onClick): Warm Charcoal heading "Pinterest didn't respond." (NOT destructive red), muted-foreground reason line, "Try again" button (primary bg), `role='alert'`.

## Conditional surfaces

- `[boardId]/not-found.tsx` — **skip**. Generic `not-found.tsx` from b3 covers it; ADDENDUM doesn't justify board-specific copy.
- `loading.tsx` segment fallback — **skip**. Existing Suspense boundaries from b2/b3 are sufficient (no perceptible flash observed in b3 ship).

## Animations sidecar

`ui:animations append` escalation now lists b5 (added 2026-04-29). Animations-specialist participates at the review step with reviewer. Touchpoints: optional 3-4s pushpin float loop on empty states (OFF by default per `_animations-spec.md §7`), InlineBrowseError mount fade, prefers-reduced-motion compliance.

## Out of scope (do NOT touch)

- `app/(authenticated)/pinterest/error.tsx` (b4 boundary)
- Token-remediation views (b4) — `TokenRemediation401View.tsx`, `TokenRemediation403View.tsx`
- `lib/pinterest/client.ts`, `lib/pinterest/auth-verify.ts` (b1 boundary)

# Epic B Research Brief — Pinterest Integration

## Scope reminder

- Epic B goal: let the authenticated user browse boards, open a board, and view pins through a static-token Pinterest integration.
- In-scope from PRD US-B-1: when the Pinterest env token is configured, opening the Pinterest surface should show an authenticated browse view without a user OAuth step; if the token is missing, revoked, or invalid, the route must block the flow and show token-replacement guidance.
- In-scope from PRD US-B-2: a valid token must render boards in a board grid, and selecting a board must render that board's pin grid.
- Explicitly excluded here: pin selection persistence, upload blending, AI generation, visualizer, library, and regenerate. This epic is browse-only.
- Sign-off #17 is locked: Pinterest uses one `PINTEREST_ACCESS_TOKEN` env var, with no OAuth callback, no refresh flow, and no client secret usage.

## Consumed from Epic A (already shipped)

- `lib/env.ts`
  - `Env` already exposes `PINTEREST_ACCESS_TOKEN: string`.
  - `env` is a singleton module export, so importing `@/lib/env` materializes env validation at startup.
- `middleware.ts`
  - Current matcher already protects `/pinterest` and `/pinterest/[boardId]`; no matcher change is needed.
- `lib/auth/session-guard.ts`
  - `hasSessionCookie(req)` is the existing edge-safe auth-shell gate used by middleware.
- `lib/firebase/session.ts`
  - `getSession(req): Promise<Session | null>` and `getSessionFromCookieString()` are the richer server-side session helpers if Epic B keeps any route handlers.
- `lib/firebase/server.ts`
  - Starts with `import 'server-only';` and establishes the server-only import pattern Epic B should copy for Pinterest.
- `app/(authenticated)/layout.tsx`
  - Provides the authenticated shell wrapper and main content container Epic B should nest under.
- `app/(authenticated)/page.tsx`
  - Establishes the current card styling and token usage to reuse in the Pinterest UI (`bg-card`, `text-foreground`, `font-heading-display`, ring styles, warm gradient language).

### Gaps / deltas to Epic A surface

- `components/` does not exist yet; Epic B creates it.
- `@/lib/utils` does not exist yet, even though `components.json` points at it.
- No shadcn primitives are installed yet; Epic B must choose between plain Tailwind and adding primitives.
- `PINTEREST_APP_ID` exists in `.env.example` and `.env.local` but is not in the `lib/env.ts` schema or exported `Env` interface.
- `next.config.ts` has no `images.remotePatterns`; `i.pinimg.com` is not yet allowed.
- Slice 2 names `app/(authenticated)/pinterest/page.tsx` but does not explicitly name `app/(authenticated)/pinterest/[boardId]/page.tsx`, even though US-B-2 requires board-detail routing.
- Slice 2 also plans API route handlers plus server-side page fetches, which creates an architectural fork the architect should resolve.

## Pinterest API v5 — scoped surface

### Authentication

- Auth mode is a bearer token header: `Authorization: Bearer {token}`.
- Base URL in scope: `https://api.pinterest.com/v5`.
- Required read scopes called out by the researcher:
  - `boards:read`
  - `pins:read`
  - `user_accounts:read`
- Confidence:
  - High for bearer-header format and base URL.
  - High for the browse-only read-scope set.
  - Medium on static-token lifetime details; the researcher flagged token TTL as an operational risk that still needs confirmation.

### Endpoints in scope

| Endpoint                         | Purpose                                | Request shape                                      | Response shape                                 | Notes                                                                                          |
| -------------------------------- | -------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /v5/user_account`           | Token sanity check / liveness probe    | No query required                                  | User account JSON                              | Use for `verifyPinterestToken()` and invalid-token branching.                                  |
| `GET /v5/boards`                 | List boards for the configured account | `page_size`, `bookmark`, optional `privacy` filter | `{ items: Board[], bookmark: string \| null }` | Endpoint confirmed; detailed Board field schema is only medium-confidence in the raw findings. |
| `GET /v5/boards/{board_id}/pins` | List pins for a selected board         | Path `board_id`; query `page_size`, `bookmark`     | `{ items: Pin[], bookmark: string \| null }`   | Empty board state is explicitly `{ "items": [], "bookmark": null }`.                           |

- Pagination model is cursor-based via `bookmark`:
  - First request omits `bookmark`.
  - Response returns `bookmark: string | null`.
  - Next request replays that bookmark until it becomes `null`.
- Shared pagination defaults called out by the researcher:
  - `page_size` default 25
  - `page_size` max 250
- Relevant board fields surfaced or inferred in the raw findings:
  - `id`, `name`, `description`, `privacy`, `pin_count`, `follower_count`, `created_at`, `board_pins_modified_at`, `media`, `owner.username`
  - Cover-image field naming is still an open item.
- Relevant pin fields directly confirmed in the raw findings:
  - `id`, `title`, `description`, `alt_text`, `link`
  - `board_id`, `board_section_id`, `board_owner.username`
  - `created_at`, `creative_type`, `dominant_color`
  - `has_been_promoted`, `is_owner`, `is_product`, `is_standard`, `parent_pin_id`
  - `media.media_type`
  - `media.images["150x150" | "400x300" | "600x" | "1200x"]`
- Image CDN host in scope: `i.pinimg.com`.

### Error surface

| Status          | Raw findings                                                                                   | Suggested user surface                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `401`           | Invalid or expired token; `code: 2` explicitly confirmed                                       | Block browse and show token-replacement guidance.                                                  |
| `403`           | Valid auth but insufficient scope / forbidden resource                                         | Show Pinterest access is not permitted for this token and route the user to replace/fix the token. |
| `404`           | Board or resource not found                                                                    | Use `notFound()` for invalid board IDs and render graceful board-not-found UI.                     |
| `429`           | Rate limited; researcher noted `Retry-After` or `x-ratelimit-reset` handling as defensive only | Show retryable "Pinterest is busy" guidance; do not build complex backoff in Slice 2.              |
| `400`           | Malformed request                                                                              | Treat as implementation or request-shape failure, not recoverable end-user input.                  |
| `5xx` / default | Unexpected Pinterest failure                                                                   | Show retryable generic browse error.                                                               |

- Error body structure is only partially confirmed:
  - Pinterest returns JSON with `code` and `message`.
  - Full error-code enum is not in the raw findings.
- Load-bearing UI implication from the raw findings:
  - The 401 token-invalid path should likely render dedicated token-guidance UI rather than relying on serialized `error.tsx` transport of a custom server Error object.

### Open questions (researcher-flagged, non-blocking)

- Exact `GET /v5/boards` Board schema, especially cover-image field names and sizes: confirm during implement.
- Static-token TTL / rotation cadence for dashboard-generated tokens: confirm during implement.
- Full Pinterest error-code enum beyond `code: 2`: confirm during implement.

## Next 15 integration patterns

- Keep Pinterest fetches server-side only:
  - `lib/pinterest/client.ts` should begin with `import 'server-only';`.
  - The token must never cross a client boundary or use a `NEXT_PUBLIC_` env var.
- Recommended fetch posture from the raw findings:
  - Use raw `fetch`, not a Pinterest SDK.
  - Default to `cache: 'no-store'` for correctness and simplicity.
  - Consider `next: { revalidate: 30 | 60 }` only if cold-start plus upstream latency feels too slow.
- App Router route shape:
  - `app/(authenticated)/pinterest/page.tsx` for the board grid.
  - `app/(authenticated)/pinterest/[boardId]/page.tsx` for the pin grid.
- Boundary files to include:
  - `app/(authenticated)/pinterest/error.tsx`
  - `app/(authenticated)/pinterest/not-found.tsx`
  - The raw findings also mention `app/(authenticated)/pinterest/[boardId]/not-found.tsx` as a valid local detail-route boundary.
- `next/image` integration:
  - Add `i.pinimg.com` to `next.config.ts` `remotePatterns`.
  - The researcher also called out a viable alternative: plain `<img>` or `next/image` with `unoptimized={true}` because Pinterest already serves right-sized variants.
- Streaming / loading posture:
  - `loading.tsx` per segment is a low-cost UX win.
  - Suspense on the detail page is optional polish, not a Slice 2 requirement.

## Proposed file additions (path + one-line purpose)

| Path                                                | Purpose                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `app/(authenticated)/pinterest/page.tsx`            | Board grid entry point (US-B-2)                                                                      |
| `app/(authenticated)/pinterest/[boardId]/page.tsx`  | NEW outline gap: board detail with pin grid (US-B-2)                                                 |
| `app/(authenticated)/pinterest/error.tsx`           | Token-invalid and rate-limit browse UX (US-B-1 / US-B-2 failure path)                                |
| `app/(authenticated)/pinterest/not-found.tsx`       | Invalid board ID graceful handling                                                                   |
| `lib/pinterest/client.ts`                           | `server-only` Pinterest fetch wrapper with typed responses                                           |
| `lib/pinterest/types.ts`                            | `PinterestBoard` / `PinterestPin` response types                                                     |
| `lib/pinterest/errors.ts`                           | Normalized `PinterestTokenInvalidError`, `PinterestRateLimitError`, `PinterestNotFoundError` classes |
| `components/pinterest/BoardGrid.tsx`                | Presentational board grid                                                                            |
| `components/pinterest/PinGrid.tsx`                  | Presentational pin grid; masonry vs uniform layout remains open                                      |
| `components/pinterest/TokenReplacementGuidance.tsx` | Replace-the-token guidance UI                                                                        |
| `lib/env.ts`                                        | Modify schema if Epic B keeps `PINTEREST_APP_ID`; otherwise remove it from env docs for parity       |
| `next.config.ts`                                    | Add `i.pinimg.com` to `remotePatterns`                                                               |

## Proposed function signatures (design-discussion-ready; final bound in story)

- `listPinterestBoards({ bookmark?: string }): Promise<{ boards: PinterestBoard[]; nextBookmark: string | null }>`
- `listPinterestBoardPins({ boardId: string; bookmark?: string }): Promise<{ pins: PinterestPin[]; nextBookmark: string | null }>`
- `verifyPinterestToken(): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'insufficient_scope' | 'network' }>`

## Risks for design-discussion debate

- Token expiry is real even under the current "static token" framing; this is manual rotation, not a permanent credential.
- Token leak boundary is load-bearing:
  - `server-only` import on the Pinterest client.
  - No client component access to the token.
  - Researcher suggested a bundle grep test for `pina_` as a safety check.
- Pagination UX is cursor-only; "Load more" is the simplest MVP recommendation.
- Layout debate remains open:
  - Masonry better matches Pinterest.
  - Uniform grid is simpler and more controlled.
- Token TTL is still unverified for dashboard-generated static tokens.
- Empty-state UX needs explicit handling for:
  - zero boards
  - zero pins in a board
  - failed browse when the token is unhealthy
- Pinterest image aspect ratios vary; the UI choice affects cropping, perceived quality, and complexity.
- Vercel cold-start plus upstream Pinterest latency could make first-load feel slow.
- API routes plus direct server-component fetches may be redundant for Slice 2; the raw findings recommend resolving that before implementation.

## Tailwind / token mapping note

- Epic B should stay inside Epic A's existing token system and visual language. Reuse `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-primary`, `font-heading-display`, the existing ring treatment, and the current warm gradient language. Board cards should read like first-class authenticated-shell cards, not a new brand surface. Empty and error states should lean on muted foreground plus secondary/card surfaces. No new color tokens are justified by the raw findings.

## Scope recommendation

- Small-to-medium. The researcher reached the same conclusion because the endpoint surface is narrow, auth is already decided, Epic A already shipped the protected shell and env handling, and the main remaining design weight is around error UX, route shape, and presentation choices rather than backend complexity.

## References (for traceability)

- `.pHive/epics/epic-b-pinterest-integration/docs/research-raw-findings.md` — source of truth
- `.pHive/planning/prd.md` — Epic B goal plus US-B-1 / US-B-2 acceptance criteria
- `.pHive/planning/structured-outline.md` — Slice 2 file plan and route gap
- `.pHive/planning/sign-off.md` — #17 static-token decision

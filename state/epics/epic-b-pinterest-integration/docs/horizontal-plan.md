## 1. Layer Inventory

- Env / Config: `lib/env.ts` already validates `PINTEREST_ACCESS_TOKEN`; Epic B keeps that module authoritative, removes stale `PINTEREST_APP_ID` from `.env.example`, and adds Pinterest image-host config in `next.config.ts`.
- Runtime env docs: `.env.example` currently drifts from runtime schema; Epic B aligns operator-facing docs with the real static-token contract and resolved cleanup decision.
- Next.js image config: `next.config.ts` already exposes `images.remotePatterns` as an empty array; Epic B uses it to allow `i.pinimg.com`.
- Server-only Pinterest integration: `lib/pinterest/client.ts` is the secret-bearing fetch layer; Epic B adds bearer-header requests, token verification, board list fetch, board-pin fetch, and normalized failures.
- Pinterest types: `lib/pinterest/types.ts` captures the board, pin, and paginated response shapes the UI actually consumes.
- Pinterest error normalization: `lib/pinterest/errors.ts` becomes the discriminated error contract that drives 401 vs 403 page rendering, 404 not-found handling, and retryable unexpected failures.
- Authenticated App Router entry: `app/(authenticated)/pinterest/page.tsx` is the board-grid route under the existing protected shell; Epic B adds streamed render, token-health branching, and first-page board fetch.
- Authenticated App Router detail route: `app/(authenticated)/pinterest/[boardId]/page.tsx` is the board-detail pin-grid route required by US-B-2; Epic B adds streamed render, board validation, and first-page pin fetch.
- Route boundaries: `error.tsx`, `not-found.tsx`, and optional `[boardId]/not-found.tsx` provide unexpected-failure and invalid-board boundaries; token-invalid states stay in page-level render branches instead of `error.tsx`.
- Server components: board/pin server renderers fetch initial data, pass serializable props into client grids, and host the `<Suspense>` boundaries chosen in the resolved design.
- Client components: `components/pinterest/` does not exist yet; Epic B creates the board grid, pin grid, cards, skeletons, and page-state views that render the browse surface inside Epic A's visual language.
- Pagination interaction layer: infinite scroll is a resolved decision, so Epic B needs an `IntersectionObserver` sentinel and a bookmark-driven append contract for both boards and pins.
- Server action pagination transport: to avoid API passthrough duplication while still supporting client-triggered pagination, Epic B needs server actions that accept `bookmark` and return `{ items, nextBookmark }` for boards and pins.
- Token-remediation copy: terse replacement/fix-token text needs one shared module so 401 and 403 views stay consistent while still splitting remediation paths.
- Test layer: TDD is mandated in cycle state; Epic B needs unit, integration, e2e, and security-boundary tests for token verification, browse rendering, pagination append behavior, and bundle secret leakage checks.
- Deployment / hosting posture: Vercel remains the production target, so token-replacement copy and image config must match local plus Vercel runtime behavior.
- Existing auth shell / middleware: `middleware.ts` and `app/(authenticated)/layout.tsx` already gate and frame the route; Epic B reuses them without matcher changes.
- External integration boundary: Pinterest API v5 remains narrow and browse-only; Epic B touches `GET /v5/user_account`, `GET /v5/boards`, and `GET /v5/boards/{board_id}/pins` with static env-backed auth.
- UX layer: Epic B must preserve touch-friendly tablet browsing, clear ready/error/empty states, warm-shell styling continuity, and distinct 401 vs 403 operator guidance.
- Documentation / operational clarity: FR-B-7 requires setup and replacement guidance to stay simple; Epic B updates the runtime contract, replacement copy, and deployment-facing instructions without introducing OAuth or refresh semantics.

## 2. Per-Layer Requirements

## Layer: Env / Config

FILES:

- `lib/env.ts`
- `.env.example`
- `next.config.ts`

REQUIREMENTS:

- Keep `PINTEREST_ACCESS_TOKEN` as the authoritative runtime env contract in `lib/env.ts`.
- Do not add `PINTEREST_APP_ID` to the runtime schema; resolved decision says the runtime contract stays authoritative in `lib/env.ts`.
- Remove stale `PINTEREST_APP_ID` from `.env.example`.
- Keep local and Vercel operator setup aligned with the static-token model from PRD US-B-3.
- Add `images.remotePatterns` coverage for host `i.pinimg.com` in `next.config.ts`.
- Ensure image-host config supports both board-card and pin-card media rendering.
- Preserve the existing authenticated-shell deployment posture; no callback URL or refresh-token config is added.

## Layer: Server-only Pinterest Client

FILES:

- `lib/pinterest/client.ts`
- `lib/pinterest/types.ts`
- `lib/pinterest/errors.ts`

CLIENT MODULE REQUIREMENTS:

- Start `lib/pinterest/client.ts` with `import 'server-only';`.
- Read `env.PINTEREST_ACCESS_TOKEN` only inside this server-only module.
- Centralize the Pinterest base URL as `https://api.pinterest.com/v5`.
- Centralize bearer-header request construction.
- Default fetch posture to `cache: 'no-store'`.
- Implement `verifyPinterestToken()` against `GET /v5/user_account`.
- Implement `listPinterestBoards({ bookmark?: string, pageSize?: number })`.
- Implement `listPinterestBoardPins({ boardId: string, bookmark?: string, pageSize?: number })`.
- Carry Pinterest cursor pagination through `bookmark`.
- Support first-request omission of `bookmark` and replay of the returned cursor until `null`.
- Normalize Pinterest response payloads into UI-ready return shapes.
- Normalize Pinterest failures into typed outcomes instead of leaking raw `fetch` behavior into routes.

TYPE REQUIREMENTS:

- Define a board type covering the fields the UI uses: `id`, `name`, `description`, `privacy`, `pin_count`, `follower_count`, `created_at`, `board_pins_modified_at`, `media`, and `owner.username`.
- Define a pin type covering the fields the UI uses: `id`, `title`, `description`, `alt_text`, `link`, `board_id`, `board_section_id`, `board_owner.username`, `created_at`, `creative_type`, `dominant_color`, `has_been_promoted`, `is_owner`, `is_product`, `is_standard`, `parent_pin_id`, `media.media_type`, and image variants.
- Define paginated response types for board and pin list calls with `items` and `bookmark`.
- Keep board cover-image typing flexible enough for the researcher-noted schema uncertainty around exact cover-image field names.

ERROR REQUIREMENTS:

- Model a discriminated union or equivalent typed error contract covering `invalid_token`, `insufficient_scope`, `not_found`, `rate_limit`, `network`, and `unknown`.
- Distinguish 401 from 403 at the normalization layer.
- Preserve enough error detail for page-level render branching without exposing secrets.
- Normalize 404 so route code can call `notFound()` for bad board IDs.
- Normalize 429 into a retryable browse failure shape.
- Treat malformed 400s as implementation failures, not user-recoverable product states.

## Layer: Route Segments

FILES:

- `app/(authenticated)/pinterest/page.tsx`
- `app/(authenticated)/pinterest/[boardId]/page.tsx`
- `app/(authenticated)/pinterest/error.tsx`
- `app/(authenticated)/pinterest/not-found.tsx`
- `app/(authenticated)/pinterest/[boardId]/not-found.tsx` [data not provided]
- `app/(authenticated)/pinterest/loading.tsx` [data not provided]

ROUTE REQUIREMENTS:

- `/pinterest` must render inside the existing authenticated shell and satisfy US-B-1 and US-B-2 board browse acceptance.
- `/pinterest/[boardId]` must render the selected board's pin grid and satisfy US-B-2 board-detail acceptance.
- `page.tsx` must perform token verification before deciding whether to render browse UI or remediation UI.
- `[boardId]/page.tsx` must perform token verification before deciding whether to render browse UI or remediation UI.
- Both pages must implement the architect-baked page-level branch for token-invalid and insufficient-scope states; they must not rely on `error.tsx` for those states.
- Both pages must split 401 and 403 into separate rendered branches and separate copy.
- `error.tsx` must remain reserved for unexpected failures and retry flows.
- `not-found.tsx` must support invalid board IDs and missing Pinterest board resources.
- The board-detail route must call `notFound()` when the normalized Pinterest client returns a `not_found` condition for a board.
- Any segment-level `loading.tsx` must complement, not replace, the page-level `<Suspense>` design already resolved.

## Layer: Server Components

FILES / COMPONENTS:

- Board fetch wrapper in `app/(authenticated)/pinterest/page.tsx`
- Pin fetch wrapper in `app/(authenticated)/pinterest/[boardId]/page.tsx`
- `BoardsSection` server component [data not provided]
- `PinsSection` server component [data not provided]

REQUIREMENTS:

- Fetch the first page of boards server-side and pass serializable initial props to `BoardGrid`.
- Fetch the first page of pins server-side and pass serializable initial props to `PinGrid`.
- Call `verifyPinterestToken()` before list fetches in both routes.
- Render `TokenInvalidView` when token verification returns the 401 branch.
- Render `InsufficientScopeView` when token verification returns the 403 branch.
- Render browse content only after a healthy token result.
- Surface retryable unexpected failures to `error.tsx`.
- Preserve the existing authenticated-shell card and typography language noted in the research brief.
- Preserve touch-friendly browse layout for tablet use.

## Layer: Client Components

FILES:

- `components/pinterest/BoardGrid.tsx`
- `components/pinterest/PinGrid.tsx`
- `components/pinterest/BoardCard.tsx`
- `components/pinterest/PinCard.tsx`
- `components/pinterest/InfiniteScrollSentinel.tsx`
- `components/pinterest/BoardGridSkeleton.tsx`
- `components/pinterest/PinGridSkeleton.tsx`
- `components/pinterest/TokenInvalidView.tsx`
- `components/pinterest/InsufficientScopeView.tsx`

REQUIREMENTS:

- Create `components/pinterest/` because the repo does not have a `components/` directory yet.
- Keep the slice Tailwind-first; resolved decision defers `lib/utils.ts` and `cn()`.
- `BoardGrid.tsx` must render a uniform board grid from initial server-provided items.
- `PinGrid.tsx` must render a uniform pin grid from initial server-provided items.
- `BoardCard.tsx` must render board metadata and navigate to `/pinterest/[boardId]`.
- `PinCard.tsx` must render pin metadata and Pinterest image variants in the authenticated-shell visual language.
- The pin layout must be uniform, not masonry.
- `InfiniteScrollSentinel.tsx` must use `IntersectionObserver` to trigger pagination when the sentinel enters view.
- `BoardGrid.tsx` must append later pages returned from the pagination transport.
- `PinGrid.tsx` must append later pages returned from the pagination transport.
- The sentinel must stop requesting more data when `nextBookmark` becomes `null`.
- `BoardGridSkeleton.tsx` and `PinGridSkeleton.tsx` must match the card-first browse layout used by the streamed routes.
- `TokenInvalidView.tsx` must be server-renderable and require no client-only behavior.
- `InsufficientScopeView.tsx` must be server-renderable and require no client-only behavior.
- The 401 and 403 views must share copy primitives but render different remediation paths.
- Empty-board and empty-pin states must be explicit UI states rather than blank grids.

## Layer: Suspense + Streaming Boundaries

FILES / PLACEMENTS:

- `<Suspense fallback={<BoardGridSkeleton />}>` in `app/(authenticated)/pinterest/page.tsx`
- `<Suspense fallback={<PinGridSkeleton />}>` in `app/(authenticated)/pinterest/[boardId]/page.tsx`

REQUIREMENTS:

- Stream `/pinterest` with `<Suspense>` boundaries and skeletons; this is a resolved decision.
- Stream `/pinterest/[boardId]` with `<Suspense>` boundaries and skeletons; this is a resolved decision.
- Keep token-health branching in the same awaited server path that decides whether browse content or remediation content is rendered.
- Do not throw 401 or 403 from a streamed child and expect `error.tsx` to carry product-grade remediation.
- Keep skeletons visually consistent with the existing warm-shell design language.
- Preserve the ability for unexpected failures inside streamed browse content to bubble to `error.tsx`.

## Layer: Pagination Wiring

FILES:

- `app/(authenticated)/pinterest/actions.ts`
- `components/pinterest/InfiniteScrollSentinel.tsx`

SERVER ACTION REQUIREMENTS:

- Provide a server action for board pagination that accepts `bookmark` and returns `{ items, nextBookmark }`.
- Provide a server action for pin pagination that accepts `boardId`, `bookmark`, and returns `{ items, nextBookmark }`.
- Reuse the same server-only Pinterest client list functions used by the initial page render.
- Keep the token boundary server-side; the client may send cursor and board ID, but never the token.
- Return append-ready item arrays to the client grids.
- Preserve the Pinterest bookmark semantics exactly.

CLIENT PAGINATION REQUIREMENTS:

- Trigger board pagination when the board sentinel intersects.
- Trigger pin pagination when the pin sentinel intersects.
- Prevent duplicate in-flight requests for the same cursor.
- Append new items without replacing the initial server-rendered list.
- Handle `rate_limit`, `network`, and `unknown` pagination failures with retryable browse messaging.
- Stop observing once no further cursor exists.

## Layer: Token-Replacement Copy Module

FILES:

- `lib/pinterest/token-replacement-copy.ts`
- `components/pinterest/TokenInvalidView.tsx`
- `components/pinterest/InsufficientScopeView.tsx`

REQUIREMENTS:

- Keep one source of truth for operator-facing token-remediation copy.
- Make the copy terse.
- Reference the Pinterest developer dashboard in the copy.
- Include direct "update Vercel env" steps in the copy.
- Provide distinct 401 copy for missing / invalid / revoked token replacement.
- Provide distinct 403 copy for insufficient-scope token re-issue with the required read scopes.
- Keep the copy aligned with the static-token, no-refresh, no-OAuth operating model.
- Keep the copy readable for a non-technical operator while still being specific.

## Layer: Tests

FILES / TARGETS:

- `lib/pinterest/client.test.ts`
- `app/(authenticated)/pinterest/pinterest-page.test.tsx`
- `app/(authenticated)/pinterest/[boardId]/pinterest-board-page.test.tsx`
- `app/(authenticated)/pinterest/actions.test.ts`
- `tests/e2e/pinterest-browse.spec.ts`
- bundle-grep security test target [data not provided]

UNIT TEST REQUIREMENTS:

- Cover `verifyPinterestToken()` success on 200.
- Cover `verifyPinterestToken()` invalid-token handling on 401.
- Cover `verifyPinterestToken()` insufficient-scope handling on 403.
- Cover `verifyPinterestToken()` network failure normalization.
- Cover board-list pagination normalization with `bookmark`.
- Cover pin-list pagination normalization with `bookmark`.
- Cover `not_found` normalization for invalid board IDs.
- Cover rate-limit normalization for 429.

INTEGRATION TEST REQUIREMENTS:

- Mock Pinterest responses for `/v5/user_account`, `/v5/boards`, and `/v5/boards/{board_id}/pins`.
- Verify `/pinterest` renders boards when the token is healthy.
- Verify `/pinterest` renders `TokenInvalidView` on 401.
- Verify `/pinterest` renders `InsufficientScopeView` on 403.
- Verify `/pinterest/[boardId]` renders pins when the token is healthy.
- Verify `/pinterest/[boardId]` calls `notFound()` for an invalid board.
- Verify pagination server actions return `{ items, nextBookmark }`.

SECURITY / BOUNDARY TEST REQUIREMENTS:

- Add a bundle-grep check that `pina_` does not appear in client chunks.
- Verify the Pinterest token cannot cross a client import boundary.
- Support the architect's pre-exec `security:plan-audit` escalation topic.

E2E REQUIREMENTS:

- Cover golden path: log in, open `/pinterest`, stream boards, click a board, stream pins, scroll, and load the next page.
- Cover token-invalid browse block with remediation copy.
- Cover insufficient-scope browse block with distinct remediation copy.
- Cover invalid-board routing to not-found UI.
- Keep real-token verification limited to one smoke path at epic acceptance; full suite can stay mocked.

## Layer: Deployment / Infrastructure

FILES / SURFACES:

- Vercel runtime env configuration
- local `.env.local`
- GitHub Actions / CI test gates [data not provided]

REQUIREMENTS:

- Keep Epic B deployable on local and Vercel without callback handling.
- Ensure the runtime only depends on `PINTEREST_ACCESS_TOKEN`.
- Keep token-replacement instructions accurate for Vercel env updates.
- Ensure image-host config works in deployed builds.
- Run the TDD test surface in the existing project test commands and CI gating posture.
- Preserve the current auth middleware and authenticated-shell assumptions already shipped in Epic A.

## 3. Cross-Layer Dependencies

DEPENDENCIES:

- `app/(authenticated)/pinterest/page.tsx` -> `verifyPinterestToken()` in `lib/pinterest/client.ts` before any board fetch.
- `app/(authenticated)/pinterest/[boardId]/page.tsx` -> `verifyPinterestToken()` in `lib/pinterest/client.ts` before any pin fetch.
- `app/(authenticated)/pinterest/page.tsx` -> `listPinterestBoards()` for the first board page.
- `app/(authenticated)/pinterest/[boardId]/page.tsx` -> `listPinterestBoardPins()` for the first pin page.
- `lib/pinterest/client.ts` -> `env.PINTEREST_ACCESS_TOKEN` in `lib/env.ts`; the token read stays server-only.
- `lib/pinterest/client.ts` -> `import 'server-only';` boundary enforcement.
- `lib/pinterest/client.ts` -> Pinterest API `GET /v5/user_account` for token verification.
- `lib/pinterest/client.ts` -> Pinterest API `GET /v5/boards` for board listing.
- `lib/pinterest/client.ts` -> Pinterest API `GET /v5/boards/{board_id}/pins` for board-detail listing.
- `lib/pinterest/errors.ts` -> `page.tsx` render branches for 401 vs 403.
- `lib/pinterest/errors.ts` -> `[boardId]/page.tsx` render branches for 401 vs 403.
- `lib/pinterest/errors.ts` -> `notFound()` invocation path when Pinterest returns a normalized `not_found`.
- Architect MAJOR-1 -> `page.tsx` and `[boardId]/page.tsx`; token-invalid and insufficient-scope must render inside the route segment, not `error.tsx`.
- Architect MAJOR-2 -> `TokenInvalidView.tsx` and `InsufficientScopeView.tsx`; 401 and 403 require separate UI branches.
- Resolved decision `uniform` -> `PinGrid.tsx` and `PinCard.tsx`; no masonry implementation surface is needed.
- Resolved decision `infinite-scroll` -> `InfiniteScrollSentinel.tsx`, pagination server actions, and append logic in both grids.
- Resolved decision `defer cn()` -> `components/pinterest/*`; styling stays Tailwind-first without `lib/utils.ts`.
- Resolved decision `remove-from-env-example` -> `.env.example` and operator docs; runtime remains `lib/env.ts`.
- Resolved decision `terse-with-dashboard-and-vercel-steps` -> `lib/pinterest/token-replacement-copy.ts`, `TokenInvalidView.tsx`, and `InsufficientScopeView.tsx`.
- Resolved decision `stream-with-suspense` -> both route pages and both skeleton components.
- `BoardGrid.tsx` -> initial board items from server-rendered props in `/pinterest`.
- `PinGrid.tsx` -> initial pin items from server-rendered props in `/pinterest/[boardId]`.
- `BoardCard.tsx` -> board data typed in `lib/pinterest/types.ts`.
- `PinCard.tsx` -> pin data typed in `lib/pinterest/types.ts`.
- `BoardCard.tsx` -> `next/image` and `next.config.ts` remotePatterns for `i.pinimg.com`.
- `PinCard.tsx` -> `next/image` and `next.config.ts` remotePatterns for `i.pinimg.com`.
- `BoardGridSkeleton.tsx` -> `<Suspense>` fallback in `/pinterest`.
- `PinGridSkeleton.tsx` -> `<Suspense>` fallback in `/pinterest/[boardId]`.
- `InfiniteScrollSentinel.tsx` -> board pagination server action response contract `{ items, nextBookmark }`.
- `InfiniteScrollSentinel.tsx` -> pin pagination server action response contract `{ items, nextBookmark }`.
- Board pagination server action -> `listPinterestBoards()` in the server-only client.
- Pin pagination server action -> `listPinterestBoardPins()` in the server-only client.
- Board pagination server action -> bookmark semantics from Pinterest paginated responses.
- Pin pagination server action -> bookmark semantics from Pinterest paginated responses.
- `TokenInvalidView.tsx` -> 401 branch from typed errors and shared remediation copy.
- `InsufficientScopeView.tsx` -> 403 branch from typed errors and shared remediation copy.
- Shared remediation copy module -> Pinterest dashboard reference and Vercel env steps from the resolved copy decision.
- `/pinterest` route -> existing `middleware.ts` protection; no matcher change is required.
- `/pinterest/[boardId]` route -> existing `middleware.ts` protection; no matcher change is required.
- App Router routes -> `app/(authenticated)/layout.tsx` authenticated-shell wrapper.
- Empty-board UI -> successful board fetch returning `items: []`.
- Empty-pin UI -> successful pin fetch returning `items: []`.
- Retryable browse error UI -> normalized `rate_limit`, `network`, or `unknown` failures from the Pinterest client.
- Tests -> mocked Pinterest payloads that match the shapes in `lib/pinterest/types.ts`.
- Bundle-grep security test -> build output from client chunks to prove the secret boundary holds.
- E2E browse path -> login and existing auth/session behavior from Epic A.
- Deployment docs -> Vercel env model and static-token operating assumptions from PRD US-B-3.

## 4. Layer Map Diagram

```text
HORIZONTAL LAYER MAP
──────────────────────────────────────────────────────────────────────────────────────────────
Env / Config        │ lib/env.ts          │ .env.example       │ next.config.ts            │
                    │ ACCESS_TOKEN only   │ remove APP_ID      │ allow i.pinimg.com        │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Pinterest Client    │ client.ts           │ types.ts           │ errors.ts                 │
                    │ verify/list fetches │ Board/Pin shapes   │ 401/403/404/429 union     │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Routes              │ /pinterest          │ /pinterest/[id]    │ error.tsx / not-found     │
                    │ boards entry        │ pins detail        │ unexpected / bad board    │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Server Components   │ board fetch wrapper │ pin fetch wrapper  │ page-level token branch   │
                    │ first page props    │ first page props   │ 401 vs 403 rendered       │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Client Components   │ BoardGrid/Card      │ PinGrid/Card       │ Token views               │
                    │ uniform cards       │ uniform cards      │ invalid / scope           │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Streaming           │ Suspense boards     │ Suspense pins      │ Board/Pin skeletons       │
                    │ page.tsx fallback   │ [boardId] fallback │ streamed, not blocking    │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Pagination          │ actions.ts boards   │ actions.ts pins    │ InfiniteScrollSentinel    │
                    │ bookmark in/out     │ boardId+bookmark   │ IntersectionObserver      │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Copy Module         │ token-replacement   │ 401 remediation    │ 403 remediation           │
                    │ terse shared source │ rotate token path  │ re-scope token path       │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Tests               │ unit client         │ integration routes │ e2e browse + bundle grep  │
                    │ verify + normalize  │ render branches    │ secret boundary audit     │
────────────────────┼─────────────────────┼────────────────────┼───────────────────────────┤
Deployment          │ local env           │ Vercel env         │ CI / smoke verification   │
                    │ static token        │ update env steps   │ mocked + one real token   │
──────────────────────────────────────────────────────────────────────────────────────────────
```

## 5. Scope Summary

HORIZONTAL SCOPE:

- Layers affected: 10
- Total concrete items mapped: 58
- New vs modified: 49 new, 9 modified
- Estimated total effort: medium

- Largest layer: Client components
- Riskiest layer: Server-only Pinterest client

DETAIL:

- Core route surface: `/pinterest` and `/pinterest/[boardId]`
- External endpoints in scope: 3 Pinterest API endpoints
- Required rendered token states: 2 explicit page-level branches (401 invalid/missing, 403 insufficient scope)
- Required route-level failure boundaries: unexpected failure and not-found
- Required pagination mode: infinite scroll via `IntersectionObserver`
- Required layout decision: uniform grid
- Required streaming posture: `<Suspense>` with skeleton fallbacks
- Required env cleanup: remove `PINTEREST_APP_ID` from `.env.example`
- Required security check: bundle-grep proof that `pina_` does not enter client chunks
- Required test surfaces: unit, integration, e2e, and secret-boundary verification

SCOPE CHARACTER:

- Breadth is driven more by UI states, pagination wiring, and test coverage than by Pinterest API width.
- The security boundary is the load-bearing unknown because the token cannot leak across any client import path.
- The epic stays browse-only; no OAuth, refresh flow, persistence, or write APIs enter this map.
- Operational clarity is part of scope because US-B-1 and US-B-3 require replace-the-token guidance when access fails.

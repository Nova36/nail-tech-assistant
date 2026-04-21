# 1. Slicing Strategy

The slice plan follows the TPM-set seam order: security boundary first, then route delivery, then detail-route completion, then operator-facing token remediation, then polish. That ordering matches the architect escalation in cycle state and the horizontal plan's cross-layer dependencies.

The thinnest possible first slice is not a UI. It is a server-only Pinterest boundary that proves the token is consumed in one place, that token health can be classified into typed outcomes, and that a build-level check can prove the token string does not cross into client chunks. This is the only first slice that satisfies the architect's pre-exec `security:plan-audit` requirement without tying the secret boundary to route or component churn.

From there, the progression is:

- establish the secret-safe integration seam
- use that seam to deliver the `/pinterest` board browse route
- reuse the same seam and browse pattern for `/pinterest/[boardId]`
- layer in the explicit 401 and 403 operator branches mandated by architect review
- finish deferred browse polish and acceptance smoke coverage

The natural boundaries come from cross-stack dependency order already visible in the horizontal map:

- Env / Config and the server-only client must exist before any route can safely consume Pinterest.
- Route segments and server components can ship the board browse path before the board-detail path exists.
- Client grids, Suspense boundaries, and pagination wiring can be reused from boards to pins once the first route pattern is proven.
- Token-remediation copy is intentionally delayed until the browse path exists, because the architect required page-level branching but that does not block proving the server boundary first.
- Empty states, retryable browse polish, and real-token smoke are final because they refine already-working paths rather than establish new architecture.

This plan also matches the TPM risk split:

- Slice 1 is HIGH because it is the only slice where a secret-handling mistake could leak into the bundle.
- Slices 2-4 are MEDIUM because they add real integration, UI transport, and operator guidance, but on top of an already-proven boundary.
- Slice 5 is LOW because it is polish and acceptance hardening, not a new integration seam.

The min-viable-ship cut is S1+S2+S3+S4. That cut delivers the full epic value named by the TPM: US-B-1 plus US-B-2. Slice 5 is explicitly deferred-eligible if schedule pressure lands late.

STRATEGY:
Total horizontal items: 10
Planned slices: 5
First slice goal: prove the server-only token boundary and typed token verification before any Pinterest UI exists
Final slice goal: complete browse-only Pinterest feature with board browse, board-detail pin browse, token-remediation branches, and deferred polish
Slicing rationale: subsystem-seam alignment (security boundary -> routes -> presentation -> operator UX -> cleanup) cross-checked with risk-class split (HIGH security -> MEDIUM integration -> MEDIUM integration -> MEDIUM operator UX -> LOW polish)

# 2. Vertical Slice Plan

## Step 1: Token boundary + server-only client

WHAT WORKS AFTER THIS STEP: `lib/pinterest/{client,types,errors}.ts` exists, `verifyPinterestToken()` resolves correctly against mocked 200/401/403/network responses, `lib/env.ts` already-validated `PINTEREST_ACCESS_TOKEN` is the only token consumer, and a bundle-grep test proves `pina_` does not appear in any client chunk produced by the build. No UI yet. No routes yet.

LAYERS TOUCHED:
Env / Config: - remove stale `PINTEREST_APP_ID` from `.env.example` so env docs match the authoritative `lib/env.ts` runtime contract - add `i.pinimg.com` to `next.config.ts` `images.remotePatterns` so later board and pin media can render in deployed builds - keep `lib/env.ts` authoritative for `PINTEREST_ACCESS_TOKEN` and do not add callback or refresh-token config
Server-only Pinterest Client: - add `lib/pinterest/client.ts` with `import 'server-only';` - centralize bearer-header request construction against `https://api.pinterest.com/v5` - read `env.PINTEREST_ACCESS_TOKEN` only inside the server-only client module - set default fetch posture to `cache: 'no-store'` - implement `verifyPinterestToken()` against `GET /v5/user_account` - add `lib/pinterest/types.ts` for the board, pin, and paginated response shapes the UI will consume later - add `lib/pinterest/errors.ts` with the 6-arm discriminated union: `invalid_token`, `insufficient_scope`, `not_found`, `rate_limit`, `network`, `unknown` - normalize 401 and 403 distinctly at the integration seam rather than in routes
Tests: - add unit coverage for `verifyPinterestToken()` success on 200 - add unit coverage for `verifyPinterestToken()` invalid-token handling on 401 - add unit coverage for `verifyPinterestToken()` insufficient-scope handling on 403 - add unit coverage for network-failure normalization - add a bundle-grep security test that asserts `pina_` is absent from `.next/static/**` client chunks - keep `pnpm typecheck` clean so the server/client boundary is typecheck-verifiable

NOT YET:

- no `/pinterest` route
- no `/pinterest/[boardId]` route
- no server components
- no client components
- no Suspense boundaries or skeletons
- no pagination transport or sentinel
- no token-remediation copy module
- no e2e coverage

VERIFIED BY:

- Unit: `lib/pinterest/client.test.ts` verifies `verifyPinterestToken()` against mocked 200, 401, 403, and network responses
- Security: bundle-grep test confirms `pina_` is absent from `.next/static/**` client chunks
- Typecheck: `pnpm typecheck` passes with `lib/pinterest/{client,types,errors}.ts` in place

COMMIT REPRESENTS: Server-only Pinterest client + token boundary; bundle-grep proves token does not leak to client chunks.

## Step 2: `/pinterest` boards grid

BUILDS ON: Step 1

WHAT WORKS AFTER THIS STEP: Authenticated user opens `/pinterest`, server fetches first page of boards via `listPinterestBoards()`, `<Suspense fallback={<BoardGridSkeleton/>}>` streams skeletons during fetch, then `BoardGrid` renders a uniform board grid; scrolling triggers `InfiniteScrollSentinel` which calls the boards server action with `bookmark` and appends results until `nextBookmark` is null.

LAYERS TOUCHED:
Server-only Pinterest Client: - implement `listPinterestBoards({ bookmark?: string, pageSize?: number })` - normalize board-list responses into append-ready UI shapes with `items` and `nextBookmark` - preserve Pinterest cursor semantics: omit `bookmark` on first request, replay returned cursor until `null`
Route Segments: - add `app/(authenticated)/pinterest/page.tsx` under the existing protected authenticated shell - keep the route focused on board browse only in this slice
Server Components: - fetch the first page of boards server-side in the route - pass serializable initial board props to `BoardGrid` - keep browse rendering inside the authenticated-shell visual language already established in Epic A
Client Components: - add `components/pinterest/BoardGrid.tsx` - add `components/pinterest/BoardCard.tsx` - add `components/pinterest/BoardGridSkeleton.tsx` - add `components/pinterest/InfiniteScrollSentinel.tsx` - render a uniform board grid rather than introducing alternative layout complexity
Suspense + Streaming Boundaries: - place `<Suspense fallback={<BoardGridSkeleton/>}>` in `app/(authenticated)/pinterest/page.tsx` - use the skeleton fallback to reduce perceived blocking while the first board page loads
Pagination Wiring: - add `app/(authenticated)/pinterest/actions.ts` board-pagination server action - accept `bookmark` on the server action and return `{ items, nextBookmark }` - wire `InfiniteScrollSentinel` to trigger the action when the sentinel intersects - append returned boards without replacing the initial server-rendered list - stop requesting more pages when `nextBookmark` becomes `null`
Tests: - add integration coverage that `/pinterest` renders a board grid on healthy mocked Pinterest responses - add integration coverage that the boards server action returns `{ items, nextBookmark }` - add partial e2e golden-path coverage: log in, open `/pinterest`, boards stream, scroll, and append the next page - include manual tablet-touch verification on local development because touch-friendliness is part of Epic B UX requirements

NOT YET:

- no board-detail route
- no `listPinterestBoardPins()`
- no 401 page-level token-invalid branch
- no 403 insufficient-scope branch
- no token-replacement copy module
- no `not-found.tsx` handling for invalid board IDs
- no `error.tsx` scope refinement beyond deferral

VERIFIED BY:

- Integration: `/pinterest` renders boards when Pinterest mocks return a healthy 200 path
- Integration: boards server action returns `{ items, nextBookmark }`
- E2E: authenticated user logs in, sees streamed board skeletons resolve into a grid, scrolls, and appends the next page
- Manual: tablet-touch browse is verified locally

COMMIT REPRESENTS: `/pinterest` boards browse with Suspense streaming + IntersectionObserver infinite scroll.

## Step 3: `/pinterest/[boardId]` pin grid

BUILDS ON: Step 2

WHAT WORKS AFTER THIS STEP: Clicking a board card from `/pinterest` navigates to `/pinterest/[boardId]`, server fetches first page of pins via `listPinterestBoardPins()`, `<Suspense fallback={<PinGridSkeleton/>}>` streams, `PinGrid` renders a uniform pin grid (not masonry), and scrolling triggers the pins server action with `bookmark` until exhausted. Invalid `boardId` triggers `notFound()` and renders `not-found.tsx`.

LAYERS TOUCHED:
Server-only Pinterest Client: - implement `listPinterestBoardPins({ boardId, bookmark?: string, pageSize?: number })` - normalize pin-list responses into UI-ready `items` plus `nextBookmark` - normalize invalid-board responses into the `not_found` outcome the route can translate to `notFound()`
Route Segments: - add `app/(authenticated)/pinterest/[boardId]/page.tsx` - add `app/(authenticated)/pinterest/not-found.tsx` for invalid board routing - optionally add `app/(authenticated)/pinterest/[boardId]/not-found.tsx` if board-specific copy is needed later
Server Components: - fetch the first page of pins server-side in the detail route - pass serializable initial pin props to `PinGrid` - call `notFound()` when the normalized client returns `not_found` for the requested board
Client Components: - add `components/pinterest/PinGrid.tsx` - add `components/pinterest/PinCard.tsx` - add `components/pinterest/PinGridSkeleton.tsx` - reuse `InfiniteScrollSentinel.tsx` for pin pagination - keep the pin layout uniform, matching the user-confirmed design decision from cycle state
Suspense + Streaming Boundaries: - place `<Suspense fallback={<PinGridSkeleton/>}>` in `app/(authenticated)/pinterest/[boardId]/page.tsx` - reuse the streamed browse pattern already proven on `/pinterest`
Pagination Wiring: - extend `app/(authenticated)/pinterest/actions.ts` with pin pagination - accept `boardId` plus `bookmark` and return `{ items, nextBookmark }` - reuse the sentinel append pattern from boards for pin pagination
Tests: - add integration coverage that `/pinterest/[boardId]` renders a pin grid on healthy mocked responses - add integration coverage that `/pinterest/bogus-id` calls `notFound()` and renders `not-found.tsx` - add integration coverage that the pins server action returns `{ items, nextBookmark }` - extend the e2e golden path: log in, open `/pinterest`, click a board, stream pins, scroll, append next page

NOT YET:

- no 401 token-invalid page-level branch
- no 403 insufficient-scope page-level branch
- no shared token-replacement copy module
- no explicit retryable browse-error UI for rate-limit or network failures
- no final polish empty states

VERIFIED BY:

- Integration: `/pinterest/[boardId]` renders a uniform pin grid on healthy responses
- Integration: invalid board route calls `notFound()` and renders `not-found.tsx`
- Integration: pins server action returns `{ items, nextBookmark }`
- E2E: full golden path runs through boards stream, board click, pins stream, and infinite-scroll append

COMMIT REPRESENTS: `/pinterest/[boardId]` pin browse with not-found handling and infinite scroll.

## Step 4: Token-invalid + 401/403 page-level render branches

BUILDS ON: Step 3

WHAT WORKS AFTER THIS STEP: When `verifyPinterestToken()` returns `invalid_token`, both `/pinterest` and `/pinterest/[boardId]` render `TokenInvalidView` as a page-level branch (not through `error.tsx`). When it returns `insufficient_scope`, both routes render `InsufficientScopeView` with distinct re-scope copy. The shared `lib/pinterest/token-replacement-copy.ts` module sources the terse remediation copy referencing the Pinterest dashboard and Vercel env steps. `error.tsx` remains reserved for unexpected failures plus retry.

LAYERS TOUCHED:
Route Segments: - define `app/(authenticated)/pinterest/error.tsx` as the unexpected-failure-only boundary - keep token-invalid and insufficient-scope out of `error.tsx`, matching the architect's MAJOR enforcement
Server Components: - update both `app/(authenticated)/pinterest/page.tsx` and `app/(authenticated)/pinterest/[boardId]/page.tsx` to call `verifyPinterestToken()` before browse fetches - branch page rendering on the normalized token-health result - render browse content only after a healthy token result - render `TokenInvalidView` on 401-class outcomes - render `InsufficientScopeView` on 403-class outcomes - continue surfacing unexpected failures to `error.tsx`
Client Components: - add `components/pinterest/TokenInvalidView.tsx` - add `components/pinterest/InsufficientScopeView.tsx` - keep both views server-renderable with no client-only behavior requirement - share copy primitives while keeping the 401 and 403 remediation paths distinct
Token-Replacement Copy Module: - add `lib/pinterest/token-replacement-copy.ts` - centralize terse operator-facing remediation copy - reference the Pinterest developer dashboard - include direct Vercel env update steps - keep the copy aligned with the static-token, no-refresh, no-OAuth operating model
Tests: - add integration coverage that both routes render `TokenInvalidView` on 401 at the page level - add integration coverage that both routes render `InsufficientScopeView` on 403 with distinct copy - add integration coverage that unexpected throws render `error.tsx` with retry - add e2e revoked-token or stripped-scope scenarios to validate operator guidance in the real route surface - include a manual readability pass against the wife-test bar from cycle-state decision log

NOT YET:

- no final polish empty-state surfaces
- no retryable browse-error UI for rate-limit, network, and unknown browse failures beyond unexpected-failure handling
- no epic-acceptance real-token smoke yet

VERIFIED BY:

- Integration: both routes render `TokenInvalidView` on 401 as a page-level branch, not via `error.tsx`
- Integration: both routes render `InsufficientScopeView` on 403 with distinct remediation copy
- Integration: unexpected throw path renders `error.tsx` with retry
- E2E: revoked token or insufficient-scope scenario shows the correct dashboard + Vercel env guidance
- Manual: copy is terse and actionable for a non-technical operator

COMMIT REPRESENTS: 401 and 403 page-level token remediation branches with distinct operator copy; `error.tsx` scoped to unexpected failures only.

## Step 5: Polish + cleanup

BUILDS ON: Step 4

WHAT WORKS AFTER THIS STEP: Empty-state UIs are explicit for zero boards and zero pins, retryable browse-error UI exists for `rate_limit`, `network`, and `unknown` failures, `[boardId]/not-found.tsx` can provide board-specific copy if desired, optional `loading.tsx` segment fallback can complement Suspense if needed, and epic acceptance includes one real-token smoke verification path on Vercel preview.

LAYERS TOUCHED:
Route Segments: - add `app/(authenticated)/pinterest/[boardId]/not-found.tsx` if board-specific copy is still desired after Step 3 - add `app/(authenticated)/pinterest/loading.tsx` only if segment-level loading improves on Suspense alone
Client Components: - add explicit zero-board empty-state UI - add explicit zero-pin empty-state UI - add retryable browse-error UI for `rate_limit`, `network`, and `unknown` failures - keep the final browse surfaces within the same warm-shell visual language used in Epic A
Tests: - add e2e coverage that an empty board list renders the empty-state UI - add e2e coverage that a board with zero pins renders the empty-state UI - add e2e coverage that a rate-limit response renders retryable browse guidance - run one real-token smoke test as epic acceptance, not as the full automated suite
Deployment / Infrastructure: - verify the one-token runtime contract on Vercel preview - verify image-host config works in deployed builds - confirm the TDD surface remains part of the existing test and CI gating posture

NOT YET:

- N/A; this is the final slice

VERIFIED BY:

- E2E: mocked empty boards returns `items: []` and renders explicit empty-state UI
- E2E: mocked empty pins returns `items: []` and renders explicit empty-state UI
- E2E: rate-limit path renders retryable browse error
- Smoke: one real-token end-to-end verification passes on Vercel preview

COMMIT REPRESENTS: Empty states, retryable browse errors, real-token smoke.

# 3. Overlay Diagram

Columns are vertical slices. Rows preserve the 10-row order from `horizontal-plan.md`.

```text
| Layer                          | S1                                   | S2                                     | S3                                     | S4                                   | S5                                  |
|--------------------------------|--------------------------------------|----------------------------------------|----------------------------------------|--------------------------------------|-------------------------------------|
| 1. Env / Config                | `.env.example` cleanup;              |                                        |                                        |                                      | deployed runtime verified           |
|                                | `i.pinimg.com` allowlist             |                                        |                                        |                                      | against same token contract         |
| 2. Server-only Pinterest Client| `client.ts`; `types.ts`; `errors.ts`;| `listPinterestBoards()`                | `listPinterestBoardPins()`             | reused token-health branch source    | retryable failure paths consumed    |
|                                | `verifyPinterestToken()`             |                                        |                                        |                                      | by final UX                         |
| 3. Route Segments              |                                      | `/pinterest/page.tsx`                  | `/pinterest/[boardId]/page.tsx`;       | `error.tsx` scoped to unexpected     | optional `[boardId]/not-found.tsx`; |
|                                |                                      |                                        | `not-found.tsx`                        | failures only                        | optional `loading.tsx`              |
| 4. Server Components           |                                      | boards first-page fetch wrapper        | pins first-page fetch wrapper;         | both pages branch on                 | final empty/error handling polish   |
|                                |                                      |                                        | `notFound()` on invalid board          | `verifyPinterestToken()`             |                                     |
| 5. Client Components           |                                      | `BoardGrid`; `BoardCard`;              | `PinGrid`; `PinCard`;                  | `TokenInvalidView`;                  | empty-state UI; retryable browse    |
|                                |                                      | `BoardGridSkeleton`; sentinel          | `PinGridSkeleton`; sentinel reuse      | `InsufficientScopeView`              | error UI                            |
| 6. Suspense + Streaming        |                                      | board route Suspense + skeleton        | pin route Suspense + skeleton          | same boundaries keep token branch    | optional segment `loading.tsx`      |
|    Boundaries                  |                                      |                                        |                                        | outside `error.tsx`                  | if needed                           |
| 7. Pagination Wiring           |                                      | boards server action + infinite scroll | pins server action + infinite scroll   | existing wiring reused               | retry polish for rate-limit/network |
| 8. Token-Replacement Copy      |                                      |                                        |                                        | shared copy module for 401/403       | final copy adjustments if needed    |
|    Module                      |                                      |                                        |                                        | remediation                          |                                     |
| 9. Tests                       | unit token tests; bundle-grep;       | `/pinterest` integration; boards       | detail-route integration; not-found;   | 401/403 page-level integration;      | empty-state e2e; rate-limit e2e;    |
|                                | typecheck                            | action integration; partial e2e        | pins action integration; full e2e      | error boundary integration; e2e      | real-token smoke                    |
| 10. Deployment / Infrastructure| security-plan-audit target defined   |                                        |                                        | operator copy references Vercel env  | Vercel preview smoke + CI gating    |
```

# 4. Deferred Items

- Min-viable-ship cut = S1+S2+S3+S4. That cut delivers the full epic value for US-B-1 and US-B-2. S5 is deferred-eligible polish, not a dependency for core acceptance.
- US-B-3 is not a missing story. Its acceptance criteria are satisfied implicitly by S1 plus S4:
  - S1 establishes the env-backed bearer-token contract, keeps `PINTEREST_ACCESS_TOKEN` as the only token consumer, and proves the server-only boundary.
  - S4 adds the clear replace-the-token guidance required when the env token is expired, revoked, missing, or under-scoped.
- "Pin selection persistence, upload blending, AI generation, visualizer, library, regenerate" remain explicitly out of Epic B. Those belong to later epics and stay out of every slice here to protect browse-only scope.
- The shadcn `cn()` helper stays deferred per resolved decision `dd-q3-cn-helper`. Epic B remains Tailwind-first and does not introduce `lib/utils.ts` just to match `components.json`.
- Real-token testing remains limited to one smoke path at epic acceptance. The broader unit, integration, and e2e surface stays mocked, which matches the horizontal-plan test guidance and avoids making the suite depend on external token stability.
- Final loading-state and error-state polish are not required before the min-ship cut. The PRD already marks final polish as out of Epic B scope and later-slice work.
- Optional route-local enhancements such as `[boardId]/not-found.tsx` and `loading.tsx` stay deferred until S5 because the core board and pin browse paths do not depend on them.
- Retryable browse handling for `rate_limit`, `network`, and `unknown` is intentionally deferred out of the core golden path until the browse routes, token branches, and not-found semantics are already stable.
- Any OAuth callback, refresh-token flow, client secret usage, or profile-stored Pinterest token state remains out of scope by sign-off and is intentionally omitted from the slice plan.

# 5. Risk by Slice

- Step 1: HIGH. This is the first point where the Pinterest token enters source code. The load-bearing failure mode is secret leakage across a client import boundary. The bundle-grep assertion is the key verification that makes this slice safe to build on.
- Step 2: MEDIUM. This is the first real Pinterest API list integration plus the first `IntersectionObserver` pagination path. The likely failure modes are board response-shape drift, bookmark handling bugs, or duplicate/incomplete append behavior in the infinite-scroll path.
- Step 3: MEDIUM. The pin response surface is more variable than boards: image variants, `dominant_color`, and `media.media_type` can differ across pins. Uniform-grid stability with `next/image` is the most likely UI risk, and invalid-board translation to `notFound()` must stay clean.
- Step 4: MEDIUM. This slice carries the architect's MAJOR rules: token-invalid and insufficient-scope must render as first-class page states, not as `error.tsx` fallthrough. The main risk is regressing healthy browse flows while inserting 401 and 403 branches, or shipping copy that fails the operator-readability bar.
- Step 5: LOW. This is polish and acceptance hardening. The risks are limited to empty-state completeness, retry copy quality, and whether the one real-token smoke path surfaces environment drift late.

# 6. Moldability Notes

- S2 and S3 intentionally reuse the same Suspense boundary, server-action transport, and `InfiniteScrollSentinel` pattern. If S2 reveals that the sentinel or bookmark append model is wrong, that correction lands in S2 before S3 inherits it. This is the main debuggability win of the vertical plan.
- S4 can split cleanly into S4a and S4b if the team wants tighter PR-level review:
  - S4a = `TokenInvalidView` and 401 handling
  - S4b = `InsufficientScopeView` and 403 handling
  - both variants still share `lib/pinterest/token-replacement-copy.ts` as the common producer
- S5 is deferred-eligible by design. If Mother's Day schedule pressure lands, the min-ship cut of S1+S2+S3+S4 still satisfies full epic acceptance for US-B-1 plus US-B-2 without invalidating the earlier slices.

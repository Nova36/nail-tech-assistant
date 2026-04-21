## 1. What Are We Doing?

Epic B is the browse-only Pinterest slice. The goal is to let the authenticated user open a Pinterest area inside the app, see their boards, click a board, and see that board's pins using one configured static access token. (Source: `state/planning/prd.md`, `state/planning/sign-off.md`)

The user-story framing is straightforward:

- US-B-1 says the app should use the configured Pinterest account without a user OAuth step, and block the route with token-replacement guidance if the token is missing, revoked, or invalid. (Source: `state/planning/prd.md`)
- US-B-2 says the user should see a board grid, select a board, and then see that board's pin grid. (Source: `state/planning/prd.md`)

What "done" looks like to me:

- `/pinterest` loads inside the authenticated shell and renders boards from Pinterest.
- `/pinterest/[boardId]` loads pins for the selected board.
- Invalid or revoked token states do not pretend the integration is healthy.
- The token stays server-side.
- The Pinterest UI feels like an extension of Epic A's authenticated shell, not a separate mini-app. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

Explicit non-goals:

- No OAuth authorize/callback flow.
- No token refresh flow.
- No client secret usage.
- No pin selection persistence.
- No upload blending.
- No AI generation.
- No visualizer or library work.
- No broader Pinterest write APIs. (Source: `state/planning/sign-off.md`, `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

The tricky part is that "static token" really means "manual env-managed token," not "forever credential." That matters for UX and ops, even though the product surface is browse-only. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

## 2. What I Found

Epic A already did a lot of the heavy lifting:

- `middleware.ts` already protects `/pinterest`-shaped routes through the existing authenticated shell matcher. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)
- `app/(authenticated)/layout.tsx` already gives us the shell wrapper and container.
- `lib/env.ts` already validates `env.PINTEREST_ACCESS_TOKEN` at module load.
- `lib/firebase/server.ts` already demonstrates the `import 'server-only';` pattern Epic B should copy. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

Pinterest scope is intentionally narrow:

- Auth is `Authorization: Bearer {token}` against `https://api.pinterest.com/v5`.
- The three browse-relevant endpoints are `GET /v5/user_account`, `GET /v5/boards`, and `GET /v5/boards/{board_id}/pins`.
- Pagination is cursor-based through `bookmark`.
- `401`, `403`, `404`, `429`, and generic `5xx` are the important error classes for the UX. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

The current research points to server-side fetches as the right default:

- Keep Pinterest calls in server code only.
- Use native `fetch`.
- Default to `cache: 'no-store'` for Slice 2.
- Add `i.pinimg.com` to `next.config.ts` if using `next/image`. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

The researcher flagged four concrete gaps, and I agree they are real:

1. `components/` does not exist yet, so Epic B has to bootstrap its own presentational directory. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)
2. `lib/utils.ts` is missing, so the common shadcn-style `cn()` helper is not available if we want that pattern. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)
3. `PINTEREST_APP_ID` exists in `.env.example` but is not represented in `lib/env.ts`, which means env docs and env schema are out of sync. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)
4. The structured outline omits `app/(authenticated)/pinterest/[boardId]/page.tsx`, which is a critical miss because US-B-2 explicitly requires board-detail routing. (Source: `state/planning/structured-outline.md`, `state/planning/prd.md`)

I also found one architecture fork that needs a decision:

- The outline names API passthrough routes and also implies server-component page fetching.
- The research explicitly calls this redundant and recommends resolving it before implementation. (Source: `state/planning/structured-outline.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

My read is that the simplest thing is best here: fetch Pinterest directly in server components via a small server-only client module, and skip API route indirection unless a later client-side feature actually needs it.

There are a few data-confidence caveats worth keeping visible:

- Exact `GET /v5/boards` field coverage, especially board cover-image naming, is only medium confidence.
- Static-token TTL is not fully confirmed for dashboard-generated tokens.
- Pinterest's full error-code enum beyond `code: 2` was not provided. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

## 3. My Proposed Approach

I think we should implement this as a server-rendered, two-route browse surface with a thin Pinterest integration layer.

Core fetch pattern:

- Create `lib/pinterest/client.ts` and open it with `import 'server-only';`.
- Read `env.PINTEREST_ACCESS_TOKEN` only inside that server-only module.
- Expose small functions like `verifyPinterestToken()`, `listPinterestBoards()`, and `listPinterestBoardPins()`.
- Normalize HTTP failures into typed errors instead of leaking raw `fetch` semantics everywhere. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

Module shape:

- `lib/pinterest/client.ts`
- `lib/pinterest/types.ts`
- `lib/pinterest/errors.ts`

I want those three modules because they separate concerns cleanly:

- `client.ts` handles HTTP and auth header construction.
- `types.ts` captures the response shapes we actually use.
- `errors.ts` gives the pages and boundaries a stable contract for invalid token, not found, rate limit, and generic failure states.

Route shape:

- `app/(authenticated)/pinterest/page.tsx` for the board grid.
- `app/(authenticated)/pinterest/[boardId]/page.tsx` for the pin grid.

That route pair lines up directly with US-B-2 and avoids forcing everything through API routes that the page itself does not need. (Source: `state/planning/prd.md`)

Boundary shape:

- `app/(authenticated)/pinterest/error.tsx`
- `app/(authenticated)/pinterest/not-found.tsx`
- Optional local `app/(authenticated)/pinterest/[boardId]/not-found.tsx` if we want a board-specific message. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

I would build in this order:

1. `lib/pinterest/{types,errors,client}.ts`
2. `next.config.ts` image allowlist edit
3. `app/(authenticated)/pinterest/page.tsx`
4. `app/(authenticated)/pinterest/[boardId]/page.tsx`
5. `components/pinterest/` presentational components
6. Error / not-found / loading boundaries
7. Tests for token handling and browse rendering

For components, I would bootstrap `components/pinterest/` and keep the MVP plain Tailwind-first:

- `components/pinterest/BoardGrid.tsx`
- `components/pinterest/PinGrid.tsx`
- `components/pinterest/TokenReplacementGuidance.tsx`

On `lib/utils.ts`: my opinion is to defer it unless we actually adopt shadcn primitives in this slice. The dashboard already uses plain Tailwind, and the research says no primitives are installed yet. So I would not create `cn()` just because `components.json` points there. If you want shadcn conventions normalized early, we can add `lib/utils.ts` now, but I don't think Slice 2 needs it. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

For the pin layout, I think we should commit to a uniform grid with padding for MVP.

- Reason: it is simpler to implement, easier to make stable with `next/image`, and easier to keep aligned with the existing card-heavy authenticated shell.
- Upgrade path: masonry remains available later if we decide the Pinterest feel matters more than implementation simplicity.
- This is an opinion, not a hard requirement, and I want the user to explicitly confirm or override it.

I would also keep pagination conservative:

- Carry `bookmark` through the client layer.
- Render the first page only in the initial implementation.
- Add a "Load more" control before considering infinite scroll.

On token-invalid UX, I would not rely purely on a serialized custom thrown error making it through `error.tsx` in production. The raw findings explicitly warn that this can get lossy across the boundary. My preference is to make the invalid-token path render a dedicated `TokenReplacementGuidance` state directly from the page-level fetch result when possible, and reserve thrown errors for the true unexpected cases. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

## 4. What Could Go Wrong

**HIGH** Token leak to the client bundle if the import boundary breaks.
My concern is not theoretical here. If Pinterest token logic crosses into a client component or a shared module that later gets imported client-side, we have a real secret-exposure bug.
Mitigation: keep token access inside `lib/pinterest/client.ts`, put `import 'server-only';` on line 1, and keep page data-fetching server-side. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

**HIGH** Token revocation UX is user-hostile if we do not explain the fix clearly.
On a deployed Vercel app, the user cannot repair a revoked token unless they know to update Vercel env vars and redeploy or trigger a new deployment. I think this is load-bearing for US-B-1.
Mitigation: ship `TokenReplacementGuidance` with terse, copy-pasteable steps, and include direct language that the fix happens in Pinterest developer settings plus Vercel environment variables. (Source: `state/planning/prd.md`, `state/planning/sign-off.md`, `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

**MEDIUM** Static-token TTL is still not confirmed.
The researcher explicitly flagged that dashboard-generated tokens may behave like 30-day OAuth-issued tokens. If that is true, the app will silently degrade unless the owner rotates the token.
Mitigation: treat "static" as manual-rotation, surface that in docs and error copy, and ask the user to confirm actual Pinterest dashboard behavior. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

**MEDIUM** Image CDN allowlist is easy to forget and breaks the whole UI.
If we use `next/image` and forget `i.pinimg.com` in `next.config.ts`, board and pin images fail on Vercel.
Mitigation: include the `remotePatterns` change in the core implementation, not as cleanup. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

**MEDIUM** Rate limits are probably fine, but the 429 UX still matters.
This is a single-user app, so I do not expect steady-state pressure. But a 429 that collapses into a generic crash will feel broken.
Mitigation: normalize 429 into a retryable browse error and keep the UX explicit. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

**LOW** Pagination UX can get overdesigned.
The bookmark model is cursor-only. Infinite scroll is possible, but I think it is unnecessary for MVP.
Mitigation: start with a load-more button and keep the server client bookmark-aware. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

**LOW** Empty states can feel unfinished if we do not write them deliberately.
Zero boards and zero pins are legitimate outcomes, not edge-case bugs.
Mitigation: explicit empty-state copy on `/pinterest` and `/pinterest/[boardId]`. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

## 5. Dependencies and Constraints

Epic A already constrains the implementation in useful ways:

- `middleware.ts` already protects `/pinterest*`.
- The authenticated shell already exists.
- `env.PINTEREST_ACCESS_TOKEN` is already validated at module load. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

There is also a user-owned prerequisite:

- A Pinterest developer app must already exist.
- A static token must be generated.
- That token must be pasted into Vercel env config.
- The sign-off says that prerequisite path is already the chosen operating model. (Source: `state/planning/sign-off.md`)

One existing Epic A file will need a small follow-up edit:

- `next.config.ts` needs `remotePatterns` for `i.pinimg.com`. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

Dependency-wise, this slice stays light:

- No new npm dependencies are required.
- Native `fetch` is enough in Next 15.
- No Pinterest SDK is needed. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

Constraint worth repeating:

- Sign-off #17 explicitly rules out OAuth callback, refresh, and client secret usage, so any design that starts drifting toward those is out of scope by definition. (Source: `state/planning/sign-off.md`)

## 6. Open Questions

1. Masonry vs uniform grid for pin display. My opinion: uniform grid for MVP because it is simpler, more stable, and enough to satisfy US-B-2. Override if the Pinterest-native feel matters more than implementation speed.

2. Pagination UX. My opinion: load-more button for MVP. Alternative is infinite scroll via `IntersectionObserver`, but I do not think Slice 2 needs it.

3. Add `lib/utils.ts` with a `cn()` helper now, or defer until a story actually needs shadcn primitives. My opinion: defer. The current app style is already plain Tailwind-first. (Source: `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

4. `PINTEREST_APP_ID` cleanup path. Should we add it to `lib/env.ts` schema for parity, or remove it from `.env.example` because the app does not use it? My opinion: remove it from `.env.example` and keep the runtime contract authoritative in `lib/env.ts`. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

5. Token-replacement guidance copy. What exact words do we show when the token is rejected? My opinion: keep it terse, include the Pinterest developer dashboard reference plus direct "update Vercel env" steps, and make sure it passes a wife-test for readability.

6. Should `/pinterest` render immediately with a loading state or wait for boards before painting? My opinion: stream with `<Suspense>` boundaries where it helps, because that is idiomatic in Next 15 and should make the surface feel less blocked. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

## 7. Scale Assessment

The researcher called this small-to-medium. My reading is: medium, but only barely.

Small signals:

- Roughly one narrow API surface.
- No OAuth.
- No token refresh.
- No persistence.
- Epic A already shipped the protected shell and env foundation.
- The browse contract is just boards plus board-detail pins. (Source: `state/epics/epic-b-pinterest-integration/docs/research-brief.md`)

Medium signals:

- We still need two user-facing routes, not one.
- Error and not-found boundaries matter.
- Token-revocation UX is load-bearing for US-B-1 acceptance, not polish.
- First-contact debugging against real Pinterest response shapes is likely, especially for board-cover fields where the research confidence is not complete. (Source: `state/planning/prd.md`, `state/epics/epic-b-pinterest-integration/docs/research-raw-findings.md`)

So my recommendation is **medium**.

I would still consider it eligible for a `--fast` path if the team wants to skip extra H/V planning overhead. I would not recommend calling it large. Large would only make sense if this were expanding into OAuth, token refresh, server persistence, or multi-user account linkage, and none of that is in scope. (Source: `state/planning/sign-off.md`)

## 8. Recommended Routing

If we call this **small**, I would go straight to story decomposition.

If we call this **medium** which is my recommendation, I would skip H/V by default under the small-medium pilot posture and go directly to stories after the user signs off. If the user wants extra safety, they can opt into `--gate-hv`.

If we called this **large**, I would want another planning gate, but I do not think the evidence supports that for this scope. That would be the right call for OAuth plus refresh plus persistence. It is not the right call for this browse-only static-token slice.

READY FOR USER REVIEW — please respond to the 6 numbered open questions in Section 6 and confirm or override the scale call in Section 7.

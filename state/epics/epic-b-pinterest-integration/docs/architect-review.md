# Epic B Architect Review

**Verdict:** approve-with-escalation

## Summary (3-5 lines)
The proposed shape is feasible and matches the real codebase surface: protected App Router routes under the authenticated shell, a server-only Pinterest client, and a small `next.config.ts` image-host edit.
The design correctly rejects API passthrough duplication and keeps the token boundary server-side.
The only load-bearing gap is error semantics: token-invalid states should be rendered as a first-class page state, not delegated primarily to `error.tsx`, because that boundary is for unexpected failures.
I do not see a blocker, but I would keep a light security-plan audit on the story because the secret boundary is the one place this epic can fail expensively.

## Feasibility stress-test

### Server-side fetch + token boundary
Yes. The design's boundary holds up. [lib/firebase/server.ts](/Users/don/Documents/GitHub/Nail%20Tech%20Assitant/lib/firebase/server.ts:1) starts with `import 'server-only';` and keeps credential reads inside the server module, so copying that pattern for `lib/pinterest/client.ts` is the right architecture. No token leak path is implied as long as Pinterest fetch helpers stay server-only and pages pass only data, never the token, into components.

### Route protection
Confirmed. [middleware.ts](/Users/don/Documents/GitHub/Nail%20Tech%20Assitant/middleware.ts:39) uses matcher `/((?!login$|login/|api/health$|_next/|favicon\\.ico$|robots\\.txt$).*)`, which matches `/pinterest` and `/pinterest/<boardId>` because neither path is excluded.

### Next.js remotePatterns
Confirmed. [next.config.ts](/Users/don/Documents/GitHub/Nail%20Tech%20Assitant/next.config.ts:3) already has `images.remotePatterns`, but it is an empty array at line 5, so adding Pinterest host coverage is still a real code change.

### Error + not-found boundaries
Mostly yes. `app/(authenticated)/pinterest/error.tsx` and `not-found.tsx` at the route-group layer are idiomatic Next 15 for this slice. The gotcha is semantic, not structural: `notFound()` is right for unknown board IDs, but invalid-token handling should be a deliberate rendered state from the page/data layer, with `error.tsx` reserved for unexpected failures and retry flows.

### Streaming vs blocking render (open question #6)
Streaming is fine here, but only if the token-health check happens inside the same awaited server path that decides whether to render browse UI or guidance UI. Do not throw a token-invalid error from a streamed child and expect `error.tsx` to carry product-grade guidance; Suspense and `error.tsx` work well for latency and unexpected faults, not for primary auth-state branching.

## Findings

### CRITICAL (blocks proceeding)
None.

### MAJOR (must address in-story)
- Token-invalid and insufficient-scope states need an explicit page-level branch, not a design that leans on `error.tsx` as the main UX path. The design gestures at this, but the implementation story should lock it down to avoid regressing US-B-1.
- Add a concrete rule for 403 handling alongside 401. The research brief treats both as token-replacement/fix-token states, and the design currently emphasizes revocation more than scope failure.

### MINOR (followup)
- Prefer `loading.tsx` for the segment before adding bespoke Suspense structure unless the page composition actually benefits from independent streaming chunks.
- Resolve the `PINTEREST_APP_ID` env-doc drift in the same epic so operational docs stay truthful.

## Agreements with the design
I endorse the server-component fetch path over API passthrough routes.
I endorse `lib/pinterest/{client,types,errors}.ts` as the right integration seam.
I endorse `/pinterest` plus `/pinterest/[boardId]` as the correct route shape, and `notFound()` for bad board IDs.
I endorse the `i.pinimg.com` allowlist edit as required infrastructure, not cleanup.
I endorse a simple first release: uniform grid plus cursor-aware "Load more" is the right complexity level.

## Escalation Flags
- [major] security:plan-audit — secret handling is the only genuinely high-impact failure mode; confirm the token cannot cross any client import boundary before implementation starts.

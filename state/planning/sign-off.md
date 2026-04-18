# Sign-Off Record

**Date:** 2026-04-17
**Signed by:** Project owner (user)

## Structured Outline — 14 Decision Points

**Status: ALL 14 ACCEPTED AS DRAFTED.**

Reference: `state/planning/structured-outline.md` Part 8.

| # | Category | Decision | Status |
|---|----------|----------|--------|
| 1 | APPROACH | Single-user allowlist via `ALLOWED_EMAIL` + server-side checks + RLS | ✅ Affirmed |
| 2 | SCOPE | P1 chat in baseline plan (Slice 7), cuttable if schedule slips | ✅ Affirmed |
| 3 | RISK | Gemini viability gate at Slice 1 — pivot if fails | ✅ Affirmed |
| 4 | TRADE-OFF | Landscape-first tablet; portrait usable but not tuned | ✅ Affirmed |
| 5 | TRADE-OFF | Per-nail variation deferred to v2 | ✅ Affirmed |
| 6 | WORKFLOW | Claude-spec / Codex-implement / Claude-review + TPM Opus validation | ✅ Affirmed |
| 7 | DATA MODEL | Saved designs as durable records with generation lineage | ✅ Affirmed |
| 8 | ERROR UX | 1 auto-retry → adjust-inputs error surface | ✅ Affirmed |
| 9 | PINTEREST FLOW | Pinterest primary, uploads secondary | ✅ Affirmed |
| 10 | POLISH PROTECTION | Slice 8 protected even if Slice 7 is cut | ✅ Affirmed |
| 11 | DOCS + PREREQS | User-owned prereqs treated as real blockers | ✅ Affirmed |
| 12 | VISUAL BAR | Stylized-but-recognizable (not photorealistic) | ✅ Affirmed |
| 13 | LIBRARY SEMANTICS | Regenerate uses stored inputs, not UI state | ✅ Affirmed |
| 14 | CUT LINE | P0 "done" = Slice 6 + Slice 8 | ✅ Affirmed |

All 14 decisions are now **constraints**, not open items. Downstream artifacts (PRD, stories, implementation) must treat them as locked unless explicitly revisited via a follow-up sign-off cycle.

---

## Additional Decisions — 2026-04-17 (same-day amendments)

These supersede the Supabase / OAuth-flow portions of the original planning artifacts. Planning docs (horizontal-plan, vertical-plan, structured-outline, PRD) will be re-rendered to reflect these before story decomposition.

### #15 — Persistence + Auth + Storage = Firebase (not Supabase)

- Firestore replaces Postgres for `profiles`, `references`, `designs`, `generations`, `design_secondary_references`, and (P1) `chat_turns`. They become Firestore collections/subcollections.
- Firebase Auth replaces Supabase Auth (email link sign-in, email-allowlist enforced via Security Rules + server check).
- Cloud Storage replaces Supabase Storage for reference images and generated outputs.
- Firebase Security Rules replace Postgres RLS.
- **Why:** User has an existing Firebase account and workflow; the Firebase MCP server in the plugin stack provides inline project management; unified billing dashboard.

### #16 — Gemini access = Firebase AI Logic (not direct Gemini API)

- The app calls Gemini 2.5 Flash Image via Firebase AI Logic (`@firebase/ai` SDK) rather than a direct Google Generative AI REST/SDK call.
- No separate `GEMINI_API_KEY` env var — auth flows through Firebase project config and App Check.
- Fallback provider boundary is preserved (if Gemini fails Slice 1 spike, a direct Google AI Studio API key or Replicate/OpenAI path can be swapped in behind the same generation service).
- **Why:** eliminates one credential to manage; unified usage dashboard; natural fit given the Firebase + Gemini relationship; single quota/billing surface.

### #17 — Pinterest integration = static access token (not OAuth flow)

- The app uses a single Pinterest access token stored in `PINTEREST_ACCESS_TOKEN` (env var, not committed) to call Pinterest API v5 directly as the authorizing user.
- No OAuth authorize/callback flow. No `client_secret` required. No token refresh/exchange code. No ngrok-for-callback constraint.
- Current token belongs to the project owner's Pinterest account (app ID 1562835) — sufficient for development and the demo; the wife can be added as a trial user later if we want her own boards in the product.
- **Why:** Pinterest's `client_secret` is gated behind trial access approval (days-to-weeks); the static-token route unblocks development *now* and produces a simpler, smaller Slice 2.
- **Follow-up:** if the wife's own Pinterest boards (not the project owner's) are needed for the gift moment, add her as a trial user on the app and generate a token for her account — same env var, no code change.

### Impact on Prior Plan

- `state/project-profile.yaml` — tech stack updated to Firebase; Pinterest auth strategy is static-token.
- `state/planning/horizontal-plan.md` — Persistence layer shifts from SQL tables + RLS to Firestore collections + Security Rules; the Pinterest OAuth sub-section collapses to "static token".
- `state/planning/vertical-plan.md` — Slice 2 (Pinterest) loses OAuth-related sub-items; Slice 0 (Foundation) adds Firebase SDK initialization instead of Supabase client wiring.
- `state/planning/structured-outline.md` — File manifest loses `/api/auth/pinterest/*` routes and token-encryption code; Firebase config files replace `supabase/migrations/` directory.
- `state/planning/prd.md` — Epic A Functional Requirements and Epic B user stories are re-scoped accordingly.

These updates will be dispatched to Codex as a consolidated re-render pass (technical-writer role) before `/plugin-hive:plan` runs against Epic A.

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

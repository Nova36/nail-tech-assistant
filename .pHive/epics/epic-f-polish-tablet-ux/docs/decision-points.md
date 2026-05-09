# Epic F: Scope Decision Points

**Deadline:** 2026-05-10 (tomorrow). Today: 2026-05-09.
**Goal:** Confident Mother's Day demo state. Tablet-first. No embarrassing rough edges.

---

## Decision 1 — Which of the 11 polish targets are in?

The manifest lists 11 targets. Recon found 8 missing or rough. Below is the cut recommendation for your sign-off.

| #   | Target                                | Recon state                                      | Recommendation                               | Reason                                                                                                                                                               |
| --- | ------------------------------------- | ------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `app/(authenticated)/page.tsx`        | Rough (KPI grid not responsive, stats hardcoded) | **IN — fix responsive + wire stats**         | Visible on demo open; hardcoded numbers are embarrassing                                                                                                             |
| 2   | `components/ui/`                      | Missing                                          | **CUT**                                      | Not referenced at runtime; no shadcn usage anywhere; adding it is new infra, not polish                                                                              |
| 3   | `components/LoadingStates/`           | Missing                                          | **IN — generation + library only**           | Generation latency is 10–30s; blank screen during wait kills demo confidence. Pinterest already has BoardGridSkeleton + PinGridSkeleton                              |
| 4   | `components/ErrorSurface.tsx`         | Missing                                          | **IN — thin wrapper**                        | Centralized catch needed for demo-day Pinterest 401 / Gemini 504. Scope: re-export from existing GenerationErrorState + add a generic fallback. Not a full redesign. |
| 5   | `app/globals.css` (tablet ergonomics) | Rough (tokens exist, layout rules absent)        | **IN — sidebar collapse + KPI wrap only**    | Sidebar eating 260px on 1180px viewport is the top visual risk. Scope is narrow: one responsive rule on `<aside>`, one on the KPI grid.                              |
| 6   | `tests/e2e/core-flow.spec.ts`         | Missing                                          | **IN — critical-path only** (see Decision 2) | P0 e2e gap is real; but full login→save flow requires emulator setup time                                                                                            |
| 7   | `tests/e2e/tablet-smoke.spec.ts`      | Missing                                          | **IN — if Decision 2 is critical-path**      | Adds iPad-landscape Playwright project; ~20 lines on top of core-flow                                                                                                |
| 8   | `README.md`                           | Rough (6 lines)                                  | **IN — setup + env vars only**               | Future-you needs this to repro the demo environment; 30 min max                                                                                                      |
| 9   | `docs/architecture.md`                | Missing                                          | **CUT**                                      | Nice for maintenance; zero demo value; write post-Mother's Day                                                                                                       |
| 10  | `docs/integrations/pinterest.md`      | Missing                                          | **CUT**                                      | Same; integration already works; docs don't affect demo confidence                                                                                                   |
| 11  | `docs/integrations/gemini.md`         | Missing                                          | **CUT**                                      | Same                                                                                                                                                                 |

**Bottom line:** 6 in, 5 cut. The 3 cut docs are pure maintenance artifacts. `components/ui/` is a future-state abstraction, not a polish fix.

---

## Decision 2 — e2e suite scope

Two options:

**Option A — Critical-path only (recommended)**

- `core-flow.spec.ts`: login → board browse → pin select → generate (pending state) → visualizer shape switch → library save → reopen
- `tablet-smoke.spec.ts`: same flow at `iPad Pro landscape` Playwright device, smoke-only (no assertions on pixel layout, just that routes load and key elements are visible)
- Estimated effort: ~3–4 hours including Playwright config update to add iPad project
- Tradeoff: does not cover regenerate or chat refinement in the unified flow (those have dedicated specs already)

**Option B — Full P0 (per manifest)**

- Adds: regenerate, chat refinement turn, reference reselection
- Estimated effort: ~6–8 hours
- Tradeoff: runs against real Firebase auth; needs emulator wiring; high risk of flakiness on day-1 run

**Recommendation:** Option A. The regenerate + chat flows already have coverage in `chat-refinement.spec.ts` and `visualizer-shapes.spec.ts`. A thin unified critical-path spec plus tablet smoke is more confidence value per hour at this deadline.

---

## Decision 3 — Docs scope

**Option A — README only (recommended)**

- `README.md`: setup, prerequisites, env vars (FIREBASE_SERVICE_ACCOUNT_JSON, PINTEREST_ACCESS_TOKEN, ALLOWED_EMAIL, APP_URL), Firebase authorized-domain step, pnpm dev vs pnpm dev:e2e distinction
- Estimated effort: ~45 min
- Sufficient for: you reproing the demo on a clean machine, or handing off to a future collaborator

**Option B — README + full docs/**

- Adds `docs/architecture.md`, `docs/integrations/pinterest.md`, `docs/integrations/gemini.md`
- Estimated effort: ~3–4 hours
- Tradeoff: pure documentation; zero impact on demo day

**Recommendation:** Option A. The integration docs can be written from git history post-ship.

---

## Decision 4 — Tablet vs phone parity

Recon finding: at 390px (iPhone), the sidebar + main layout breaks completely — ~2px usable content width. The structured outline Slice 8 language is "tablet-first" and explicitly says phone is "usable, not optimized."

Two options:

**Option A — Tablet only, phone documented-as-broken (recommended)**

- Add sidebar responsive collapse at `md` breakpoint (≤768px hidden, hamburger or bottom-nav)
- This fixes iPad portrait and makes phone minimally usable
- Estimated effort: ~2 hours (sidebar + main padding adjustment)
- Phone still won't be great, but routes will load without zero-width content

**Option B — Full phone parity**

- Requires bottom nav bar, mobile-specific route layouts, touch gesture polish
- Estimated effort: ~8–12 hours
- Out of scope for a Mother's Day demo on a tablet

**Recommendation:** Option A. The demo device is a tablet. Phone parity is a post-gift enhancement.

---

## Summary — what needs your yes/no

| Decision                                                                        | Recommendation | Your call |
| ------------------------------------------------------------------------------- | -------------- | --------- |
| Cut `components/ui/`, all 3 docs files                                          | CUT            |           |
| Keep 6 targets: page.tsx, LoadingStates, ErrorSurface, globals.css, README, e2e | IN             |           |
| e2e scope: critical-path only (not full P0)                                     | Option A       |           |
| Docs scope: README only (not full docs/)                                        | Option A       |           |
| Tablet fix: sidebar collapse at md (not full phone parity)                      | Option A       |           |

Once you confirm (or redirect), execution starts immediately.

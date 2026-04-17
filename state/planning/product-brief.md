# Product Brief: Nail Tech Assistant

**Version:** v1 (Mother's Day 2026 gift)
**Delivery target:** 2026-05-10
**Generated:** 2026-04-17
**Status:** Draft — pending user approval

---

## Problem

A working nail technician currently sources design inspiration from Pinterest and Instagram but has no tool that bridges inspiration → concrete, visualizable design on a hand. The result: 10–15 minutes of every client appointment spent on back-and-forth consultation, and pre-appointment prep that relies entirely on saved pins without a way to "see" how a design would actually look on nails.

## Target User

**Primary (and only, for v1):** The user's wife — a practicing nail technician who values both technical craft (shape, cuticle, structure) and artistic expression (drawing, stamps, stickers, mixed media).

**Indirect beneficiaries:** Her clients — they'll view generated designs on her tablet during consultations. Not active users.

## Value Proposition

"Go from a Pinterest pin to a rendered design on a nail in under a minute — with optional refinement."

The app collapses two manual steps (mental translation from inspiration photo → what it would look like on a hand) into one visual AI-assisted flow, and does it in a polished UI that's equally good for personal prep and client-facing moments.

## Core Features

### P0 — Must ship for Mother's Day demo

1. **Single-user authentication.** Her email is the only allowed login. No sign-up flow. No multi-tenancy.
2. **Pinterest OAuth + browse.** She logs in with her Pinterest account, lists her boards, browses pins.
3. **Reference capture.** She can select 1+ Pinterest pins and/or upload phone photos as inspiration references.
4. **Optional text prompt.** Free-text field alongside references ("make it more muted," "add gold foil accents"). Optional — generation works with references alone.
5. **AI-generated design.** Selected references (+ optional prompt) produce a generated nail design image via Gemini 2.5 Flash Image.
6. **2D nail visualizer.** A five-nail hand layout shows the generated design applied uniformly across all five nails.
7. **Nail shape selection.** Almond, coffin, square, stiletto — swap live on the visualizer.
8. **Design library.** Generated designs save automatically, browsable later, can be re-opened and re-generated.
9. **Tablet-optimized UI.** Polished, large-touch-target interface that also works on phone.

### P1 — Nice to have in v1, fast-follow in v1.1

10. **Chat-based refinement.** Multi-turn conversation to iteratively adjust a design ("smaller flowers," "swap to a matte finish," "darker base"). If timeline permits, ship in v1; otherwise v1.1.

### P2 — Explicitly deferred to v2+

- 3D / rotatable nail model (Three.js)
- Per-nail variation (accent nails, different design per finger)
- Palette extraction + polish brand matching (DND / OPI codes)
- Deconstruct-the-pin markup / layer planning
- Client history cards + appointment association
- Virtual try-on (AR overlay on real hand)
- Formula logger (custom polish mix recipes)
- Inventory sync / low-stock tracking
- Cure-time reference database
- Watermark automator / portfolio tools
- Multi-user, billing, scheduling

## Success Metrics

**Primary:** Subjective — wife uses it and says "wow." Concrete signals:
- She generates ≥3 designs in the first week
- She uses it during ≥1 real client appointment within 2 weeks
- She requests new features (engagement signal)

**Minimum success bar:** On May 10, 2026, she can execute the full flow end-to-end without bugs: Pinterest login → pick a pin → generate → see it on a hand → save.

## Scope Boundaries

### In v1

- One user (the wife) — her email hardcoded as the allowed login
- Web app — tablet-first, phone-compatible
- Pinterest + photo upload as the only reference sources
- Gemini 2.5 Flash Image as the only generation backend
- 2D visualization only
- Same design across all five nails
- Designs saved indefinitely; no quota or pruning

### Out of v1 (but architecture preserves optionality)

- Multi-user support — data model should use a `user_id` column even if only one user exists, so multi-tenancy can be added without migration pain
- Billing — not built, but user/account concepts shouldn't preclude it
- Per-nail variation — visualizer should render per-nail so we can vary textures per nail in v2
- 3D rendering — 2D component boundary should be swappable for a 3D one

### Hard exclusions

**None declared.** The user explicitly rejected permanent "nevers." Every v2+ feature remains architecturally possible.

## Constraints

- **Timeline:** 3.5 weeks (2026-04-17 → 2026-05-10). Hard deadline — it's a gift.
- **Solo developer.** One person building; no parallel team work.
- **Emotional stakes.** This is a gift — polish and UX matter more than feature count.
- **Pinterest developer app:** Must be registered in Pinterest's developer portal before OAuth can work. Self-serve, free, ~5 min. **Counted as v1 prerequisite, not a feature.**
- **Gemini API key:** Must be provisioned via Google AI Studio. Self-serve, free tier available.
- **Vercel + Supabase accounts:** Must exist. Both have free tiers suitable for v1.

## Prerequisites (before any code is written)

1. Pinterest developer app registered → `client_id` + `client_secret`
2. Gemini API key provisioned
3. Vercel account connected to a new GitHub repo
4. Supabase project created → connection URL + anon key + service role key
5. Domain name decided (or use the Vercel default `*.vercel.app` subdomain for v1)

## Open Questions for PRD / Architecture Phase

1. Should the Pinterest OAuth callback be hosted on Vercel (production) or do we need a dev-tunnel solution for local development? (Pinterest requires a fixed redirect URL.)
2. Do we allow the user to "edit" or "remix" a previously-generated design, or is each generation a fresh run?
3. What happens if Gemini refuses to generate (content policy, rate limit) — retry, error state, fallback prompt?
4. How do we represent a "design" in Supabase — input references + prompt + generated image URL + metadata?
5. Is Supabase's image storage CDN fast enough for the visualizer, or do we need a CDN layer (Vercel Edge / Cloudflare Images)?
6. For the tablet experience, do we go portrait-first or landscape-first? (Hand layout is usually wider than tall.)

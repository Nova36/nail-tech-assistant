# Product Discovery Brief

**Project:** Nail Tech Assistant
**Type:** Greenfield
**Discovery date:** 2026-04-17
**Target delivery:** Mother's Day 2026 (May 10) — ~3.5 weeks
**Framing:** Mother's Day gift for the user's wife (a working nail technician)

---

## Problem Statement

A skilled nail technician uses Pinterest and Instagram for inspiration, but there's a gap between "scrolling beautiful nail photos" and "executing a specific design on a client's hand." Inspiration is easy to collect; translating it into a concrete design and visualizing it on a real hand is manual, imprecise, and time-consuming — especially the 10–15 minutes of every appointment spent helping a client decide on a design.

## Target Users

- **Primary persona:** The user's wife — a working nail technician who cares about both the clean/technical craft (nail shape, cuticle work) and the artistic side (drawing, stamps, stickers, mixed media). Currently relies on Pinterest boards and Instagram for design sourcing.
- **Secondary personas:** None in v1. Her clients are indirect beneficiaries — they'll view designs on the tablet during consultation, but won't be active users.
- **User evidence:** Direct — the user lives with the primary user and observes her workflow firsthand. Mother's Day gift framing means an immediate, intimate feedback loop.

## Competitive Landscape

- **Existing alternatives:** Pinterest (inspiration), Instagram (inspiration + social proof), salon consultation conversations (client-facing, verbal). No single tool bridges "scroll inspiration" → "concrete visualization of this design on a hand."
- **Key gaps in alternatives:** Pinterest/Instagram excel at collecting inspiration but stop there — they don't help apply inspiration to a specific design, don't render on a nail, and don't support client-facing "here's what your nails will look like" moments.
- **Build rationale:** Building new because the differentiator is the bridge itself (AI-generated design from inspiration → visualization). No existing tool combines these moves in one flow. Because the v1 is a gift for one specific person, a custom-crafted tool communicates care in a way a generic app cannot.

## Value Proposition

- **Core differentiator:** The inspiration-to-visualization bridge — Pinterest pins (plus optional uploaded photos and text) → AI-synthesized design → rendered on a five-nail hand preview.
- **Unfair advantage:** Built specifically for one person's workflow, iterated directly with her — no product-market-fit guessing, no generalization compromises.
- **Switching motivation:** N/A (single user, not a competitive product).

## Success Metrics

- **Primary metric:** Subjective — does the wife use it and say "wow, I love this." If she adopts it into her actual pre-appointment prep or client consultation, it's a success.
- **Secondary metrics:** Frequency of return use after the gift moment; whether she uses it during real appointments (vs. only personal play); whether she asks for new features (signals engagement).
- **Minimum success bar:** A polished, working demo on Mother's Day (May 10, 2026) that executes the core flow without bugs — she can authenticate Pinterest, pull a pin, generate a design, and see it visualized on a hand.

## MVP Scope

### In v1 (Mother's Day demo — May 10, 2026)

- Pinterest OAuth login (her account)
- Browse her Pinterest boards and pins
- Upload phone photos as additional inspiration alongside Pinterest pins
- Select one or more reference images + optional text prompt → AI generates a nail design image
- 2D nail visualizer: five-nail hand layout with the design applied uniformly across all nails
- Choose nail shape (almond, coffin, square, stiletto)
- Save designs to her personal library; revisit and iterate
- Tablet-optimized web interface, phone-usable

### v1.1 fast-follow (bundled into v1 if timeline allows)

- Chat interface for multi-turn design refinement ("make it more pastel," "swap the accent color")

### Deferred to v2+

- 3D / rotatable nail model (Three.js)
- Per-nail variation (accent nails, different design per finger)
- Palette extraction + polish brand matching (e.g., DND, OPI codes)
- Deconstruct-the-pin markup / layer planning
- Client history cards + appointment association
- Virtual try-on (AR camera overlay on real hand)
- Formula logger for custom polish mixes
- Inventory sync / low-stock tracking
- Cure-time reference database
- Watermark automator / portfolio photo tools
- Multi-user, billing, scheduling (possible future if the product grows)

### Hard exclusions

**None.** The user explicitly noted that everything should remain possible in the future. Architecture decisions must not preclude later expansion into multi-user, billing, inventory, scheduling, or any other v2+ feature — but v1 remains ruthlessly scoped to the core demo flow.

## Technical Constraints

- **Platform:** Web (tablet-optimized, phone-usable). No native apps in v1.
- **Performance:** No hard requirements. AI image generation will dominate latency — acceptable if kept under ~15s per generation with a polished loading state.
- **Compliance:** None identified (single user, no sensitive data beyond her own Pinterest content).
- **Infrastructure:** Vercel-hosted Next.js. Supabase for auth + Postgres + storage. Pinterest API v5 for OAuth and board/pin fetch. AI image generation via Gemini 2.5 Flash Image (Nano Banana) as the leading candidate, with FLUX.1-kontext via Replicate or OpenAI gpt-image-1 as fallbacks — final choice validated during architecture phase.
- **Integrations:** Pinterest API v5 (required), AI image generation provider (required), image storage (Supabase).

## Key Decisions Made

- **Single-user gift, not a product.** Scope radically simplified: no multi-tenancy, no billing, no App Store review.
- **Web app over native.** Tablet-first for client-facing moments, phone-compatible for personal use; faster iteration than native, no app-store gatekeeping.
- **Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Vercel + Supabase.** Chosen for speed to a polished UI within 3.5 weeks.
- **Pinterest OAuth is central.** Her inspiration lives on Pinterest; authentic integration is table-stakes, not "nice to have."
- **2D visualization first, 3D as a later vertical slice.** Don't overcommit to 3D for the initial demo; 2D done well beats 3D done poorly.
- **AI generation starts with single-reference (strategy A) and evolves toward multi-reference + chat (strategy C).** Iterative approach validated by user.
- **Per-nail variation is v2.** V1: uniform design across all five nails.
- **Chat-based multi-turn refinement is v1.1 fast-follow, bundled into v1 if timeline allows.**
- **No features declared as permanent exclusions.** Architecture must preserve the option to grow.

## Open Questions

1. Which AI image-generation provider best handles "apply this inspiration photo to a nail" reference-guided edits? Gemini 2.5 Flash Image is the leading candidate — needs head-to-head validation against FLUX.1-kontext and gpt-image-1 during architecture phase.
2. Should the text prompt be required or optional alongside Pinterest references? (Default assumption: optional.)
3. How does the user interact with multiple references — averaged into one design, or used as successive style constraints? UX question to resolve in design phase.
4. Storage policy — keep AI-generated images forever, or prune after N days? (Default: keep indefinitely for v1.)
5. Does the user want an explicit "show client" view mode on tablet (larger fonts, fewer controls), or is the main interface good enough for client-facing use?
6. Is there an existing Pinterest developer account / app registration, or does the user need to create one? (Pinterest API v5 requires app registration with redirect URLs before OAuth can work.)

## Session Notes

The user came in with a well-developed feature outline across four categories (Pinterest bridge, design collaboration, technical/inventory tools, business/content creation). The discovery conversation moved quickly because the ideation work was already done — most of the time was spent scoping down, not brainstorming up.

Three notable pivots during the conversation:

1. **3D reframed.** The user initially assumed 3D might be out of reach and conceded "2D is fine." The facilitator clarified that 3D is achievable with Three.js but not within the v1 timeline — so the plan treats 3D as a deliberate v2 vertical slice, not a deferred wish.
2. **"Never" softened.** The user rejected hard-permanent exclusions. Multi-user, billing, inventory, and scheduling are all v2+ candidates if the gift grows into a product. Architecture should not optimize for these, but must not preclude them.
3. **AI flow clarified.** The user was uncertain whether AI generation should take single vs. multiple references, or be chat-guided. The facilitator proposed an iterative path (A → C) which the user accepted, with chat-driven refinement elevated to "v1 if possible, v1.1 otherwise."

The Mother's Day deadline (May 10, 2026) is the dominant constraint and shaped every scope decision. The emotional stakes of the gift framing are high — the v1 must feel polished and personal, not like an obvious MVP.

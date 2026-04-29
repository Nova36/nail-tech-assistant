# Design Discussion: Nail Tech Assistant

## 1. What Are We Doing?

We are building a single-user web app for one working nail technician.
The point is not "make a startup MVP." The point is "give her a polished Mother's Day gift she can actually use."
The discovery brief says the gap is the manual translation step between saved inspiration and a concrete nail design during prep or consultation.

I think the real product is that bridge, not image generation by itself.
The product brief sets the bar clearly: Pinterest login, pick references, generate, see the result on a five-nail hand, save it, and do that without bugs on May 10, 2026.

Done means the nine P0 features work as one end-to-end flow.
Single-user auth gates access, Pinterest is the main source, phone photos are secondary, references plus optional text produce a design, the result lands in a 2D visualizer with shape switching, and the design saves into a personal library.

The hard part is not making each piece exist.
The hard part is making the whole thing feel polished on a tablet in 3.5 weeks.
Today is 2026-04-17 and the deadline is Mother's Day, 2026-05-10, so there is almost no room for speculative architecture.

## 2. What's Baked In From Discovery + Product Brief

The first baked-in decision is scope: this is single-user for v1, explicitly for the user's wife.
That strips out public sign-up, multi-tenant permissions, billing, and most account complexity.
But the same briefs also say "do not preclude later growth."
So I should treat single-user as a runtime constraint, not a schema excuse.
That means `user_id` still belongs on durable records even if only one user exists.
The product brief calls that out directly for future multi-user support.

The second baked-in decision is the core flow.
Pinterest OAuth is not optional decoration because the discovery brief says her inspiration already lives there.
If Pinterest browsing is weak, the product misses the emotional center of the gift.
The load-bearing P0 path is authenticate, browse boards and pins, select references, optionally add uploads and text, generate, preview on a hand, and save.

The third baked-in decision is the stack.
The profile and discovery brief lock us into Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, Vercel, Supabase, Pinterest API v5, and Gemini 2.5 Flash Image.
That is good because it narrows the playbook: App Router server boundaries, server actions where useful, Supabase for auth/data/storage, and shadcn/ui for speed to polish.

The fourth baked-in decision is that the visualizer is 2D, not 3D.
That is the main schedule protection move in the discovery notes.
The user accepted 2D and the brief frames 3D as a later vertical slice, so the renderer should be swappable later but v1 should optimize for looking convincingly good now.

The fifth baked-in decision is feature tiering.
There are nine P0 features and one P1 stretch feature, but the P0 set already spans auth, Pinterest integration, uploads, AI generation, storage, rendering, and UI polish.
Chat refinement is only one feature numerically, but architecturally it is a real extension.

The sixth baked-in decision is that the UI has to work tablet-first and phone-compatible.
Clients will be looking at it during consultations, so touch targets, loading states, orientation decisions, and image layout are product work, not final CSS cleanup.
The briefs also imply that perceived polish matters more than raw feature count.

The seventh baked-in decision is methodology.
`hive.config.yaml` sets TDD and the hybrid routing is explicit: Codex handles architect and technical-writer work, Claude handles researcher/tester/reviewer/UI designer work, and Claude Opus 4.7 is the TPM validator.
For execution, Claude writes the spec/tests, Codex implements, Claude reviews, and Claude integrates.
That means the design has to support small slices with clear contracts or spec/implementation drift will show up quickly.

The eighth baked-in decision is that this is greenfield.
There is no existing codebase to bend around, but that also means no proven scaffolding, no test layout, no conventions, and no module seams to inherit.
The project profile leaves architecture, state management details, test locations, and naming conventions as TBD, so this discussion has to do some seam-finding up front.

## 3. My Proposed Approach

I think the right move is to build this in vertical slices after a thin foundation pass.
That pass should establish the app shell, environment validation, Supabase wiring, auth guardrails, storage buckets, and baseline test harnesses.
Not a week-long platform sprint. Just enough that every subsequent slice lands into real structure.

I would split the work into five likely epics: foundation and single-user auth, Pinterest integration, AI generation pipeline, visualizer plus design library, and chat refinement if time survives.
Those match the natural subsystem edges in the briefs better than a UI-vs-backend split.

I would start with foundation/auth, but only to the degree needed to unblock real slices.
That means email-scoped Supabase auth, route protection, app layout, database schema, storage setup, env handling, and a basic design record model with `user_id`.
I would also define the internal shape of a design here: references, prompt, generation status, generated image URL, selected shape, timestamps, and enough metadata to reopen and regenerate later.

After that, Pinterest OAuth should be the first major vertical slice.
It is one of the biggest external risks and it sits at the top of the core flow.
If app registration, callback behavior, board fetch, or pin browsing is awkward, I want that pain early, not after the visualizer already exists.
The slice should end with "user can log in, see boards, open a board, and choose pins."

The AI generation pipeline should be the next slice.
I would wire it as a server-side orchestration layer, not directly from the browser.
References from Pinterest and uploads should normalize into one internal input format, then a generation action can assemble the Gemini request from selected assets and optional text.
This is where retries, provider errors, and content-policy failures belong.
Even if there is no fallback provider in v1, the call boundary should preserve that option.

The visualizer and design library should follow immediately after generation because together they complete the wow moment from the discovery brief.
I would not treat the visualizer as a pure image viewer.
It needs shape-aware masks for almond, coffin, square, and stiletto, and the generated design should map cleanly into each shape without looking obviously stretched.
Saved designs should reopen into the same viewing context so the library feels like a workspace, not a dead gallery.

Architecturally, I would keep the visualizer boundary separate from the generation boundary.
The generated asset is one concern and how it is masked onto five nails is another.
That separation preserves both the future 3D swap and the future per-nail variation path.

For uploads, I would keep them in the same asset ingestion path as Pinterest references.
Different source, same normalized record shape.
That reduces downstream branching in generation.

On implementation patterns, I would lean on App Router server components for data-heavy screens, server actions or route handlers for mutations, Supabase RLS even in single-user mode, and shadcn/ui for consistent touch-friendly primitives.
I do not think global state needs to get fancy at kickoff. Local state plus URL state and server data should be enough.

For TDD, each slice should be framed around a narrow acceptance path.
Claude writes the spec and failing tests, Codex implements, and Claude reviews.
That means each slice needs a clean contract: auth gate, Pinterest callback, generation request, design save/reload, visualizer shape switch, and later chat refinement turn handling.
I would avoid stories that mix two external unknowns at once.

## 4. What Could Go Wrong

**High:** Pinterest API and OAuth friction could block the earliest meaningful slice.
The briefs already identify app registration and fixed redirect URLs as prerequisites.
If local development needs a tunnel or if Pinterest app approval has hidden friction, that can burn schedule before product work even starts.

**High:** Gemini 2.5 Flash Image might not be good enough at "apply this reference to a nail."
The discovery brief names it as the leading candidate, not a validated winner.
If it generates pretty images that do not actually read as nail designs, the bridge value proposition weakens immediately.

**High:** The 3.5-week timeline is genuinely tight for this many subsystems.
Nine P0 features expands into auth, OAuth, uploads, AI orchestration, storage, rendering, and tablet UX polish.
There is very little slack for rework.

**Medium:** Spec and implementation drift is a real risk in the Claude-spec / Codex-implement loop.
The config makes TPM review mandatory because this is a pilot.
If stories are underspecified, Claude review turns into a correction loop instead of a validation loop.

**Medium:** The 2D visualizer could technically work and still feel visually cheap.
Masks, scaling, texture fit, and hand composition will decide whether the result is impressive.

**Medium:** Single-user shortcuts can create future migration pain if we are careless.
The product brief explicitly warns against schema choices that block multi-user later.
The risk is encoding single-user assumptions everywhere and then paying for it later.

**Medium:** Tablet ergonomics are still unsettled.
The product brief asks portrait-first versus landscape-first as an open question.
That choice affects layout, board browsing, and how much of the hand preview is visible at once.

**Low:** Supabase storage performance might be good enough by default, but the brief rightly questions it.
If asset delivery is sluggish, the app will feel worse than it is.

**Low:** Chat refinement can quietly sprawl.
As a P1 feature, it touches conversation state, prompt accumulation, regeneration behavior, and UI complexity.

## 5. Dependencies and Constraints

External dependencies are straightforward and important.
Pinterest developer app registration is a prerequisite before OAuth can work at all.
Gemini API key provisioning is required before generation can be tested meaningfully.
Vercel and Supabase accounts need to exist before deployment and data wiring start.
The product brief also allows using the default `*.vercel.app` domain for v1, which helps keep domain setup from becoming a dependency.

Internal dependencies are basically none because this is greenfield.
That helps, but it also means every convention has to be chosen once and then stuck with.
The project profile leaves architecture patterns and test locations open, so those should be locked early.

Environment constraints matter more than usual because of Pinterest.
Production deploys on Vercel are the obvious home for the real callback URL.
For local work, the product brief explicitly raises a dev-tunnel question, so I would assume ngrok-or-equivalent until proven otherwise.

The time-sensitive constraint dominates everything else.
Mother's Day is 2026-05-10.
This is a hard emotional deadline, not a soft roadmap target.
Any story that does not move the core demo toward "wow, I can use this" needs scrutiny.

## 6. Open Questions

1. Is Pinterest app registration truly instant for this use case, or are there approval or redirect-url constraints that change sequencing?
2. For development, do we standardize on a tunnel-based callback URL, or develop only against a deployed Vercel preview/production environment?
3. Does Gemini 2.5 Flash Image actually perform well enough on reference-guided nail-design generation, or do we need a fallback provider plan earlier than expected?
4. How should multiple references be interpreted in v1: blend them equally, prioritize one primary reference, or treat them as loose style inputs?
5. Is the optional text prompt purely additive, or should it be able to override visual cues from the references?
6. What is the exact data model for a saved design: references, prompt, output image, selected nail shape, generation metadata, and regeneration lineage?
7. When reopening a saved design, is "regenerate from the same inputs" part of the core experience or a later enhancement?
8. What is the expected failure behavior if Gemini refuses, rate-limits, or returns low-quality output: retry automatically, ask the user to adjust inputs, or both?
9. Should the tablet UI optimize first for portrait or landscape, given board browsing and hand preview compete for space?
10. Does the product need an explicit client-facing presentation mode, or is the main interface intended to be shown directly during consultations?
11. Is indefinite image retention acceptable for v1, or do we want any cleanup policy for uploaded references and generated outputs?
12. How much visual fidelity is "good enough" for the 2D hand preview before it delivers the intended wow factor?

## 7. Verification Strategy

The verification plan should stay narrow and practical.
This is a single-user product with a hard deadline.
We need confidence in the P0 path, not a giant test matrix.

VERIFICATION PLAN:
Tools: {Vitest for unit logic, Vitest + Supabase test client for integration coverage, MSW for Pinterest/Gemini mocking, Playwright for end-to-end critical flows, optional Playwright screenshot checks for visualizer regressions}
Platforms: {Chrome on iPadOS as primary, Safari on iPadOS as secondary, iPhone browser for phone-usable checks, desktop Chrome for development sanity}
Automated: {single-user auth gate, Pinterest OAuth callback handling, board and pin fetch happy path with mocks, reference upload flow, Gemini generation happy path and retry/error paths, design save/reload cycle, nail shape switching for almond/coffin/square/stiletto, acceptance criteria per P0 feature}
Manual: {generated design quality review, hand-preview fidelity review, tablet-in-client-hand ergonomics, loading-state polish, saved-library browsing feel}
Not verifying: {load testing, broad cross-browser matrix beyond primary targets, full accessibility certification, multi-user behavior, billing/inventory/scheduling futures}

I would keep most unit tests around pure transforms and request builders.
Examples are mapping Pinterest pins into internal reference records, constructing the Gemini request payload, and shaping design metadata for persistence.
Integration tests should cover the app's contract with Supabase and the mutation boundaries.
Playwright should focus on the core demo path, not every branch in the interface.

I also think visual regression is worth selective use here.
Normally I would be cautious because image-heavy UIs can create noisy snapshots.
But shape switching on a five-nail renderer is exactly the kind of thing where a few stable screenshot checks could catch ugly regressions cheaply.

Manual review still matters because "does this feel gift-worthy?" is not fully automatable.
The discovery brief's success metric is emotional and usage-based, not throughput-based.
So we should explicitly budget review time for generated-image quality and tablet feel.

## 8. Scale Assessment

SCALE ASSESSMENT:
Files affected: ~60-90 for a clean greenfield implementation with app routes, auth flows, API boundaries, database types, UI components, test files, and deployment/config scaffolding
Subsystems: auth, Pinterest integration, reference ingestion/uploads, AI generation pipeline, design persistence, 2D visualizer, design library, tablet-first responsive UI, optional chat refinement
Migration required: no
Cross-team coordination: no
Unknowns: 5

RECOMMENDATION: Needs structured outline
RATIONALE: This is greenfield, but it is not small. The scope spans at least five real epics, multiple external dependencies, one unvalidated AI assumption, one high-risk OAuth integration, a quality-sensitive renderer, and a hybrid Claude/Codex TDD workflow that will punish vague story boundaries. A structured outline is the cheapest way to prevent sequencing mistakes and spec drift before story writing starts.

I do not think we should jump straight to stories from here.
If this were a plain CRUD internal tool, maybe.
But this project mixes UX polish, image generation, external APIs, and a hard calendar deadline.
The likely epics are clear enough to name now, but not decomposed enough to hand directly to execution.

My suggested outline should preserve the five-epic shape: foundation/auth, Pinterest integration, AI generation pipeline, visualizer plus library, and chat refinement as the stretch track.
The key thing the outline needs to settle is sequence and contract boundaries, especially where external dependencies and review gates can stall progress.

The greenfield aspect helps because there is no migration burden and no cross-team dependency burden.
But that does not make the work small.
It means the complexity is product and integration complexity rather than legacy complexity, and that still warrants structured planning before stories.

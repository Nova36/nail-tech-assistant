# Epic E — TPM Story Sequence (Slice 7 decomposition)

**Source authority:** `.pHive/planning/structured-outline.md` lines 420-460 (Slice 7 8-file manifest), `.pHive/planning/vertical-plan.md` lines 275-302 (Slice 7 layer map), `.pHive/planning/prd.md` lines 618-700 (Epic E PRD section).

**Slicing classification:** Slice 7 is a single vertical slice in the project's Slice 0-8 spine. Internal sequencing within the slice uses **subsystem-seam slicing** (memory: `subsystem-seam-slicing-heuristic.md`) crossed with **risk-class split** (memory: `risk-class-slice-split.md`). The seams are: persistence → core-domain lib → API → feature UI → e2e. The risk classes inside Slice 7 are LOW (e1, e2 — pure contracts/lib) vs MEDIUM (e3, e4 — extends d8's lifecycle surface and adds a new Gemini call path) vs MEDIUM-UI (e5, e6 — wireframe-blocked + e2e).

**Min-viable-ship cut for Epic E:** All of e1-e6. Epic E itself is P1/stretch and cuttable per FR-E-5; there is no further sub-cut inside it. If schedule pressure hits, the cut is "drop Epic E entirely" — which is exactly the design intent (PRD line 686-689).

## Story sequence (e1-e6)

| ID  | Title                                                                  | Risk   | UI? | Files (from Slice 7 manifest)                                                                               | Depends on                        | FR/US covered              |
| --- | ---------------------------------------------------------------------- | ------ | --- | ----------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------- |
| e1  | chat_turns persistence: schema + firestore.rules + indexes             | LOW    | —   | `firestore.rules`, `firestore.indexes.json`                                                                 | (none)                            | FR-E-1 (rules surface)     |
| e2  | chat-refinement.ts: accumulateChatInstructions + ChatTurn type + tests | LOW    | —   | `lib/designs/chat-refinement.ts`, `tests/unit/designs/chat-accumulation.test.ts`                            | (none — parallel with e1)         | FR-E-2                     |
| e3  | lifecycle.ts: chat-turn lineage attachment                             | MEDIUM | —   | `lib/designs/lifecycle.ts` (extend persistGenerationStart/Result with optional chatTurnId)                  | e1, e2, **Epic D d8 merged**      | FR-E-1 (lineage), FR-E-3   |
| e4  | POST /api/designs/[id]/chat route                                      | MEDIUM | —   | `app/api/designs/[id]/chat/route.ts`                                                                        | e1, e2, e3, **Epic D d8 merged**  | FR-E-1, FR-E-3, FR-E-6     |
| e5  | ChatRefinementPanel + /design/[id] integration                         | MEDIUM | yes | `components/ChatRefinementPanel.tsx`, `components/IterationTimeline.tsx` (conditional), `/design/[id]` wire | e4, **Epic E wireframe approval** | FR-E-4, US-E-2             |
| e6  | Playwright chat-refinement.spec.ts e2e                                 | MEDIUM | yes | `tests/e2e/chat-refinement.spec.ts`                                                                         | e5                                | US-E-1, US-E-2 (full path) |

## Dependency DAG

```
       e1 ─┐
            ├──> e3 ──> e4 ──> e5 ──> e6
       e2 ─┘                    ^
                                │
                          (wireframe approval gate)

External gates:
- e3, e4 hard-block on Epic D d8-regenerate-from-stored-inputs merging to epic-d/visualizer-library
- e5 hard-blocks on .pHive/wireframes/epic-e-chat-refinement/manifest.yaml wireframe_approval.status == 'approved'
```

## Parallelism opportunities

- **e1 ⫼ e2** — different files, no shared dependency, no shared type. e2 owns `ChatTurn` (lives in `lib/designs/chat-refinement.ts` per repo convention — `DesignDetail` lives in `lib/designs/load.ts`, `Design` in lifecycle, etc.). e1 owns rules + indexes. Run together.
- **e3 ⫼ e4** can NOT run parallel — e4 imports the lifecycle helper that e3 extends. Strict order.
- **e5 internal** — IterationTimeline.tsx is conditional per Slice 7 manifest item #8 ("only if the P1 UI needs explicit sequence context"). Fold into e5 as an optional component decided at story-authoring time, **don't promote to its own e7**.

## Cross-cutting concerns (per-slice surfacing — memory: `cross-cutting-concern-per-slice-surfacing.md`)

- **types-coverage** — e2 (ChatTurn exhaustiveness over status/turn-order)
- **security-rules** — e1 (rules-lane integration test for chat_turns ownership; chat_turns currently default-deny)
- **jsdom-vs-node** — e4 (`@vitest-environment node` per `reference_jsdom_formdata_node_env.md`)
- **error-logging** — e3, e4 (Gemini call paths; per `feedback_silent_catches_cost_time.md`)
- **provider-isolation** — e4 unit + e6 e2e (MSW mock of Gemini; no live provider calls in CI)
- **regression** — e6 (full chat happy-path Playwright as silent-break guard)

## ui-design step (UI stories)

UI stories e5 and e6 require a `ui-design` step in their YAMLs that reads the Epic E wireframe manifest at `.pHive/wireframes/epic-e-chat-refinement/manifest.yaml` and checks `wireframe_approval.status == 'approved'` before proceeding to `test-spec`. **This manifest does not currently exist** — see Escalation #2 below.

## Traceability check

- **US-E-1** (refine a saved design through chat): e2 (accumulation), e3 (lineage), e4 (route), e6 (e2e proves)
- **US-E-2** (understand iteration sequence): e5 (panel + turn history), e6 (e2e proves)
- **FR-E-1** (persist chat turns ordered, tied to design + generation): e1 (schema/rules), e3 (lineage write)
- **FR-E-2** (accumulate prior instructions): e2
- **FR-E-3** (each successful turn produces new generation linked to design): e3, e4
- **FR-E-4** (UI keeps current iteration + turn order understandable): e5
- **FR-E-5** (epic remains cuttable without destabilizing P0): satisfied by sequence shape — no Epic E story modifies a P0 contract; lifecycle.ts extension in e3 is additive (optional chatTurnId param)
- **FR-E-6** (failed turn keeps state understandable): e3 (failure-path persistence), e4 (route response shape), e5 (UI surfaces it)

All US-E-N and FR-E-N covered. No gaps.

## ESCALATION_FLAGS

```yaml
ESCALATION_FLAGS:
  - trigger: security:plan-audit
    placement: pre-exec
    severity: major
    stories: [e1, e3, e4]
    reason: |
      e1 adds chat_turns rules to firestore.rules (currently default-deny);
      e3 introduces cross-collection lineage writes (designs/{id}/generations
      subcollection plus chat_turns linkage); e4 adds a new authenticated POST
      route accepting user-supplied free-text prompts that flow into a Gemini
      provider call. Cumulative rules surface + new auth boundary + prompt-
      injection-adjacent input warrants pre-exec security audit aligned with
      Epic D's d2/d6/d7/d8/d9 audit precedent.
    raised_by: tpm

  - trigger: ui:major
    placement: pre-exec
    severity: moderate
    stories: [e5]
    reason: |
      Epic E has NO wireframes. No .pHive/wireframes/epic-e-chat-refinement/
      manifest exists. ChatRefinementPanel + IterationTimeline + /design/[id]
      integration is a meaningful new screen surface. Epic D's wireframe-gate
      precedent (epic.yaml execution_gates.wireframe_approval.required_for:
      [d3,d4,d5,d7,d8,d9]) should replicate for e5. Without wireframes, e5
      cannot start its ui-design step and will block at execute time.
    raised_by: tpm

  - trigger: ui:animations
    placement: append
    severity: minor
    stories: [e5]
    reason: |
      Iteration history and turn-by-turn generation feedback inherently
      involves transition states (turn pending → generating → result-ready,
      old-image fade-to-new-image). prefers-reduced-motion gap on b2 was
      caught by animations-specialist sidecar review (memory:
      feedback_animations_sidecar_review.md). Replicate the dual-persona
      reviewer pattern for e5.
    raised_by: tpm
```

## Schedule note (out-of-band, not part of YAML emission)

Epic D shipped d1-d6 as of 2026-05-01. d7, d8, d9 still in flight. With Mother's Day 9 days out, the realistic Epic E start is **after d8 merges** (e3/e4 hard-block on it, and e1/e2's pure-contract value alone is small without the lib chain wiring up). The honest read on Epic E shipping is: **it ships only if Epic D wraps with 4+ days of buffer**. PRD line 712 already acknowledges this ("Whether Epic E ships in the 2026-05-10 build depends on earlier P0 progress and preserved polish budget"). The orchestrator should plan for the cut to be a real possibility, not a fallback.

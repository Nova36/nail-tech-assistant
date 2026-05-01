# Epic D — Visualizer + Library: Story Index

Decomposition of Slice 5 + Slice 6 (per `.pHive/planning/structured-outline.md` lines 323-418, `.pHive/planning/prd.md` lines 491-590, `.pHive/planning/vertical-plan.md` lines 219-275).

Methodology: TDD. Branch: `epic-d/visualizer-library`. Mother's Day deadline 2026-05-10 (9 days from 2026-05-01).

## Stories

| ID  | Title                                                              | Slice | Complexity | UI? | Depends on | FR/US covered                          |
| --- | ------------------------------------------------------------------ | ----- | ---------- | --- | ---------- | -------------------------------------- |
| d1  | NailShape canonical migration to 6-shape union                     | 5     | low        | —   | (none)     | FR-D-2                                 |
| d2  | Shape state persistence module + PATCH /api/designs/[id]/shape     | 5     | medium     | —   | d1         | FR-D-2, FR-D-3, US-D-2 (AC #2/3)       |
| d3  | 6 nail-tip mask SVG assets with normalized clipPath geometry       | 5     | low        | yes | d1         | FR-D-1 (asset layer)                   |
| d4  | NailVisualizer + VisualizerFrame composition (theme-scaffolded)    | 5     | high       | yes | d1, d3     | FR-D-1, US-D-1 (AC #1/2)               |
| d5  | /design/[id] visualizer integration + shape-switch e2e + snapshots | 5     | high       | yes | d2, d4     | FR-D-1, FR-D-2, FR-D-3, US-D-1, US-D-2 |
| d6  | GET /api/designs/[id] DesignDetail loader + reopen page hydration  | 6     | medium     | —   | d5         | FR-D-8, US-D-3 (AC #3), US-D-4 (AC #1) |
| d7  | Inline design naming + POST /api/designs/[id]/save (rename)        | 6     | low        | yes | d6         | FR-D-4, FR-D-7, US-D-3 (AC #2)         |
| d8  | Regenerate from stored inputs + RegenerateButton                   | 6     | high       | yes | d6         | FR-D-5, FR-D-6, US-D-4 (AC #2/3)       |
| d9  | /library grid + DesignLibrary + DesignCard + empty state           | 6     | medium     | yes | d7, d8     | FR-D-4, FR-D-7, US-D-3, US-D-4 (AC #1) |

## Coverage check

- US-D-1 (preview generated design on a hand): d4, d5
- US-D-2 (switch nail shapes live): d2, d5
- US-D-3 (save and browse personal library): d7, d9 (+ d6 for reopen security)
- US-D-4 (reopen + regenerate from stored inputs): d6, d8 (+ d9 for browse path)
- FR-D-1 (uniform render across hand): d3 (assets), d4 (composition), d5 (integration + snapshots)
- FR-D-2 (4 — extended to 6 — supported shapes): d1, d2, d5
- FR-D-3 (shape persistence + restore): d2, d5, d6
- FR-D-4 (library cards + naming): d7, d9
- FR-D-5 (regenerate uses stored inputs): d8
- FR-D-6 (lineage preserved): d8 (reuses lifecycle.ts atomic update from c15)
- FR-D-7 (unnamed first, name later): d7, d9
- FR-D-8 (reopened restores workspace): d6 (+ d5 visualizer state)

All US-D-N and FR-D-N covered. No gaps.

## Sequencing notes

- **Slice 5 sequential within itself:** d1 unlocks d2, d3, d4. d5 needs d2 + d4.
- **Slice 6 starts after d5:** d6 first (loader is the gate to all reopen/regenerate work).
- **Within Slice 6:** d7 + d8 parallel-able after d6 (both depend only on d6). d9 needs d7 + d8.
- **Parallelism opportunities:**
  - After d1 lands: d2, d3 in parallel.
  - d4 depends on d3, but d4 can start once d3 unit-tests are passing (assets locked).
  - d7 + d8 in parallel after d6.

## Wireframe gate

UI stories (d3, d4, d5, d7, d8, d9) all have a `ui-design` step that reads `.pHive/wireframes/epic-d-visualizer-library/manifest.yaml` and checks `wireframe_approval.status == approved` before proceeding to `test-spec`. **Approved 2026-05-01** after the nails-as-focal-point reframe. The visualizer-component canonical assets live at `.pHive/wireframes/NailVisualizer/` (stage.svg, stage-line-art.svg, shapes/_.svg, preview.html). Page-level layouts in `.pHive/wireframes/epic-d-visualizer-library/_.html`remain canonical for chrome / sidebar / right rail / card grid; their inner-visualizer chunks are SUPERSEDED — devs build the new component from`NailVisualizer/` assets.

## Cross-cutting concerns applied

- **types-coverage** — d1, d4 (NailShape + theme exhaustiveness)
- **security-rules** — d2, d6, d7, d8, d9 (rules-lane integration tests for shape PATCH, design read, save, regenerate ownership, list query)
- **jsdom-vs-node** — every route handler test uses `@vitest-environment node` (per memory `reference_jsdom_formdata_node_env.md`)
- **error-logging** — every catch block on third-party / network paths logs code+message (per memory `feedback_silent_catches_cost_time.md`)
- **provider-isolation** — d8 uses MSW mock of Gemini; no live provider calls in CI
- **regression** — d5 Playwright snapshot baselines guard FR-D-1 silent-break risk per outline Risk #5

## Out of scope (deferred)

- Slice 7 — chat refinement (Epic E, P1)
- Slice 8 — polish + tablet UX + setup docs (Epic F)
- Per-nail variation, 3D rendering, presentation mode (deferred to v2 per kickoff #12)
- Multi-skin-tone visualizer (single-user gift; neutral silhouette v1 per Don's call 2026-05-01)
- Theme="line-art" implementation (scaffolded in d4, asset deferred to post-v1 pivot)

# Epic D Research Brief — Current Code State

## Q1: Visualizer code state

### Files that exist

- `components/studio/ShapeSelector.tsx`:1-39 — WORKING shape selector UI component. Renders almond/coffin/square/round/oval as pill buttons with aria-pressed. Already imported in wizard flow. **MISMATCH**: current NailShape union is `almond|coffin|square|round|oval`; PRD/outline spec `stiletto` — `round` and `oval` exist instead.
- `components/studio/GenerationPreview.tsx`:1-60 — Renders generated image as a flat square `<Image>` with `imageUrl`. Accepts `nailShape` prop but only uses it for alt text — no mask/clipping applied. This is the current post-generation UI; Slice 5 upgrades it into a five-nail visualizer.
- `app/(authenticated)/design/[designId]/page.tsx`:1-52 — Server component that loads design via `designConverter`, validates ownership, and renders `<Confirm>`. Passes `nailShape`, `promptText`, `latestGenerationId` down. Auth gate: redirects to `/` on no session, to `/design/new` on missing/unauthorized design.
- `app/(authenticated)/design/[designId]/Confirm.tsx`:1-217 — Client island. Auto-fires `generateDesign` server action on mount if no `latestGenerationId`. Shows `PendingView → GenerationPreview | GenerationErrorState`. On success renders `GenerationPreview` with flat image. **No visualizer or shape switching wired here yet.**
- `lib/types.ts`:1-64 — `NailShape = 'almond' | 'coffin' | 'square' | 'round' | 'oval'`. `Design` interface has `nailShape: NailShape` and `latestGenerationId: string | null`. Both fields fully typed and present.
- `lib/firestore/converters/designs.ts`:1-71 — `designConverter` serializes/deserializes `nailShape` with runtime validation against `NAIL_SHAPES` array. `id` stripped on `toFirestore`. `name`, `promptText`, `latestGenerationId` all default to null.

### Files that are stubs (placeholder)

- `app/(authenticated)/design/[designId]/Confirm.tsx` — functional but not visualizer-complete: `phase: 'idle'` renders a plain text div ("Result already generated"); no visualizer, no shape switcher, no save/library affordance. Needs significant upgrade in Slice 5+6.
- `components/studio/GenerationPreview.tsx` — renders flat image only; no nail masking, no five-nail layout.

### Files that are net-new (must be created per Slice 5 manifest)

- `components/NailVisualizer/NailVisualizer.tsx` — five-nail hand layout with mask rendering
- `components/NailVisualizer/ShapeSelector.tsx` — new location per manifest (currently at `components/studio/ShapeSelector.tsx`; manifest calls for `components/NailVisualizer/ShapeSelector.tsx` — either move or add new)
- `components/NailVisualizer/shapes/almond.svg`
- `components/NailVisualizer/shapes/coffin.svg`
- `components/NailVisualizer/shapes/square.svg`
- `components/NailVisualizer/shapes/stiletto.svg` — **name conflict**: types use `round`/`oval`, not `stiletto`; types.ts must be updated or shape list reconciled before assets are named
- `components/VisualizerFrame.tsx` — landscape-friendly frame wrapper
- `lib/designs/shape-state.ts` — shape enum helpers + persistence glue
- `app/api/designs/[id]/shape/route.ts` — `PATCH` endpoint for shape persistence (implied by interface `PATCH /api/designs/[id]/shape`)
- `tests/unit/designs/shape-state.test.ts`
- `tests/e2e/visualizer-shapes.spec.ts`
- `tests/e2e/visualizer-snapshots.spec.ts`

---

## Q2: Library/save/regenerate code state

### Files that exist

- `app/(authenticated)/library/page.tsx`:1-22 — **STUB**. Renders placeholder text "Your saved designs will appear here" + link to `/design/new`. No data fetching, no grid.
- `lib/designs/lifecycle.ts`:1-333 — Three exported functions: `createDesignDraft`, `persistGenerationStart`, `persistGenerationResult`. The transaction in `persistGenerationResult` atomically updates `latestGenerationId` on the design + generation status. **`latest_generation_id` lineage EXISTS and is working** — updated on every successful generation. Save/rename/regenerate functions are absent.

### Files that are stubs (placeholder)

- `app/(authenticated)/library/page.tsx` — pure placeholder, no real implementation.

### Files that are net-new (must be created per Slice 6 manifest)

- `components/DesignLibrary.tsx` — design card grid with thumbnail, name, updated metadata
- `app/api/designs/[id]/save/route.ts` — `POST` to save/rename design
- `app/api/designs/[id]/regenerate/route.ts` — `POST` to re-run generation from stored inputs
- `app/api/designs/[id]/route.ts` — `GET` to load full design detail (references, prompt, shape, latest generation)
- `components/RegenerateButton.tsx`
- `components/DesignNameField.tsx`
- `tests/integration/designs-regenerate.test.ts`
- `tests/e2e/library-regenerate.spec.ts`
- `tests/integration/designs-rls.test.ts`

### Confirmed: `latest_generation_id` lineage

`persistGenerationResult` in `lifecycle.ts:300-316` runs a Firestore transaction that writes both:

- `generations/{id}` — status, resultStoragePath, metadata
- `designs/{id}` — `latestGenerationId: input.generationId`

This is the lineage anchor for regenerate; the regenerate route needs to read `primaryReferenceId`, `secondaryReferenceIds`, `promptText`, `nailShape` from the design doc, then call the same generate → persistGenerationStart → persistGenerationResult pipeline.

---

## Q3: Reusable patterns + constraints

### Patterns to lean on

- **Pattern: Server action for design mutations** | File: `app/(authenticated)/design/actions.ts`:1-58 | Why relevant: `'use server'` + `getSessionForServerAction()` is the established auth gate for design-mutating server actions. Slice 6 `saveDesign` / `regenerateDesign` should follow this exact shape.

- **Pattern: Route handler for uploads/API** | File: `app/api/references/upload/route.ts` | Why relevant: `PATCH /api/designs/[id]/shape` and `POST /api/designs/[id]/save` are route handlers (not server actions) per the interface spec. The upload route shows the `getSession(req)` + `NextResponse.json()` pattern for API routes.

- **Pattern: Firestore converter with id-strip** | File: `lib/firestore/converters/designs.ts`:33-71 | Why relevant: `toFirestore` strips `id`; tests that call `doc().get()` directly (no converter) will see raw Firestore doc without `id`. Memory note confirmed: use `.withConverter()` in tests. Slice 6 `loadDesign` must read design + references + latest generation — all through their respective converters.

- **Pattern: `persistGenerationResult` transaction = `latestGenerationId` update** | File: `lib/designs/lifecycle.ts`:300-316 | Why relevant: Regenerate reuses this exact function. The route only needs to call `createDesignDraft`-equivalent inputs from stored design fields, then drive the same `persistGenerationStart → generate → persistGenerationResult` flow.

- **Pattern: Auth gate in page server component** | File: `app/(authenticated)/design/[designId]/page.tsx`:19-40 | Why relevant: Library page and design-detail GET route need the same `getSessionForServerAction()` + `redirect('/')` pattern for pages, or `getSession(req)` + 401 for API routes.

- **Pattern: Storage paths — `users/{uid}/generations/{genId}.ext`** | File: `lib/firebase/storage.ts`:127-134 | Why relevant: Library thumbnail fetching for DesignLibrary cards will reference `generation.resultStoragePath`. No signed-URL helper exists yet — client SDK download URL or a new `getDownloadUrl` helper needed for library thumbnails.

### Constraints / risks specific to Epic D

- **HIGH RISK — NailShape union mismatch**: `lib/types.ts` exports `round | oval` but PRD + outline spec `stiletto`. `ShapeSelector.tsx` already renders `round | oval`. Slice 5 adds SVG masks named for shapes; if the union is not reconciled before assets are named, the entire shape pipeline will be inconsistent. Decision needed: keep `round | oval`, replace with `stiletto`, or add `stiletto` and drop one of the others.

- **HIGH RISK — No Storage download URL helper**: `lib/firebase/storage.ts` provides `uploadReferenceBytes`, `uploadGenerationBytes`, `readReferenceBytes` (server-only). There is **no client-accessible download URL helper**. `GenerationPreview` receives `imageUrl` from the generate server action (line ~120 in actions.ts). Library thumbnails need a URL derivation strategy — either a new `getDownloadUrl` server helper, public bucket reads (storage rules currently deny unauthenticated reads), or signed URLs via Admin SDK. **Not implemented anywhere yet.**

- **MEDIUM RISK — No Playwright screenshot baseline**: No `toHaveScreenshot` calls exist in any e2e spec. `playwright.config.ts` has no `snapshotDir` or `expect: { toHaveScreenshot }` config. Creating `visualizer-snapshots.spec.ts` requires adding snapshot config and generating baselines — a first-time setup step, not just writing test code.

- **MEDIUM RISK — Firestore rules cover shape PATCH**: Current `designs` rules allow `update` if `userId` matches and is immutable. A `PATCH /api/designs/[id]/shape` route updating only `nailShape` + `updatedAt` will pass existing rules as long as `userId` field is not altered. No rules change needed for shape PATCH. However, the route must not allow a `userId` field override.

- **MEDIUM RISK — Library thumbnail display via storage**: Storage rules (`match /users/{uid}/{path=**}`) require `request.auth != null && request.auth.uid == uid`. Client-side `<Image src={signedUrl}>` or Firebase client SDK `getDownloadURL()` pattern will work if the client is authenticated. The `GenerationPreview` currently uses a server-action-derived URL (from `imageUrl` prop) — unclear whether that's a Firebase download URL or a signed URL. **Needs verification before DesignLibrary card thumbnails are designed.**

- **LOW RISK — `fileParallelism: false` in rules lane**: Already set in `vitest.config.rules.ts:45`. `tests/integration/designs-rls.test.ts` (Slice 6) goes into this lane — no additional config needed, just add its path to `vitest.config.rules.ts` include patterns.

- **LOW RISK — `jsdom` env for visualizer component tests**: SVG mask rendering and the five-nail layout are DOM/CSS-only (no Canvas). Standard jsdom environment is adequate for unit/integration tests. Playwright handles visual regression.

- **LOW RISK — ShapeSelector location drift**: Manifest says `components/NailVisualizer/ShapeSelector.tsx` but it exists at `components/studio/ShapeSelector.tsx`. The wizard uses the studio version. Either move (and update imports) or keep studio version and add a new NailVisualizer-specific variant. Orchestrator should decide.

---

## Open questions

1. **NailShape union reconciliation**: Does Epic D introduce `stiletto` (replacing `round` or `oval`), or does the PRD/outline drift need to be corrected to match the current `round | oval` implementation? This blocks naming SVG assets and the shape PATCH route validation.

2. **Library thumbnail URL strategy**: How does `GenerationPreview` currently receive `imageUrl`? Is it a Firebase Storage download URL (client-usable), a short-lived signed URL, or a proxied URL? Answer determines whether `DesignLibrary` cards can reuse the same pattern or need a new helper.

3. **ShapeSelector location**: Move `components/studio/ShapeSelector.tsx` → `components/NailVisualizer/ShapeSelector.tsx` and update wizard import, or keep studio version and create a separate NailVisualizer one?

4. **Playwright snapshot baseline**: First-run snapshot generation requires `--update-snapshots`. Should this be a manual step in CI setup or part of the story AC?

5. **`latest_generation_id` as thumbnail source**: Does the library card thumbnail always point to the latest generation's `resultStoragePath`, or should history rows be browsable? PRD FR-D-6 says "latest result updates without destroying older generation rows" but UI spec only shows one thumbnail per card.

---

## Validation note

- context7 / web research used? No — codebase-only research. All findings are from direct file reads.
- Confidence: high for file existence/content; medium for NailShape reconciliation (requires Don's decision); medium for thumbnail URL strategy (requires reading `generateDesign` action return path more carefully).

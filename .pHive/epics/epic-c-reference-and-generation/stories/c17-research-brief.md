# c17 Research Brief — Generation UI

**Story:** c17-generation-ui  
**Route:** `app/(authenticated)/design/[designId]/page.tsx` (NEW)  
**Status:** Wireframe approved 2026-04-29 by Don. Impl proceeds autonomously.  
**Depends on:** c16 (`generateDesign` action), c11 (`WizardProgressStrip`, `Wizard`, shell layout)

---

## 1. Component Contracts

All three components are **client components** (`'use client'`) — they own interactive state and respond to action results.

### `GenerateButton`

**File:** `components/studio/GenerateButton.tsx`

```tsx
'use client';

type GenerateButtonProps = {
  canGenerate: boolean; // false while pending or primary ref absent
  pending: boolean; // true while generateDesign is in-flight
  onGenerate: () => void; // caller dispatches; button does not call action directly
};
```

- When `pending === false && canGenerate === true`: renders `.btn.btn-primary` with text "Generate Design"
- When `pending === true`: `disabled`, `aria-busy="true"`, shows nail-fill SVG animation + "Painting your design…" copy
- When `canGenerate === false`: `disabled`, `aria-disabled="true"`, neutral muted styling

**Button styling anchor** — mirror the `.btn.btn-primary` pattern from wireframe (line 358-363):

```css
background: var(--primary); /* #6b3f5e */
color: var(--primary-foreground); /* #faf7f2 */
box-shadow: 0 6px 16px rgba(107, 63, 94, 0.25);
border-radius: 12px;
padding: 12px 18px;
font-size: 14px;
font-weight: 500;
min-height: 44px;
```

Disabled variant (wireframe line 366-370): `bg: rgb(140 126 120 / 0.25)`, `color: var(--muted-foreground)`, no shadow, `cursor: not-allowed`.

---

### `GenerationPreview`

**File:** `components/studio/GenerationPreview.tsx`

```tsx
'use client';

type GenerationPreviewProps = {
  imageUrl: string; // signed Firebase Storage URL from success envelope
  nailShape?: string | null; // for alt text synthesis
  promptText?: string | null; // for alt text synthesis
  onAdjust: () => void; // "← Back to adjust" CTA
};
```

- `next/image` with `src={imageUrl}` — c18 ships the `remotePatterns` host; until c18 lands use `unoptimized` prop
- `alt` synthesized: `"Generated nail design — ${nailShape ?? 'almond'} shape${promptText ? `, ${promptText.slice(0, 60)}` : ''}"` (wireframe line 1298: `"Generated nail design — almond shape, soft mauve french with chrome accent"`)
- Heading copy from wireframe line 1281: `"Here's your design."`
- Sub-copy wireframe line 1285: `"Save it to your Library, try another version, or step back and adjust."`
- Discard pattern: quiet text link → inline `role="alertdialog"` confirm (wireframe lines 1403–1446)

---

### `GenerationErrorState`

**File:** `components/studio/GenerationErrorState.tsx`

```tsx
'use client';

import type { GenerateDesignErrorCode } from '@/app/(authenticated)/design/actions';

type GenerationErrorStateProps = {
  errorCode: GenerateDesignErrorCode;
  message: string; // server diagnostic, not shown to user
  onAdjust: () => void; // "← Back to adjust" → idle, returns to Step 2
  onRetry?: () => void; // optional "Try again" → re-fire generation (rate_limit, network, storage_fail)
};
```

Must wrap the outer section in `role="alert"` (per \_a11y-spec.md §b5 `BrowseErrorRetry` pattern).

---

## 2. Error Copy Lookup Table

Pulled verbatim from wireframe frames 03–07.

| `errorCode`                                                                               | Heading (wireframe h2.err-headline)      | Body (wireframe p.err-body)                                                                                                  | Primary CTA        | Secondary CTA              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------- |
| `refusal`                                                                                 | `We couldn't generate this design.`      | `The image model declined the request. This sometimes happens with certain prompts or references. Try adjusting.`            | `← Back to adjust` | `Use different references` |
| `rate_limit`                                                                              | `Generation paused — too many requests.` | `We hit the model's rate limit and the auto-retry didn't recover. Try again in a moment.`                                    | `Try again`        | `← Back to adjust`         |
| `network`                                                                                 | `Couldn't reach the image model.`        | `Network hiccup. The auto-retry didn't recover. Check your connection and try again.`                                        | `Try again`        | `← Back to adjust`         |
| `storage_fail`                                                                            | `Generated, but couldn't save.`          | `The image was created but we couldn't store it. Try again — your reference set is preserved.`                               | `Try again`        | `← Back to adjust`         |
| `low_quality`                                                                             | `The result wasn't great.`               | `The model returned something that didn't match your references well. Adjusting your prompt or reference set usually helps.` | `← Back to adjust` | `Try again anyway`         |
| `unauthorized` / `invalid_input` / `design_not_found` / `design_unauthorized` / `unknown` | `Something went wrong.`                  | `We couldn't complete this design. Adjust your inputs and try again.`                                                        | `← Back to adjust` | —                          |

**Wireframe status bar copy** (aria-live, top right, per frame):

- refusal: `"Couldn't generate"` (frame 03 line 1596)
- rate_limit: `"Generation paused"` (frame 04 line 1783)
- network: `"Couldn't reach the model"` (frame 05 line 1985)
- storage_fail: `"Couldn't save"` (frame 06 line 2172)
- low_quality: `"Result wasn't great"` (frame 07 line 2373)

**TypeScript exhaustiveness:** implement as `Record<GenerateDesignErrorCode, { heading: string; body: string; primaryCta: string; secondaryCta?: string }>`. Compile-time guard — any new code without an entry is a type error.

---

## 3. Page Integration Plan

### Route file

`app/(authenticated)/design/[designId]/page.tsx` — **server component** (does NOT exist yet, create it).

Pattern mirrors `app/(authenticated)/design/new/page.tsx`.

```tsx
// Server component — server-loads the Design doc
import { getFirestore } from 'firebase-admin/firestore';
import { designConverter } from '@/lib/firestore/converters';
// ...
export default async function DesignDetailPage({
  params,
}: {
  params: { designId: string };
}) {
  const design = await loadDesign(params.designId); // server-side, returns null if not found
  // pass to client island
  return <Confirm design={design} />;
}
```

**What it server-loads:**

- `Design` doc via `designConverter` (fields: `id`, `userId`, `primaryReferenceId`, `secondaryReferenceIds`, `promptText`, `nailShape`, `latestGenerationId`) — see `lib/firestore/converters/designs.ts:33`
- Session check via `getSessionForServerAction()` — redirect to `/` if no session
- If design not found or unauthorized, redirect with a gentle error

**What it passes to client island (`Confirm.tsx`):**

```tsx
<Confirm
  designId={design.id}
  nailShape={design.nailShape}
  promptText={design.promptText}
/>
```

**`<WizardProgressStrip step={3}>` placement:** inside `Confirm.tsx` at the top of the wizard chrome, above the main body, matching the `.wiz-progress` pattern in the wireframe. Import from `@/components/studio/WizardProgressStrip`.

The studio sidebar is inherited via the `(authenticated)` layout — no duplication needed.

---

### Client island: `app/(authenticated)/design/[designId]/Confirm.tsx`

Owns the state machine (section 4 below). Imports `WizardProgressStrip`, `GenerateButton` (used in pending context), `GenerationPreview`, `GenerationErrorState`.

---

## 4. State Machine Inside the Client Island

```
idle → pending → success
               → failure
failure → idle (onAdjust / onRetry)
```

```tsx
type GenerationState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'success'; generationId: string; imageUrl: string }
  | { phase: 'failure'; errorCode: GenerateDesignErrorCode; message: string };
```

**Transitions:**

- **Mount → pending (auto-fire):** On first mount, immediately dispatch `generateDesign({ designId })`. No manual "click to start" button on this page — per AC: "renders with INSTANT transition to Pending state". Use `useEffect` with `startTransition` or `useTransition` to call the server action.
- **pending → success:** Set state with `imageUrl` from envelope; render `<GenerationPreview>`.
- **pending → failure:** Set state with `errorCode` + `message`; render `<GenerationErrorState>`.
- **failure → pending (retry):** `onRetry` prop on error state — re-dispatches `generateDesign`, resets to `{ phase: 'pending' }`.
- **failure → idle / back to Step 2 (adjust):** `onAdjust` — `router.push('/design/new')` (state preserved in c11 component since this is a different page; see Open Risks §8.1).
- **success (discard):** inline confirm → `router.push('/design/new')`.

**`aria-busy`:** the `role="region" aria-label="Result"` wrapper gets `aria-busy={phase === 'pending'}`.

**`aria-live` status bar text** (top right in wizard chrome): shown during pending — `"Generating · ~10s"`. On success — `"Result ready"`. On failure — per errorCode lookup (see section 2).

---

## 5. Test Plan — Tester (RTL + Integration)

### `tests/unit/components/studio/generate-button.test.tsx`

```
vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: vi.fn(),
}));
process.env.PINTEREST_ACCESS_TOKEN = 'test-token'; // stub at top — actions.ts transitively loads lib/pinterest/client
```

Cases:

1. Idle state (`canGenerate=true, pending=false`) — button enabled, text "Generate Design"
2. Idle state (`canGenerate=false`) — button `disabled`, `aria-disabled="true"`
3. Pending state — button `disabled`, `aria-busy="true"`, "Painting your design…" text visible
4. Pending state + `prefers-reduced-motion: reduce` — static "Generating…" text, no looping animation class
5. Click → `onGenerate` called once
6. Click while pending (`pending=true`) — `onGenerate` NOT called

### `tests/unit/components/studio/generation-preview.test.tsx`

```
process.env.PINTEREST_ACCESS_TOKEN = 'test-token';
```

Cases: 7. Renders `<img>` (via `next/image`) with `src` matching `imageUrl` prop 8. `alt` includes `nailShape` when provided: `"Generated nail design — almond shape"` 9. `alt` includes truncated `promptText` when provided 10. Heading "Here's your design." visible 11. "← Back to adjust" button visible, calls `onAdjust` on click

### `tests/unit/components/studio/generation-error-state.test.tsx`

```
process.env.PINTEREST_ACCESS_TOKEN = 'test-token';
```

Cases: 12. `errorCode="refusal"` → heading `"We couldn't generate this design."` + body copy + `role="alert"` 13. `errorCode="rate_limit"` → heading `"Generation paused — too many requests."` + "Try again" primary CTA 14. `errorCode="network"` → heading `"Couldn't reach the image model."` + "Try again" primary CTA 15. `errorCode="storage_fail"` → heading `"Generated, but couldn't save."` + "Try again" primary CTA 16. `errorCode="low_quality"` → heading `"The result wasn't great."` + "← Back to adjust" primary CTA 17. `errorCode="unauthorized"` → generic fallback heading + "← Back to adjust" CTA 18. `errorCode="invalid_input"` → same generic fallback 19. `errorCode="design_not_found"` → same generic fallback 20. `errorCode="design_unauthorized"` → same generic fallback 21. `errorCode="unknown"` → same generic fallback 22. All error states include `role="alert"` on wrapper section

### `tests/integration/design-detail/generation-flow.test.tsx`

```tsx
// @vitest-environment jsdom
vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: vi.fn(),
  // other exports as needed
}));
process.env.PINTEREST_ACCESS_TOKEN = 'test-token'; // MUST be at top — transitive lib/pinterest/client load
```

Cases: 23. Mount `<Confirm designId="d1" nailShape="almond" promptText="soft marble">` → immediately shows pending state (aria-busy="true"), `generateDesign` called once 24. `generateDesign` resolves `{ status: 'success', generationId: 'g1', imageUrl: 'https://…' }` → transitions to preview state with `<img src="https://…">` 25. `generateDesign` resolves `{ status: 'failure', errorCode: 'refusal', … }` → transitions to error state with refusal copy + `role="alert"` 26. Click "← Back to adjust" in failure state → `router.push('/design/new')` called 27. `WizardProgressStrip` with `step={3}` is present and Step 3 shows as active (`aria-current="step"`)

**No `@vitest-environment node` override needed** — all tests use jsdom default.

---

## 6. Test Plan — Developer (Codex File Targets)

### Files to CREATE

| File                                                | Description                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `components/studio/GenerateButton.tsx`              | Client component — idle/pending states, nail-fill animation, `aria-busy`                  |
| `components/studio/GenerationPreview.tsx`           | Client component — `next/image`, alt synthesis, inline Discard confirm                    |
| `components/studio/GenerationErrorState.tsx`        | Client component — 10-code exhaustive COPY map, `role="alert"`, `onRetry`/`onAdjust` CTAs |
| `app/(authenticated)/design/[designId]/page.tsx`    | Server component — loads `Design` doc, passes to `Confirm`                                |
| `app/(authenticated)/design/[designId]/Confirm.tsx` | Client island — state machine, dispatches `generateDesign`, composes all three components |

### DO NOT MODIFY

- `app/(authenticated)/design/actions.ts` — c16 owns it; do NOT add codes or change envelope shape
- `components/studio/WizardProgressStrip.tsx` — import as-is with `step={3}`
- `app/(authenticated)/design/new/Wizard.tsx` — c17 does NOT modify the wizard; it's a separate page

### Import of `generateDesign`

```tsx
import { generateDesign } from '@/app/(authenticated)/design/actions';
import type {
  GenerateDesignErrorCode,
  GenerateDesignResult,
} from '@/app/(authenticated)/design/actions';
```

`GenerateDesignResult` shape (from `actions.ts:98-105`):

```ts
export type GenerateDesignResult =
  | { status: 'success'; generationId: string; imageUrl: string }
  | {
      status: 'failure';
      errorCode: GenerateDesignErrorCode;
      cta: 'adjust_inputs';
      message: string;
    };
```

---

## 7. Animations + A11y Notes

### Pending state motion (wireframe lines 514–640)

**Primary (motion-on):**

- Nail-fill SVG: `animation: nail-rise 4s ease-in-out infinite` — vertical gradient fill rises from cuticle to tip (scaleY 0→1), holds, resets
- Glimmer sweep: `animation: glimmer-sweep 3.6s ease-in-out infinite` — diagonal white shimmer over the fill
- Loop is designed to repeat for 10–15s without jarring resets (4s cycle fits cleanly)

**Reduced-motion fallback (wireframe line 634-640):**

```css
@media (prefers-reduced-motion: reduce) {
  .nail-fill .fill,
  .nail-fill .glimmer,
  .indet-bar::after {
    animation: none;
  }
}
```

Static nail (fill visible at ~60%) + indeterminate bar becomes static striped bar. Heading text switches to `"Generating…"` (not `"Painting your design…"` which implies motion).

**Animations-spec constraints** (`_animations-spec.md`):

- Compositor-only properties for repeated animations: `transform` + `opacity`. The SVG fill uses `scaleY` (transform) — compliant.
- Idle loops ≥ 2s: 4s nail-rise + 3.6s glimmer are both compliant.
- No JS animation libraries (Framer Motion, GSAP, etc.) — pure CSS only.

### State-transition motion (wireframe legend, line 876-880)

- **Pending → Success:** 250ms cross-fade (`opacity 0→1`) on result frame; result image scales 0.96→1.0 in 200ms ease-out
- **Pending → Error:** 200ms `view-settle` gentle settle on error card (NOT shake, NOT jarring)
- Both transitions: reduced-motion → instant (no translate, no opacity tween)

**Keyframes to reuse from `_animations-spec.md §3`:**

- `view-settle`: `opacity: 0; transform: translateY(2px)` → `opacity: 1; transform: translateY(0)` — use for error card entrance
- `card-enter`: not appropriate here (4px too jumpy for a whole-view entrance)

### A11y requirements (wireframe legend lines 884-893, `_a11y-spec.md`)

- `role="region" aria-label="Result"` on wiz-body wrapper; `aria-busy="true"` while pending
- `aria-live="polite"` on progress strip status span (top-right text) — announces "Generating · ~10s" → "Result ready" / "Couldn't generate"
- On pending → success transition: announce `"Generation complete. Result ready."`
- On pending → failure transition: announce per status-bar copy (e.g., `"Generation paused. Rate limit."`)
- Error state: `role="alert"` — assertive announcement (wireframe confirms, line 889: `aria-live="polite"` per frame; but `_a11y-spec.md` `BrowseErrorRetry` uses `role="alert"`)
- Error glyph SVGs: `aria-hidden="true"` — semantics live in h2 heading + body paragraph
- Focus management: on transition from pending → failure, move focus to the error card heading (`tabIndex={-1}` + `.focus()`)
- All CTAs: `focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2`
- Touch targets: all buttons `min-h-[44px]`
- No color-only signaling: every error has glyph + heading + body + CTA

**Animations-specialist sidecar at reviewer step** must check:

1. Nail-fill loop timing (4s clean repeating for 10–15s, no jarring reset visible to user)
2. Glimmer sweep (3.6s, intentionally not synchronized with 4s nail-rise)
3. Pending → success 250ms cross-fade + 200ms image scale
4. Pending → error 200ms view-settle (not shake)
5. `prefers-reduced-motion` kills all four animations; static nail + static bar; no looping
6. `aria-live` announcements fire on each state transition
7. High-contrast focus rings on all CTAs

---

## 8. Open Risks

### 8.1 State preservation on "← Back to adjust"

**Risk:** The `adjust_inputs` CTA routes to `/design/new` via `router.push`. Since `/design/[designId]` and `/design/new` are separate routes, the c11 `Wizard` component unmounts and remounts — any React state in `Wizard.tsx` is lost.

**Current c11 behavior:** `Wizard.tsx` holds `workingSet`, `primary`, `promptText`, `nailShape` in local `useState` (lines 21-27). No sessionStorage, no URL persistence.

**Impact:** User who fails generation and clicks "← Back to adjust" arrives at a blank Step 1. They lose their reference set and prompt.

**Recommended fix (scope: c17 implement step):** Before routing to `/design/new`, serialize wizard state to `sessionStorage` keyed by `designId`. c11 `Wizard.tsx` reads sessionStorage on mount and rehydrates. Alternatively: pass state via query params (simpler for a single-user app). This should be flagged to the developer as a required behavior per AC line 160: `"routed back to workspace with assembled reference state preserved"`.

### 8.2 `next/image` host not yet allowlisted

c18 adds Firebase Storage host to `next.config.ts` `images.remotePatterns`. If c17 ships before c18, `next/image` will throw a runtime error for the signed URL.

**Mitigation:** Use `<Image unoptimized src={imageUrl} ...>` as a temporary shim until c18 lands. This is explicitly called out in the story's AC (line 163). The developer should leave a `// TODO c18: remove unoptimized once host is in remotePatterns` comment.

### 8.3 Auto-fire generates on every page load

`Confirm.tsx` calls `generateDesign` on mount. If the user navigates back to `/design/[designId]` after a successful generation, it would fire again.

**The story's AC (line 161)** says: "when user navigates away and returns, c17 does NOT re-render the preview." This implies the state machine must check `design.latestGenerationId` on mount — if it already has a generation, skip auto-fire and show the existing result (or blank/redirect).

The `Design` shape from `designConverter` includes `latestGenerationId: string | null` (see `designs.ts:62`). The server component can pass this to `Confirm.tsx`; if `latestGenerationId != null`, init state to `idle` (or a new `already_generated` phase) rather than auto-firing.

### 8.4 PINTEREST_ACCESS_TOKEN transitive import in tests

Every test file that imports from `app/(authenticated)/design/actions.ts` (directly or via `Confirm.tsx`) must stub `PINTEREST_ACCESS_TOKEN` at the top. The `selectPinterestPin` export transitively loads `lib/pinterest/client` at module load time.

**Pattern (per memory `feedback_actions_file_transitive_env`):**

```ts
process.env.PINTEREST_ACCESS_TOKEN = 'test-token';
// must appear before any import of actions.ts
```

### 8.5 `design_unauthorized` vs `design_not_found` silent swallow

The server component loads the design before rendering `Confirm.tsx`. If the design is missing or belongs to another user, the page should redirect rather than render and then fail at generation time. Currently the brief specifies a redirect — but the developer needs to implement this explicitly to avoid a flash of the Pending state before the generation failure arrives with `design_not_found`.

### 8.6 `low_quality` has two CTAs with reversed primary

For `low_quality`, "← Back to adjust" is **primary** and "Try again anyway" is ghost — reversed from `rate_limit`/`network`/`storage_fail`. The COPY map must capture `primaryCta` and `secondaryCta` correctly. Tester case 16 covers this.

---

## Source Labels

For parent search:

- wireframe: `.pHive/wireframes/epic-c-reference-and-generation/c17-generation-ui/wireframe.html`
- story: `.pHive/epics/epic-c-reference-and-generation/stories/c17-generation-ui.yaml`
- actions: `app/(authenticated)/design/actions.ts:86-105` (envelope types)
- wizard: `app/(authenticated)/design/new/Wizard.tsx`
- progress strip: `components/studio/WizardProgressStrip.tsx`
- design converter: `lib/firestore/converters/designs.ts`
- animations spec: `.pHive/wireframes/epic-b-pinterest-integration/_animations-spec.md`
- a11y spec: `.pHive/wireframes/epic-b-pinterest-integration/_a11y-spec.md`

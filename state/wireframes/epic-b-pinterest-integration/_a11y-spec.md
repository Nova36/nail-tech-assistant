# Epic B Accessibility Spec — Wireframe Touchpoint 1

**Version:** 1.0
**Authored:** 2026-04-20
**Author:** accessibility-specialist
**Scope:** Extends and validates §8 of `_base-template.md` for stories b3, b4-token-invalid-view, b4-insufficient-scope-view, b5.
**Target:** WCAG 2.1 AA (not AAA). Single-user app (one operator) — baseline AA enforced, not edge-case assistive-tech hardening.

---

## Table of contents

1. [Contrast matrix](#1-contrast-matrix)
2. [Per-story a11y inventory](#2-per-story-a11y-inventory)
   - [b3 — Pinterest pin grid](#b3--pinterest-pin-grid)
   - [b4 — TokenInvalidView (401)](#b4--tokeninvalidview-401)
   - [b4 — InsufficientScopeView (403)](#b4--insufficientscopeview-403)
   - [b5 — Empty states & retryable errors](#b5--empty-states--retryable-errors)
3. [Reduced-motion audit](#3-reduced-motion-audit)
4. [Keyboard-only user journey](#4-keyboard-only-user-journey)
5. [a11y-designer-checklist](#5-a11y-designer-checklist)
6. [Base-template §8 corrections](#6-base-template-8-corrections)

---

## 1. Contrast matrix

Ratios computed from sRGB relative luminance per WCAG 2.1 (L1+0.05)/(L2+0.05). Rounded to 2dp.

**WCAG 2.1 AA thresholds:**
- Normal text: **4.5:1**
- Large text (≥18pt / 14pt-bold ≈ 24px / 18.66px-bold): **3:1**
- UI component / graphical object: **3:1**

| # | Foreground | Background | Ratio | AA normal | AA large | Use | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Warm Charcoal `#3D3530` | Ivory Cream `#FAF7F2` | **10.89:1** | PASS | PASS | Body on page | ✓ Use freely |
| 2 | Warm Charcoal `#3D3530` | Warm Parchment `#F0EBE3` | **9.73:1** | PASS | PASS | Body on card | ✓ Use freely |
| 3 | Taupe Mist `#8C7E78` | Warm Parchment `#F0EBE3` | **3.29:1** | **FAIL** | PASS | Muted on card | ⚠ Large text only (≥24px or ≥18.66px bold) — or use for captions ≥14px only if the designer accepts the risk; otherwise swap to Warm Charcoal at reduced weight (`font-normal` instead of `font-medium`) |
| 4 | Taupe Mist `#8C7E78` | Ivory Cream `#FAF7F2` | **3.68:1** | **FAIL** | PASS | Muted on page | ⚠ Large text only. The base template's `text-[11px]` eyebrow labels and `text-xs` meta copy in this color **do not** meet AA normal. See Fix (a) below. |
| 5 | Mulberry Dusk `#6B3F5E` | Ivory Cream `#FAF7F2` | **7.72:1** | PASS | PASS | Primary accent on page | ✓ Use freely |
| 6 | Mulberry Dusk `#6B3F5E` | Warm Parchment `#F0EBE3` | **6.90:1** | PASS | PASS | Primary accent on card (e.g., b4 step-counter border on 401) | ✓ Use freely |
| 7 | Champagne Gold `#C9A96E` | Warm Parchment `#F0EBE3` | **1.93:1** | **FAIL** | **FAIL** | b4 step-counter numerals on card | ❌ **CRITICAL** — also fails the 3:1 UI threshold. See Fix (b) below. |
| 8 | Champagne Gold `#C9A96E` | Ivory Cream `#FAF7F2` | **2.16:1** | **FAIL** | **FAIL** | b3 eyebrow, b4 accent borders | ⚠ **Decorative only.** Safe for non-informational strokes (hairlines, step-border color). NOT safe for text or any informational glyph. |
| 9 | Dusty Rose `#D4A5A8` | Ivory Cream `#FAF7F2` | **1.96:1** | **FAIL** | **FAIL** | Hover tint, empty-state dot | ⚠ **Decorative only** (confirms brand YAML). Never use for text. Border hover tint at 55% opacity is fine (decorative). |
| 10 | Destructive Dusty Rose `#C0595A` | Ivory Cream `#FAF7F2` | **4.43:1** | **FAIL (borderline)** | PASS | Error copy | ⚠ Misses AA normal by 0.07. See Fix (c). |
| 11 | Destructive Dusty Rose `#C0595A` | Warm Parchment `#F0EBE3` | **3.96:1** | **FAIL** | PASS | Error copy on card | ⚠ Large-text only. |
| 12 | Ivory Cream `#FAF7F2` | Mulberry Dusk `#6B3F5E` | **7.72:1** | PASS | PASS | Button fg on primary bg | ✓ Use freely |
| 13 | Ivory Cream `#FAF7F2` | Destructive `#C0595A` | **4.43:1** | **FAIL (borderline)** | PASS | White text on error button (if used) | ⚠ See Fix (c) — widen the destructive bg to `#B04848` or use Warm Charcoal text on Destructive bg (ratio 3.87:1, large only — not recommended) |

### Critical fixes

**Fix (a) — Taupe Mist muted copy on Ivory/Parchment at small sizes:**
The base template's eyebrow (`text-[11px]`) and card meta (`text-xs`) in `text-[var(--muted-foreground)]` fail AA normal on both surfaces. For a single-user app where Don's wife has good vision, this is a judgment call, but the honest fix is one of:
- **Preferred:** Darken muted-foreground token to `#6F625C` (ratio ≈ 5.5:1 on parchment) — still reads as taupe, passes AA normal at all sizes. Requires a token adjustment coordinated with brand.
- **Acceptable:** Treat these labels as non-informational (decorative metadata) and keep the current token — but mark them with `aria-hidden="true"` and expose the same info via the card's `aria-label` (which is already true for pin count per §5 below).
- **Minimum:** Bump eyebrow to `text-[13px]` + `font-medium` and card meta to `text-[13px]` — large-text threshold is not reached but perceptual legibility improves. AA normal still fails, so this alone isn't compliant.

Recommend the UI designer picks option 1 or 2 explicitly and documents it in the rendition's comparison doc.

**Fix (b) — Champagne Gold step-counter numerals on Parchment (1.93:1):**
Don's "color pops" intent is preserved by splitting the treatment:
- **Numerals:** change from `text-[var(--accent)]` to `text-[var(--primary)]` (Mulberry Dusk on Parchment = **6.90:1** ✓). Numerals are informational — they communicate step number — so they must meet AA.
- **Accent border on the step-counter circle:** KEEP `border-[var(--accent)]/40` (Champagne Gold). This is decorative styling, not a UI component conveying state, so the 3:1 threshold doesn't apply to a tinted border. The gold pop survives.
- **401 vs 403 distinction preserved:** 401 keeps Mulberry Dusk border (per base §7 rule 5), 403 keeps Champagne Gold border. Numerals are Mulberry Dusk on both — color distinction migrates to the border only, which is fine because the icon glyph already carries the semantic differentiation.

This preserves Don's intent ("1 per screen max, 'color pops'") while making the numerals readable. **Base-template §7 rule 2 needs updating** — see section 6.

**Fix (c) — Destructive Dusty Rose borderline on Ivory Cream (4.43:1):**
0.07 short of AA normal. Two options:
- **Preferred:** darken destructive token to `#B04848` (ratio ≈ 5.45:1 on Ivory). Still warm, still non-jarring.
- **Acceptable:** use destructive color only for large-text headings (≥24px) and icons. Small error helper text uses Warm Charcoal + an icon prefix for semantic distinction. This is the pattern most mature design systems follow.

Recommend the UI designer picks option 1 (token adjustment) since b5 has small retryable-error copy that will look wrong in charcoal.

---

## 2. Per-story a11y inventory

### b3 — Pinterest pin grid

**Story:** `BoardDetailHeader` above a `PinGrid` of 8-12 `PinCard`s, infinite-scroll via `InfiniteScrollSentinel`.

#### Landmark structure

```html
<main aria-labelledby="board-title">
  <header data-component="BoardDetailHeader">
    <span class="eyebrow">Board</span>   <!-- aria-hidden decorative -->
    <h1 id="board-title"><!-- board name with italic accent word --></h1>
    <p><!-- pin count + last updated --></p>
  </header>
  <section data-component="PinGrid" aria-labelledby="board-title"
           aria-live="polite" aria-relevant="additions" aria-busy="false">
    <!-- PinCard[] -->
  </section>
  <div data-component="InfiniteScrollSentinel" aria-hidden="true"></div>
</main>
```

- `<main>` is the sole `main` landmark on the page.
- `<section>` is labeled by the h1 so screen readers announce "Your [boardname] pins, region".
- `aria-live="polite"` + `aria-relevant="additions"` on the grid so appended pages are announced without interrupting.
- `aria-busy="true"` while a page is fetching (toggle on the sentinel transition to `.fetching`).

#### Interactive elements

| Element | Role | Tag | ARIA | Focus treatment |
|---|---|---|---|---|
| Back-to-boards link | link | `<a href="/pinterest/boards">` | `aria-label="Back to boards"` | `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]` |
| PinCard | link | `<a href="https://pinterest.com/pin/{id}" target="_blank" rel="noopener noreferrer">` | `aria-label="{pin.title} — opens in Pinterest"` | Same ring pattern, applied to the `<a>` not the inner image |

`target="_blank"` requires the "opens in Pinterest" suffix in the aria-label (WCAG G201).

#### Decorative vs meaningful imagery

- **PinCard cover image:** `alt="{pin.title}"` (meaningful — title IS the image's alternate).
- **BoardDetailHeader Champagne Gold hairline:** `aria-hidden="true"`, rendered as a `<span>` with `background: var(--accent)` or a CSS `::before` decoration.
- **InfiniteScrollSentinel dot:** `aria-hidden="true"`. Fetching state is announced by the grid's `aria-live`, not the dot.

#### Touch target audit

- Back link: pad to `min-h-[44px] min-w-[44px] inline-flex items-center`. The arrow + text combo must meet 44px on the clickable bounding box.
- PinCard: entire card is the tap region (covers + title + meta), easily ≥44px. ✓
- No concerns.

#### Keyboard flow

Tab order: skip-link → back-link → PinCard[0] → PinCard[1] … → (no focusable sentinel).
- Enter on PinCard opens Pinterest in new tab.
- No arrow-key grid navigation required (simple tab-sequence grid, WCAG-compliant without a composite widget pattern).

#### Screen reader narrative (VoiceOver/NVDA on landing)

> "Nail Tech Assistant. Main landmark. Back to boards, link. Board. Your *Lunar abstracts* pins, heading level 1. 24 pins, updated 3 days ago. Your Lunar abstracts pins, region. Lunar gradient swirl, link, opens in Pinterest."

Reads cleanly. Region announcement happens once; subsequent tab moves only announce each pin's title.

---

### b4 — TokenInvalidView (401)

**Story:** Operator-facing remediation page. Single narrow column, icon glyph, Fraunces hero, numbered `RemediationSteps`.

#### Landmark structure

```html
<main>
  <section data-component="TokenInvalidView"
           role="status" aria-live="polite"
           aria-labelledby="token-invalid-heading">
    <svg data-role="disconnected-link-glyph" aria-hidden="true">...</svg>
    <h1 id="token-invalid-heading">Pinterest needs a <em>fresh token.</em></h1>
    <p><!-- one-sentence context --></p>
    <ol data-component="RemediationSteps"><!-- 4 steps --></ol>
  </section>
</main>
```

- `role="status"` + `aria-live="polite"` on the section wrapper (not on `<h1>` — live regions should wrap the content that announces, not a single heading, to avoid repeat announcements on DOM re-render).
- `aria-labelledby` ties the section to the h1.

#### Interactive elements

| Element | Role | Tag | ARIA | Focus treatment |
|---|---|---|---|---|
| "Pinterest developer dashboard" reference in step 1 | link | `<a class="link-action" href="https://developers.pinterest.com/..." target="_blank" rel="noopener noreferrer">` | `aria-label="Open Pinterest developer dashboard — opens in new tab"` | Underline-grow per §5e + `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]` |
| `PINTEREST_ACCESS_TOKEN` env-var reference | code | `<code>` | none — this is monospace inline content, not interactive | — |

Only one interactive element per step 1. Steps 2-4 are instructions, not interactive.

#### Landmark & heading hierarchy

- `<h1>` — "Pinterest needs a fresh token."
- Step numbers inside `<ol>` use `<li>` — no additional heading level. The semantic ordered-list IS the affordance; do not add `<h2>` per step.

#### Decorative vs meaningful imagery

- **Disconnected-link glyph:** `aria-hidden="true"`. The heading text already conveys "token is broken" — the glyph is reinforcement, not content. Do NOT give it an alt-equivalent.
- **Step-counter numerals:** visible text in `<li>`; no special ARIA. Screen readers announce "1 of 4, 2 of 4, …" natively.

#### Touch target audit

- "Pinterest developer dashboard" link: the underline-grow style makes this look text-like. Pad the `<a>` with `py-1` vertical to reach 44px tap height OR accept that this is a text-inline link where WCAG permits smaller targets (2.5.5 Target Size is AAA, not AA).
- Minimum: apply `inline-block py-1` on the `link-action` so the clickable area is ≥32px tall; full 44px isn't required at AA for inline text links.

#### Keyboard flow

Tab: skip-link → Pinterest dashboard link → (no further focusables in the view).
Enter activates the link (new tab).
Focus returns to document on tab-away. No focus trap needed; no modal.

#### Screen reader narrative

> "Nail Tech Assistant. Main landmark. Status. Pinterest needs a fresh token, heading level 1. Your Pinterest access token expired or was revoked. Reconnect in 4 steps. List, 4 items. 1. Open, Pinterest developer dashboard, link, opens in new tab. 2. Generate a fresh token. 3. Update PINTEREST_ACCESS_TOKEN in Vercel project settings. 4. Redeploy."

Reads cleanly. The `role="status"` ensures a mid-flow landing announces the heading without user tab input.

---

### b4 — InsufficientScopeView (403)

**Structurally identical to TokenInvalidView.** Only differences:

- Glyph: key-ring-with-missing-key (`aria-hidden="true"`).
- Heading: "Pinterest needs <em>broader access.</em>"
- Step 2 copy: "re-issue token with `boards:read` + `pins:read` scopes".
- Step-counter border color: Champagne Gold (per fix (b) above, numerals stay Mulberry Dusk).

Accessibility tree is identical — swapping icon + copy does not change ARIA structure. Screen reader narrative analogous to above.

**Distinguishability for sighted users** is carried by icon + heading + border color (3 signals). **For screen-reader users** it's carried by heading text alone, which is sufficient and explicit.

---

### b5 — Empty states & retryable errors

Three variants: `EmptyBoardsState`, `EmptyBoardState`, `BrowseErrorRetry`.

#### EmptyBoardsState / EmptyBoardState

```html
<main>
  <section data-component="EmptyBoardsState"
           role="status" aria-labelledby="empty-heading">
    <svg aria-hidden="true"><!-- pushpin glyph --></svg>
    <h1 id="empty-heading">No boards yet.</h1>
    <p><!-- one-line reassurance / next-step --></p>
    <a class="link-action" href="https://pinterest.com" target="_blank" rel="noopener noreferrer"
       aria-label="Open Pinterest to create your first board — opens in new tab">
      Open Pinterest
    </a>
  </section>
</main>
```

- `role="status"` (not `alert`) — this is informational, not urgent.
- Pushpin glyph + Dusty Rose dot: `aria-hidden="true"`.
- Link target same new-tab announcement pattern.

**Touch:** "Open Pinterest" link gets `inline-block min-h-[44px] px-4 py-3 rounded-[10px]` — this is the primary CTA on the page, give it button-sized tap region even though it's a semantic link.

#### BrowseErrorRetry

```html
<main>
  <section data-component="BrowseErrorRetry"
           role="alert" aria-labelledby="error-heading">
    <svg aria-hidden="true"><!-- warning glyph --></svg>
    <h1 id="error-heading">Couldn't load your boards.</h1>
    <p><!-- terse cause hint --></p>
    <button type="button"
            class="focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            aria-describedby="error-heading">
      Try again
    </button>
  </section>
</main>
```

- `role="alert"` — this IS interruption-worthy (a fetch just failed), so assertive announcement is correct.
- Retry is a `<button>` not a `<a>` because it re-runs the fetch in-place, not navigate.
- `aria-describedby` ties the button to the heading so SR users hear the context after "Try again, button".
- **Destructive color for the error heading text:** use fix (c) option 1 (darkened token `#B04848`) or keep Warm Charcoal for the heading and reserve destructive color for the inline glyph/stripe only.

#### Touch target audit (all b5)

- EmptyBoards/EmptyBoard CTA: 44×44 min ✓ (padded button-style link).
- BrowseErrorRetry button: `min-h-[44px] px-5 py-3` ✓.

#### Screen reader narratives

**EmptyBoardsState:**
> "Main. Status. No boards yet, heading level 1. Create your first board on Pinterest and it will appear here. Open Pinterest to create your first board, link, opens in new tab."

**BrowseErrorRetry:**
> "Alert. Couldn't load your boards, heading level 1. Network hiccup — the retry usually works. Try again, button, Couldn't load your boards."

---

## 3. Reduced-motion audit

Cross-reference of every animation class in `_base-template.md` §5 against the `prefers-reduced-motion: reduce` override in §5f.

| # | Class / selector | Defined §5 | Overridden §5f | Status |
|---|---|---|---|---|
| 1 | `.sk-v1` (skeleton shimmer, `animation: sk-sweep ...`) | 5a | `.sk-v1 { animation: none !important; }` | ✓ |
| 2 | `.sentinel.fetching` (breathe animation) | 5b | `.sentinel.fetching { animation: none !important; }` | ✓ |
| 3 | `.card` (transition: transform/border/shadow) | 5c | `.card { transition: none !important; }` | ✓ |
| 4 | `.card:hover` (transform/box-shadow) | 5c | `.card:hover { transform: none !important; box-shadow: none !important; }` | ✓ |
| 5 | `.card-enter` (stagger fade-in) | 5d | `.card-enter { animation: none !important; }` | ✓ |
| 6 | `.link-action` (color transition 180ms) | 5e | **NOT overridden** | ⚠ **GAP** |
| 7 | `.link-action::after` (width grow 220ms) | 5e | `.link-action::after { transition: none !important; width: 0 !important; }` | ✓ |
| 8 | b4 section mount fade-in (§7 rule 4, "quiet fade-in 240ms") | §7 | **NOT defined in §5, not overridden in §5f** | ⚠ **GAP** |

### Gaps

**Gap 1 — `.link-action` color transition:**
The parent `.link-action` has `transition: color 180ms ease;`. Color transitions are generally not vestibular-sensitive, but the strict interpretation of WCAG 2.3.3 Animation from Interactions (AAA) and the reduced-motion media query says "disable non-essential motion/transition." Add to §5f:

```css
@media (prefers-reduced-motion: reduce) {
  .link-action { transition: none !important; }
}
```

**Gap 2 — b4 section mount fade-in:**
§7 rule 4 says "ONLY a quiet fade-in on mount (240ms)" but there's no class defined or reduced-motion override. The ui-designer must define this class in b4 renditions AND include it in the reduced-motion block:

```css
.b4-mount-fade { animation: b4-fade-in 240ms ease-out both; }
@keyframes b4-fade-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .b4-mount-fade { animation: none !important; }
}
```

**Both gaps flagged for base-template correction — see section 6.**

---

## 4. Keyboard-only user journey

Complete tab-order walkthroughs. Assumes a skip-link exists at page top (if not already present app-wide, add one — `<a class="sr-only focus:not-sr-only" href="#main">Skip to content</a>`).

### b3 — Pinterest pin grid

1. `Tab` → skip-link visible, `Enter` → focus lands on `<main>`.
2. `Tab` → back-to-boards link (visible ring).
3. `Tab` → PinCard[0] (first pin). Enter opens Pinterest in new tab.
4. `Tab` × N → through all visible PinCards.
5. After last visible PinCard, `Tab` leaves `<main>` → browser chrome. **The sentinel is not tab-reachable** — pagination is triggered by scroll (IntersectionObserver). User can `PageDown`/`End` to reveal more cards; newly-mounted cards become tab-reachable after append. The `aria-live="polite"` on `PinGrid` announces the append.
6. `Shift+Tab` returns through the sequence.

**Escape:** none needed (no modal).

### b4 — TokenInvalidView / InsufficientScopeView

1. `Tab` → skip-link → `<main>`.
2. `Tab` → "Pinterest developer dashboard" link (visible ring, underline extends full-width on hover — for keyboard users it extends on focus too: add `focus-visible` selector to `.link-action::after`).
3. `Enter` → opens Pinterest dashboard in new tab.
4. `Shift+Tab` returns.

**Escape:** none (no modal, no trap).

**Important:** `.link-action::after` should include `focus-visible` as a trigger for the underline-grow so keyboard users get the same visual feedback as hover. Add to §5e:

```css
.link-action:focus-visible::after { width: 100%; }
```

(Base-template §5e currently only targets `:hover`. This is a keyboard-parity gap.)

### b5 — Empty / Retry

**EmptyBoardsState:**
1. Tab → skip-link → main.
2. Tab → "Open Pinterest" CTA. Enter opens new tab.

**BrowseErrorRetry:**
1. Tab → skip-link → main.
2. Tab → "Try again" button. Enter or Space activates retry.
3. On retry success, `aria-live` of the parent grid announces new content; focus stays on the button (which may be replaced by new DOM — if so, move focus to the grid heading programmatically via `tabindex="-1"` + `.focus()` to avoid focus-lost). **Flag for frontend-developer in story b5 implementation, not the wireframe itself.**

### One-handed-keyboard smoke test

All four stories pass the "can a user with a single hand on the keyboard navigate end-to-end?" check. No mouse-only affordances, no hover-only reveal of critical content, no drag interactions.

---

## 5. a11y-designer-checklist

The UI designer must tick each of the following items against every rendition before declaring it ready for Touchpoint 1 review.

1. **`<main>` wraps the primary content** — exactly one `<main>` per page, no nested `<main>`.
2. **h1 is present and unique** — one `<h1>` per rendition, matching the base template's hero pattern (Fraunces + italic accent span).
3. **Every BoardCard/PinCard has an `<a>` wrapping the entire card** with `aria-label="{title} — opens in Pinterest"` (pin) or `aria-label="{name} ({pinCount} pins)"` (board).
4. **PinCard/BoardCard cover image `alt` = the title text**, never empty, never "image of …".
5. **Decorative glyphs are `aria-hidden="true"`** — all b4 icons, b5 pushpin, eyebrow hairlines, sentinel dot, Dusty Rose decorative dots.
6. **Eyebrow labels in Taupe Mist at `text-[11px]` use `aria-hidden="true"`** OR the token is darkened per Fix (a). Document the choice in the rendition's `COMPARISON.md`.
7. **b4 step-counter numerals use Mulberry Dusk (`text-[var(--primary)]`), not Champagne Gold.** Champagne Gold survives only as border color on 403. (See Fix (b).)
8. **Destructive text on Ivory uses darkened token `#B04848`** OR is reserved for large-text headings only. (See Fix (c).)
9. **`aria-live="polite"` on `PinGrid` / `BoardGrid`** with `aria-relevant="additions"`.
10. **`role="status" aria-live="polite"` on `TokenInvalidView` / `InsufficientScopeView` / empty states.** `role="alert"` on `BrowseErrorRetry`.
11. **All focusable elements have `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`**, never `focus:` only.
12. **Touch targets ≥ 44×44px** — verified on back-link, empty-state CTA, retry button. Inline text links (`.link-action` in b4) may be smaller but must have ≥32px vertical tap area.
13. **New-tab links have `rel="noopener noreferrer"` + "opens in new tab" in `aria-label`.**
14. **`.link-action` underline-grow fires on `:focus-visible`, not just `:hover`.** (Keyboard parity — see §4.)
15. **`prefers-reduced-motion` block includes `.link-action`, `.b4-mount-fade` (if used), plus every class from §5a-e.** No animation class escapes the override.

---

## 6. Base-template §8 corrections

Flags to surface back to the base template authoring process. These do NOT require a re-sign-off — they are consistent with the spirit of §8 but need to be written into the template so future renditions don't drift.

1. **§7 rule 2 is inaccurate** — "One Champagne Gold accent per view — on the RemediationSteps step-counter numerals" fails AA contrast (1.93:1). **Update** rule 2 to: "One Champagne Gold accent per view — on the RemediationSteps step-counter **border** (403) or the `BoardDetailHeader` hairline (b3). Numerals are Mulberry Dusk on Warm Parchment for AA compliance."
2. **§5e is missing `:focus-visible`** — add `.link-action:focus-visible::after { width: 100%; }` for keyboard parity.
3. **§5f is missing two classes** — add reduced-motion overrides for `.link-action` and the b4 mount fade-in class.
4. **§8 should reference this a11y-spec** — add a one-liner: "See `_a11y-spec.md` for contrast matrix, per-story inventory, and the designer checklist."
5. **§8 does not address Taupe Mist muted-foreground failing AA normal on small text.** Either darken the token project-wide to `#6F625C` or scope the muted color to large-text / decorative metadata with `aria-hidden` on eyebrows. This is a brand-system-level decision that needs Don's call — flag at Touchpoint 1 review.
6. **§8 does not address the Destructive color AA borderline miss** (4.43:1). Recommend token adjustment to `#B04848`.

Corrections 1-3 are small textual updates. Corrections 4-6 are decisions that need Don's sign-off at review.

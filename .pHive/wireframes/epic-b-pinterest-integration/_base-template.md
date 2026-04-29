# Epic B Wireframe Base Template

**Purpose:** Consistency spine for all Epic B wireframes produced after b2. Every subsequent rendition (b3, b4, b5) MUST reuse the tokens, typography, motion, and annotation conventions defined here.

**Status:** authoritative — derived from b2 Touchpoint 1 approval on 2026-04-20.
**Base:** `claude-v2.html` layout + `claude-v1.html` shimmer keyframes.
**Fixes the 4 misses** flagged in `b2-pinterest-boards-grid/COMPARISON.md`.

---

## 1. Required preamble (paste verbatim into every rendition's `<head>`)

### 1a. Inline `:root` token block — **zero new hex allowed**

Copy the brand tokens verbatim. Pinterest renditions MUST NOT introduce any new hex (this was MISS 3 in the b2 comparison — `#e8dfd4`, `#dcd0c2`, `#d7cbbd` all slipped in and must not recur).

```css
:root {
  /* Brand — from app/globals.css (updated 2026-04-20 for AA contrast) */
  --background: #faf7f2; /* Ivory Cream — page */
  --foreground: #3d3530; /* Warm Charcoal — body */
  --card: #f0ebe3; /* Warm Parchment — raised surface (skeleton fill, too) */
  --primary: #6b3f5e; /* Mulberry Dusk */
  --primary-foreground: #faf7f2;
  --primary-tint: #d4a5a8; /* Dusty Rose — DECORATIVE ONLY (fails text contrast) */
  --accent: #c9a96e; /* Champagne Gold — DECORATIVE / border only (fails text contrast) */
  --muted: #f0ebe3;
  --muted-foreground: #6f625c; /* Taupe Mist (darkened from #8c7e78 — AA pass 5.5:1 on parchment) */
  --border: #8c7e78; /* Taupe Mist — 3:1 for dividers/borders (not text) */
  --destructive: #b04848; /* Crimson Dusk (darkened from #c0595a — AA pass 5.45:1 on ivory) */
  --ring: #6b3f5e;

  /* Breakpoints — use these, not random widths */
  --bp-sm: 375px; /* mobile */
  --bp-md: 768px; /* tablet */
  --bp-lg: 1024px; /* small desktop */
  --bp-xl: 1280px; /* desktop */

  --touch-target-min: 44px;
  --gradient-signature: linear-gradient(
    135deg,
    #e8d5e0 0%,
    #c9b4c9 40%,
    #d4a8b0 70%,
    #e8c9a0 100%
  );
}

html {
  background: var(--background);
  color: var(--foreground);
}

/* Body backdrop — the subtle warm radial from the dashboard */
body {
  background:
    radial-gradient(circle at top, rgb(212 165 168 / 0.18), transparent 35%),
    var(--background);
}
```

### 1b. Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

---

## 2. Typography scale (Fraunces + Inter)

Use these class patterns uniformly.

| Role                  | Element            | Class pattern                                                                           |
| --------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Page hero (h1)        | `<h1>`             | `font-['Fraunces'] font-light text-4xl md:text-5xl tracking-[-0.03em] leading-[1.05]`   |
| Page hero accent word | `<span>` inside h1 | `italic text-[var(--primary)]`                                                          |
| Section heading (h2)  | `<h2>`             | `font-['Fraunces'] font-light text-2xl tracking-[-0.02em]`                              |
| Body                  | paragraph          | `font-['Inter'] text-sm leading-6 text-[var(--muted-foreground)]`                       |
| Eyebrow label         | `<span>`           | `font-['Inter'] uppercase text-[11px] tracking-[0.28em] text-[var(--muted-foreground)]` |
| Card title            | `<h3>` inside card | `font-['Fraunces'] font-medium text-lg leading-snug line-clamp-2`                       |
| Card meta             | `<p>` inside card  | `font-['Inter'] text-xs text-[var(--muted-foreground)]`                                 |

**Pattern:** Hero h1 always uses Fraunces italic for a one-word accent: "Your <em>boards.</em>", "Your <em>pins.</em>", "Token <em>invalid.</em>"

---

## 3. Layout rhythm (from claude-v2)

- **Max container width:** `max-w-6xl mx-auto px-6 md:px-8`
- **Hero top margin:** `pt-16 md:pt-20` (anchors the screen like the dashboard)
- **Hero to grid gap:** `mt-12`
- **Grid columns (boards / pins / any Epic B card grid):**
  - mobile: 1 col
  - sm (≥640): 2 cols
  - lg (≥1024): 3 cols (this is the editorial default from claude-v2)
  - xl (≥1280): 3 cols (stay at 3 — density was v1's signature; we chose v2)
- **Grid gap:** `gap-6 md:gap-8` (24-32px)
- **Cards:** `rounded-[28px]`, padding `p-4 md:p-5`, background `bg-[var(--card)]`, border `border border-transparent` (becomes `border-[var(--primary-tint)]/40` on hover)
- **Card cover aspect:** 1:1 (square) for boards (b2), 4:5 (portrait) for pins (b3)

---

## 4. `data-component` annotation convention (fixes MISS 2)

Every rendition MUST mark React component boundaries with `data-component` so developers map HTML → `.tsx` without guessing class strings.

Conventions used:

| Story   | Wireframe element                    | `data-component` value   |
| ------- | ------------------------------------ | ------------------------ |
| b2      | boards grid container                | `BoardGrid`              |
| b2      | a board tile                         | `BoardCard`              |
| b2      | the skeleton fallback                | `BoardGridSkeleton`      |
| b2      | the infinite scroll trigger          | `InfiniteScrollSentinel` |
| b2 / b3 | inline 401/403 placeholder (minimal) | `TokenPlaceholderInline` |
| b3      | pins grid container                  | `PinGrid`                |
| b3      | a pin tile                           | `PinCard`                |
| b3      | pins skeleton                        | `PinGridSkeleton`        |
| b3      | board detail header                  | `BoardDetailHeader`      |
| b4      | 401 page-level                       | `TokenInvalidView`       |
| b4      | 403 page-level                       | `InsufficientScopeView`  |
| b4      | shared ordered-steps component       | `RemediationSteps`       |
| b5      | empty boards                         | `EmptyBoardsState`       |
| b5      | empty board                          | `EmptyBoardState`        |
| b5      | retryable browse error               | `BrowseErrorRetry`       |

Usage in wireframe: `<section data-component="PinGrid" class="...">...</section>`.

---

## 5. Motion spec (the shimmer + "pops of fun")

### 5a. Skeleton shimmer — from claude-v1.html (applies to b2, b3, b4-loading)

```css
.sk-v1 {
  background:
    linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.45) 50%,
      rgba(255, 255, 255, 0) 70%
    ),
    var(--card); /* NOT #e8dfd4 — brand token only */
  background-size: 220% 100%;
  background-position: 120% 0;
  animation: sk-sweep 2.6s ease-in-out infinite;
}
@keyframes sk-sweep {
  0% {
    background-position: 120% 0;
  }
  100% {
    background-position: -120% 0;
  }
}
```

**Scope of shimmer:**

- b2 `BoardGridSkeleton` (6 skeleton cards above fold)
- b3 `PinGridSkeleton` (8-12 skeleton tiles)
- b4 `TokenRemediationLoadingSkeleton` (only the loading sliver BEFORE `TokenInvalidView` / `InsufficientScopeView` resolves — shimmer is NOT on the remediation content itself)

### 5b. Sentinel breathe (for infinite scroll sentinel — quiet dot)

```css
.sentinel {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-tint);
  opacity: 0.55;
}
.sentinel.fetching {
  animation: breathe 2.2s ease-in-out infinite;
}
@keyframes breathe {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.25);
  }
}
```

### 5c. Card hover lift + border tint

```css
.card {
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
  border: 1px solid transparent;
}
.card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--primary-tint) 55%, transparent);
  box-shadow: 0 8px 24px -12px
    color-mix(in oklab, var(--primary) 20%, transparent);
}
```

### 5d. Stagger fade-in on append (for IntersectionObserver-appended pages)

When a new page of boards/pins is appended, newly-mounted cards enter with a staggered fade-in + 4px upward translate. Stagger 40ms between cards, total envelope ≤ 320ms.

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.card-enter {
  animation: card-enter 260ms ease-out both;
}
/* Stagger is JS-driven: each newly-appended card sets animation-delay: ${i * 40}ms */
```

### 5e. Button micro-interaction (for b4 remediation — "Open Pinterest Dashboard" link etc.)

Quiet underline grow on hover, no bounce:

```css
.link-action {
  position: relative;
  color: var(--primary);
  text-decoration: none;
  transition: color 180ms ease;
}
.link-action::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  height: 1px;
  width: 0;
  background: currentColor;
  transition: width 220ms ease;
}
.link-action:hover::after,
.link-action:focus-visible::after {
  width: 100%;
} /* keyboard parity — corrected 2026-04-20 */
```

### 5f. `prefers-reduced-motion` — non-negotiable

```css
@media (prefers-reduced-motion: reduce) {
  .sk-v1,
  .sentinel.fetching,
  .card-enter,
  .b4-mount-fade {
    animation: none !important;
  }
  .card {
    transition: none !important;
  }
  .card:hover {
    transform: none !important;
    box-shadow: none !important;
  }
  .link-action {
    transition: none !important;
  } /* added 2026-04-20 */
  .link-action::after {
    transition: none !important;
    width: 0 !important;
  }
  .b4-mount-fade {
    opacity: 1 !important;
    transform: none !important;
  } /* added 2026-04-20 */
}
```

Every rendition includes this block. No exceptions.

---

## 6. "Pops of fun" scope (Don's call, 2026-04-20)

**Motion pops** (all shown above): hover lifts, shimmer, sentinel breathe, stagger fade-in on append, button underline grow.

**Color pops** (use sparingly, 1 per screen max):

- b3: a small Champagne Gold **hairline** above the `BoardDetailHeader` title (a 1px line, decorative). Eyebrow "Board" stays Warm Charcoal at reduced weight for AA compliance (NOT Champagne Gold — fails text contrast at 2.16:1).
- b4: The step-counter circles inside `RemediationSteps`:
  - **Numerals (text):** `text-[var(--primary)]` — Mulberry Dusk on Parchment = 6.90:1 ✓
  - **Border (decorative):** `border-[var(--accent)]/40` on 403 (Champagne Gold) / `border-[var(--primary)]/40` on 401 (Mulberry Dusk)
  - Gold pop survives on the 403 border only; icon glyph + border color carry the 401/403 distinction.
- b5 (empty states): primary-tint (Dusty Rose) dot decoration on the glyph (decorative, non-informational).

**Illustration pops**:

- b4 icon glyph — one restrained vector glyph above the heading, inheriting `stroke: currentColor`. NOT a full illustration scene.
  - `TokenInvalidView`: a disconnected-link glyph (two broken chain rings) — signals "the connection is broken, rotate the token"
  - `InsufficientScopeView`: a key-ring-with-missing-key glyph — signals "you have a key but it doesn't open this door, re-scope it"
- b5 empty-boards: a minimal pushpin glyph + dashed-line board outline, Fraunces "No boards yet." below
- b5 empty-board: same pushpin glyph, copy shifts to "This board is empty."

All glyphs: 40x40px, `stroke: var(--muted-foreground)`, `stroke-width: 1.5`, `fill: none`. Keep them quiet.

---

## 7. b4 Option C tone (operator-facing remediation views)

Option C, confirmed 2026-04-20 by Don. Rules:

1. **Keep** Fraunces hero + Inter body + page-centered max-w-xl container layout (brand cohesion with browse).
2. **One** Champagne Gold accent per view — on the `RemediationSteps` step-counter **border** (403 only). Numerals themselves are Mulberry Dusk on both 401 and 403 for AA compliance. _(Corrected 2026-04-20 from earlier "numerals in Champagne Gold" — that combo fails contrast at 1.93:1.)_
3. **One** icon glyph above the heading (disconnected-link for 401, key-ring for 403).
4. **Motion dialed down**: ONLY a quiet fade-in on mount using `.b4-mount-fade` (240ms, `opacity 0→1` + 6px translateY). NO shimmer on remediation content, NO stagger. Shimmer exists in the loading sliver that precedes, not in the remediation view itself.
5. **401 vs 403 must look visibly distinct** so you can tell them apart at a glance — distinct icon + distinct **border color** on the step-counter circle (401 = Mulberry Dusk border, 403 = Champagne Gold border). Numerals identical (Mulberry Dusk). Layout identical.
6. **Copy is terse** — Fraunces heading, one Inter sentence, then a numbered ordered list. Per cycle-state decision `dd-q5`: "terse + Pinterest developer dashboard reference + direct 'update Vercel env' steps. Wife-test readability is the bar."

Heading copy:

- 401 `TokenInvalidView`: "Pinterest needs a <em>fresh token.</em>"
- 403 `InsufficientScopeView`: "Pinterest needs <em>broader access.</em>"

Step copy (from story b4 spec):

- 401 steps: "Open Pinterest developer dashboard → generate fresh token → update `PINTEREST_ACCESS_TOKEN` in Vercel project settings → redeploy"
- 403 steps: "Open Pinterest developer dashboard → re-issue token with `boards:read` + `pins:read` scopes → update `PINTEREST_ACCESS_TOKEN` in Vercel → redeploy"

---

## 8. Accessibility spine (non-negotiable)

**Authoritative reference:** `_a11y-spec.md` (contrast matrix, per-story inventory, keyboard journey, 15-point designer checklist). This section is the summary; the a11y-spec is the detail.

- Contrast ≥ 4.5:1 for body text on `var(--card)` — Warm Charcoal on Warm Parchment is 9.73:1 ✓
- Every card is a single focusable region: `<a>` wrapping the card OR `<button>` with proper `aria-label`. `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`.
- Touch targets ≥ 44×44px (apply `min-h-[var(--touch-target-min)]` on interactive elements).
- `aria-live="polite"` + `aria-relevant="additions"` on `BoardGrid` / `PinGrid` so screen readers announce pagination appends without interrupting.
- `aria-busy="true"` on the grid while a page is fetching (toggled with `.sentinel.fetching`).
- `aria-hidden="true"` on decorative glyphs (b4 icon, b5 pushpin, eyebrow hairlines, sentinel dot, Dusty Rose dots).
- `BoardCard` / `PinCard` image: `alt` is the board/pin title (meaningful content), NOT an empty alt.
- `TokenInvalidView` / `InsufficientScopeView`: `role="status"` + `aria-live="polite"` on the section wrapper (not the `<h1>`) + `aria-labelledby` tying to the heading.
- `BrowseErrorRetry`: `role="alert"` (not `status`) — retryable failures warrant immediate attention.
- **Motion contract:** All spec references live in `_animations-spec.md`. Every animation class MUST have a `prefers-reduced-motion: reduce` override (§5f). No exceptions.

---

## 9. Output convention

Each rendition:

- One self-contained `.html` file per rendition (no external CSS/JS except Tailwind CDN for dev convenience).
- All three breakpoints (375 / 768 / 1280) stacked in the same file with a small label above each.
- `data-component` annotations on every component root.
- `:root` block + motion spec + reduced-motion block pasted verbatim from this template.
- A companion `COMPARISON.md` per story folder if multiple renditions are produced, following the b2 format.

Save paths:

- `.pHive/wireframes/epic-b-pinterest-integration/b3-pinterest-pin-grid/{v1,v2,v3}.html`
- `.pHive/wireframes/epic-b-pinterest-integration/b4-token-invalid-view/{v1,v2,v3}.html`
- `.pHive/wireframes/epic-b-pinterest-integration/b4-insufficient-scope-view/{v1,v2,v3}.html`
- `.pHive/wireframes/epic-b-pinterest-integration/b5-polish-and-smoke/{v1[,v2]}.html` (lighter touch)

---

## 10. What NOT to do

- ❌ Do NOT introduce new hex colors. Brand palette only.
- ❌ Do NOT use Radix / shadcn primitives in the wireframes (Tailwind-first per `dd-q3`).
- ❌ Do NOT render a masonry grid. Uniform grid per `dd-q1`.
- ❌ Do NOT use a load-more button. Infinite-scroll sentinel per `dd-q2`.
- ❌ Do NOT omit `data-component` annotations. MISS 2 must not recur.
- ❌ Do NOT shimmer the b4 remediation content itself — only the loading skeleton that precedes it.
- ❌ Do NOT make 401 and 403 look identical — distinct icon + accent-color on step counter per Option C rule 5.
- ❌ Do NOT place text overlays on `BoardCard` / `PinCard` images. Title below the cover.

---

Authoritative. If in doubt, fall back to claude-v2.html (layout) + claude-v1.html (shimmer) as the reference pair.

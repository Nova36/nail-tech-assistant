---
story_id: b3-pinterest-pin-grid
agent: ui-designer
timestamp: 2026-04-27T00:00:00Z
status: authoritative
sources:
  - state/wireframes/epic-b-pinterest-integration/b3-pinterest-pin-grid/v2.html
  - state/wireframes/epic-b-pinterest-integration/_animations-spec.md
  - state/wireframes/epic-b-pinterest-integration/_a11y-spec.md
  - state/design/briefs/pinterest-boards-grid.md (b2 — for visual continuity)
---

# /pinterest/[boardId] Pin Grid — Developer Brief

## TL;DR

Build the `/pinterest/[boardId]` route as a streaming server component: `<Suspense fallback={<PinGridSkeleton/>}>` delivers a shimmer skeleton, then resolves to `PinGrid` with `InfiniteScrollSentinel`-driven append. Every color and spacing value must resolve to a CSS custom property from `app/globals.css` — zero hardcoded hex. The `InfiniteScrollSentinel` is REUSED from b2 with zero modification; `PinGridSkeleton`'s `.sk-v1` shimmer is copied verbatim from `BoardGridSkeleton`. Invalid `boardId` calls `notFound()` (never `throw`) and renders `not-found.tsx` at the `(authenticated)/pinterest/` parent segment.

---

## Component inventory + data-component attributes

| Component              | File                                                         | data-component             | Role                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| BoardDetailHeader      | `components/pinterest/BoardDetailHeader.tsx`                 | `"BoardDetailHeader"`      | server-renderable; back-link + eyebrow "Board" label + Champagne Gold hairline + `<h1>` board name + meta (pin count + last updated)              |
| PinGrid                | `components/pinterest/PinGrid.tsx`                           | `"PinGrid"`                | client; receives initial `items` + `nextBookmark` from server; manages append state; renders `PinCard[]` + `InfiniteScrollSentinel`               |
| PinCard                | `components/pinterest/PinCard.tsx`                           | `"PinCard"`                | client; `next/image` square cover (1:1, `object-cover`) + pin title BELOW cover in `p-5` info area; wrapped in `<a target="_blank">` to Pinterest |
| PinGridSkeleton        | `components/pinterest/PinGridSkeleton.tsx`                   | `"PinGridSkeleton"`        | server-renderable Suspense fallback; 9 placeholder tiles (3×3) with `.sk-v1` shimmer; `aria-busy="true"` on wrapper                               |
| InfiniteScrollSentinel | `components/pinterest/InfiniteScrollSentinel.tsx`            | `"InfiniteScrollSentinel"` | REUSED FROM b2 — zero changes; props: `bookmark \| isFetching \| onTrigger`                                                                       |
| TokenPlaceholderInline | inline in `app/(authenticated)/pinterest/[boardId]/page.tsx` | `"TokenPlaceholderInline"` | minimal 401/403 inline placeholder (same pattern as b2 boards page; b4 upgrades to styled views)                                                  |
| BoardNotFound          | `app/(authenticated)/pinterest/not-found.tsx`                | `"BoardNotFound"`          | renders when `notFound()` is called for invalid board IDs — at PARENT segment so user stays inside authenticated shell                            |

---

## Layout (extracted from v2.html)

**Page shell (matches b2 max-width and padding):**

- Outer container: `mx-auto max-w-6xl`
- Horizontal padding: `px-6` (desktop/tablet), `px-5` (mobile)
- Vertical padding: `pt-20 pb-12` (desktop), `pt-16 pb-10` (tablet), `pt-12 pb-8` (mobile)

**BoardDetailHeader (above the grid):**

- Back link: `<a href="/pinterest" class="back-link">` with left-chevron SVG (`aria-hidden="true"`) + "All boards" label; `min-height: var(--touch-target-min)` (44px); color `var(--muted-foreground)`, transitions to `var(--foreground)` on hover; `transition: color 180ms ease`
- Eyebrow: `text-[11px] tracking-[0.28em] uppercase` in `var(--muted-foreground)` + `aria-hidden="true"`; text: "Board"
- Champagne Gold hairline: `display: block; width: 56px; height: 1px; background: var(--accent)` + `aria-hidden="true"`; placed between eyebrow and `<h1>`; `mb-5` below hairline
- Hero heading `<h1 id="board-title">`: Fraunces, `text-6xl font-light tracking-[-0.03em] leading-[0.98]` (desktop), `text-5xl` (tablet), `text-4xl` (mobile); italic accent word in `var(--primary)`
- Meta line: `text-sm leading-6 mt-5 max-w-lg` in `var(--muted-foreground)`; content: "{N} pins · updated {X} days ago."
- Wrapper margin below header: `mb-14` (desktop), `mb-10` (tablet), `mb-8` (mobile)
- `animation: view-settle 280ms ease-out both` on mount (extracted from `_animations-spec.md §4b`)

**PinGrid:**

- Desktop (`lg`, 1280px): `grid grid-cols-3 gap-8`
- Tablet (`md`, 768px): `grid grid-cols-2 gap-6` (or 3 cols at wider tablet — default 2)
- Mobile (`sm`, 375px): `grid grid-cols-2 gap-4`
- `<ul role="list">` with `<li>` wrapping each `PinCard`
- `aria-live="polite"` + `aria-relevant="additions"` + `aria-busy="false"` on the `<section>` wrapper (toggled to `"true"` during sentinel fetch)
- `aria-labelledby="board-title"` on the grid section

**PinCard:**

- Cover: `aspect-square` (1:1); `next/image` fills slot with `object-cover`; `rounded-t-[28px]` (top corners)
- Card shell: `rounded-[28px] bg-card overflow-hidden border border-transparent`; `box-shadow: 0 12px 32px rgba(61,53,48,0.08)`
- Info area: `p-5` padding
- Pin title: Fraunces, `text-lg font-medium leading-snug line-clamp-2`; in `var(--foreground)`; placed BELOW cover, never overlaid
- Hover: `transform: translateY(-2px)` + `border-color: color-mix(in oklab, var(--primary-tint) 55%, transparent)` + `box-shadow: 0 8px 24px -12px color-mix(in oklab, var(--primary) 20%, transparent)`; `transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease`
- Focus-visible ring: `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]` on the `<a>` element
- `min-height: 44px` on card (touch target; entire card far exceeds minimum)
- Full card is the tap region via the `<a>` wrapper

**PinGridSkeleton:**

- 9 placeholder tiles (same `pin-card` shell: `rounded-[28px]`, `bg-card`, box-shadow)
- Cover: `aspect-square` + `.sk-v1`
- Title line: `h-4 rounded-full` with width variants (`w-3/4`, `w-2/3`, `w-4/5`, `w-3/5`) + `.sk-v1`
- Lines spaced with `space-y-2` inside `p-5`
- `aria-hidden="true"` on each `<article>` skeleton tile; `aria-busy="true"` on the `<section data-component="PinGridSkeleton">` wrapper

**InfiniteScrollSentinel (same as b2):**

- 10×10px circle: `width: 10px; height: 10px; border-radius: 50%; background: var(--primary-tint); opacity: 0.55`
- Centered below grid: `flex justify-center`; margin above: `mt-16`
- Adds `.fetching` class while fetch in-flight → triggers `breathe` animation
- `aria-hidden="true"` at all times

**TokenPlaceholderInline (401/403):**

- Same pattern as b2 boards page — `max-w-md mx-auto text-center rounded-[28px] bg-card p-12` with dashed border `rgb(107 63 94 / 0.5)`
- 401: Fraunces `text-3xl font-light` — "Pinterest is _paused._"; copy: "Your access token needs to be replaced. Update `PINTEREST_ACCESS_TOKEN` in your Vercel project settings."
- 403: same style — "Pinterest needs _broader access._"; copy: "Your Pinterest token lacks required scopes. Update `PINTEREST_ACCESS_TOKEN` with `boards:read` + `pins:read` scopes."
- Server-rendered; no animation

**BoardNotFound (`not-found.tsx`):**

- Terse copy: Fraunces `text-4xl font-light` — "Board not found."
- Subtext `text-sm text-muted-foreground`: "This board doesn't exist or is no longer accessible."
- Back link: `<a href="/pinterest">` styled as `.back-link` — "Back to boards"
- Lives at `app/(authenticated)/pinterest/not-found.tsx` (parent segment, NOT `[boardId]/not-found.tsx`)

---

## Color + typography (BRAND TOKENS ONLY — no new hex)

All values resolve through `app/globals.css` `:root` block. The Tailwind `@theme inline` block maps these to utility classes.

| Surface                               | CSS variable                   | Resolved hex    | Tailwind utility                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page background                       | `var(--background)`            | `#faf7f2`       | `bg-background`                                                                                                                                                                                                                                    |
| Pin card background                   | `var(--card)`                  | `#f0ebe3`       | `bg-card`                                                                                                                                                                                                                                          |
| **Skeleton fill**                     | `var(--card)`                  | `#f0ebe3`       | `.sk-v1` base (NOT a new hex)                                                                                                                                                                                                                      |
| Foreground / pin title text           | `var(--foreground)`            | `#3d3530`       | `text-foreground`                                                                                                                                                                                                                                  |
| Muted text (eyebrow, meta, back link) | `var(--muted-foreground)`      | `#6f625c`       | `text-muted-foreground`                                                                                                                                                                                                                            |
| Primary accent (italic heading word)  | `var(--primary)`               | `#6b3f5e`       | `text-primary`                                                                                                                                                                                                                                     |
| Champagne Gold hairline (decorative)  | `var(--accent)`                | `#d4a5a8`       | Note: `app/globals.css` maps `--accent` to Dusty Rose `#d4a5a8`. Champagne Gold (`#c9a96e`) lives at `var(--color-accent)`. The hairline `background: var(--color-accent)` uses the semantic Champagne Gold correctly — confirm in implementation. |
| Focus ring                            | `var(--ring)`                  | `#6b3f5e`       | `ring-[var(--ring)]`                                                                                                                                                                                                                               |
| Sentinel dot                          | `var(--primary-tint)`          | `#d4a5a8`       | inline style                                                                                                                                                                                                                                       |
| Hover border tint                     | Dusty Rose semi-transparent    | decorative only | `color-mix(in oklab, var(--primary-tint) 55%, transparent)`                                                                                                                                                                                        |
| Placeholder dashed border             | Mulberry Dusk semi-transparent | decorative only | `rgb(107 63 94 / 0.5)`                                                                                                                                                                                                                             |

**Token discipline reminder (from b2 brief — same rules apply):** zero new hex values. Skeleton fill = `var(--card)`. Eyebrow `text-[11px]` in `var(--muted-foreground)` at `#6f625c` passes AA normal (≥5.5:1 on parchment after the 2026-04-20 token darkening). Use `aria-hidden="true"` on the eyebrow regardless (informational equivalent is in the `<h1>` and its `aria-labelledby` chain).

---

## Typography hierarchy

Fonts: Fraunces (display/headings) + Inter (body). Load via existing font setup in the authenticated layout.

| Role                     | Font            | Size              | Weight             | Tracking                      | Line height                 |
| ------------------------ | --------------- | ----------------- | ------------------ | ----------------------------- | --------------------------- |
| Board title h1 (desktop) | Fraunces        | `text-6xl` (60px) | `font-light` (300) | `tracking-[-0.03em]`          | `leading-[0.98]`            |
| Board title h1 (tablet)  | Fraunces        | `text-5xl` (48px) | `font-light`       | `tracking-[-0.03em]`          | default                     |
| Board title h1 (mobile)  | Fraunces        | `text-4xl` (36px) | `font-light`       | `tracking-[-0.03em]`          | default                     |
| Italic accent span       | Fraunces italic | inherits          | inherits           | —                             | —                           |
| Pin card title           | Fraunces        | `text-lg` (18px)  | `font-medium`      | —                             | `leading-snug line-clamp-2` |
| Eyebrow label            | Inter           | `text-[11px]`     | normal             | `tracking-[0.28em]`           | —                           |
| Meta / pin count         | Inter           | `text-sm` (14px)  | normal             | —                             | `leading-6`                 |
| Back link label          | Inter           | `text-[12px]`     | normal             | `tracking-[0.14em] uppercase` | —                           |
| Placeholder heading      | Fraunces        | `text-3xl` (30px) | `font-light`       | `tracking-[-0.02em]`          | —                           |
| Placeholder body         | Inter           | `text-sm` (14px)  | normal             | —                             | `leading-6`                 |

---

## Motion (from `_animations-spec.md` §4)

### BoardDetailHeader mount entrance

```css
/* Per _animations-spec.md §4b */
[data-component='BoardDetailHeader'] {
  animation: view-settle 280ms ease-out both;
}

@keyframes view-settle {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### PinGridSkeleton shimmer — `.sk-v1` (PASTE verbatim from `BoardGridSkeleton.tsx`)

Apply ONLY to `PinGridSkeleton`. Never on `PinCard` content, `TokenPlaceholderInline`, or any resolved-content surface.

```css
/* Scoped to PinGridSkeleton per _animations-spec.md §4b + audit check #5 */
[data-component='PinGridSkeleton'] .sk-v1 {
  background:
    linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.45) 50%,
      rgba(255, 255, 255, 0) 70%
    ),
    var(--card); /* brand token, NOT any hardcoded hex */
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

### PinCard hover

```css
/* Per _animations-spec.md §4b */
[data-component='PinCard'] {
  transition:
    transform 220ms ease,
    border-color 220ms ease,
    box-shadow 220ms ease;
  border: 1px solid transparent;
}
[data-component='PinCard']:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--primary-tint) 55%, transparent);
  box-shadow: 0 8px 24px -12px
    color-mix(in oklab, var(--primary) 20%, transparent);
}
```

### Skeleton-to-content fade + IO-triggered append stagger

When `<Suspense>` resolves and `PinGrid` mounts, initial cards use `card-enter`. When sentinel fires and new cards append, apply `.card-enter` + inline `animation-delay` per card:

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
```

```js
// In PinGrid client component, after appending new items:
// Per _animations-spec.md §4d — stagger pattern
newCards.forEach((card, i) => {
  card.style.animationDelay = `${Math.min(i * 40, 320)}ms`;
  card.classList.add('card-enter');
});
```

Increment: 40ms. Envelope cap: 320ms (clamp with `Math.min`). A page of 9 cards at 40ms lands at exactly 320ms — do not exceed. This is the diagonal-wipe cascade that makes new-page loads feel composed.

### InfiniteScrollSentinel breathe

```css
/* Reused from b2 — identical; per _animations-spec.md §4b */
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
[data-component='InfiniteScrollSentinel'] .sentinel.fetching {
  animation: breathe 2.2s ease-in-out infinite;
}
```

### Reduced-motion block (per `_animations-spec.md §4e`)

```css
@media (prefers-reduced-motion: reduce) {
  [data-component='BoardDetailHeader'] {
    animation: none !important;
  }
  [data-component='PinGridSkeleton'] .sk-v1 {
    animation: none !important;
    background: var(--card);
  }
  [data-component='PinCard'] {
    transition: none !important;
  }
  [data-component='PinCard']:hover {
    transform: none !important;
    box-shadow: none !important;
  }
  [data-component='PinCard'].card-enter {
    animation: none !important;
  }
  [data-component='InfiniteScrollSentinel'] .sentinel.fetching {
    animation: none !important;
  }
  .back-link {
    transition: none !important;
  }
}
```

Behavior under reduced-motion: header and cards mount instantly, skeleton is static `var(--card)` fill, sentinel is static dot at 0.55 opacity. No content is hidden — only motion is removed.

---

## Accessibility (from `_a11y-spec.md §b3`)

### Landmark structure

```html
<main aria-labelledby="board-title">
  <header data-component="BoardDetailHeader">
    <a href="/pinterest" aria-label="Back to boards" class="back-link ..."
      >...</a
    >
    <p aria-hidden="true" class="... uppercase">Board</p>
    <span class="gold-hairline" aria-hidden="true"></span>
    <h1 id="board-title">
      Soft Mauve &amp;
      <em class="italic" style="color: var(--primary)">Chrome.</em>
    </h1>
    <p class="text-sm ... text-muted-foreground">
      47 pins · updated 3 days ago.
    </p>
  </header>

  <section
    data-component="PinGrid"
    aria-labelledby="board-title"
    aria-live="polite"
    aria-relevant="additions"
    aria-busy="false"
  >
    <ul role="list">
      <!-- PinCard[] as <li> children -->
    </ul>
  </section>

  <div data-component="InfiniteScrollSentinel" aria-hidden="true"></div>
</main>
```

### Interactive elements

| Element             | Tag                                                                                   | ARIA                                            | Focus treatment                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Back-to-boards link | `<a href="/pinterest">`                                                               | `aria-label="Back to boards"`                   | `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`; `border-radius: 6px` on outline |
| PinCard             | `<a href="https://pinterest.com/pin/{id}" target="_blank" rel="noopener noreferrer">` | `aria-label="{pin.title} — opens in Pinterest"` | Same ring pattern on the `<a>`, not on inner image                                                                                                                 |

- `target="_blank"` requires the "opens in Pinterest" suffix in `aria-label` (WCAG G201).
- PinCard cover image: `alt="{pin.title}"` (meaningful).
- Gold hairline + eyebrow + sentinel dot: `aria-hidden="true"`.
- `aria-busy="true"` on `PinGrid` while sentinel fetch is in-flight; reset to `"false"` on completion.

### Keyboard flow (per `_a11y-spec.md §4 b3`)

Tab order: skip-link → back-link → `PinCard[0]` → `PinCard[1]` … → (sentinel is not focusable).

- Enter on PinCard opens Pinterest in new tab.
- Newly-appended cards become tab-reachable after append; `aria-live` announces the addition.
- No arrow-key grid navigation required (simple tab-sequence, WCAG-compliant without composite widget).

### Touch targets

- Back link: `min-height: var(--touch-target-min)` (44px) via `inline-flex items-center`.
- PinCard: entire card is tap region — far exceeds 44×44px.

---

## Test breakpoint matrix

| Breakpoint | Width  | Grid columns | Card aspect | Notes            |
| ---------- | ------ | ------------ | ----------- | ---------------- |
| sm         | 375px  | 2            | 1:1         | mobile; `gap-4`  |
| md         | 768px  | 2            | 1:1         | tablet; `gap-6`  |
| lg         | 1280px | 3            | 1:1         | desktop; `gap-8` |

Tailwind responsive grid:

```html
<ul class="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 ..."></ul>
```

Breakpoint tokens from `app/globals.css`: `--breakpoint-md: 48rem` (768px), `--breakpoint-lg: 64rem` (1024px). Use `md:` and `lg:` prefixes accordingly. Test at exactly 375 / 768 / 1280 — not at wireframe preview widths.

---

## Pin cover image variant fallback (researcher HIGH risk)

Pinterest `media.images` uses dimension-string keys (`'600x'`, `'400x300'`, `'150x150'`, `'1200x'`); NOT all variants are guaranteed across creative types. `PinCard` MUST implement a fallback chain:

1. `media.images['600x']?.url`
2. `media.images['400x300']?.url`
3. `media.images['150x150']?.url`
4. First available: `Object.values(media.images)[0]?.url`
5. Placeholder data URI — mirror `BoardCard`'s `COVER_DATA_URI` fallback pattern from b2

Log a `console.warn` if fallback past step 2 is triggered — silent fallbacks cost debugging time (per project convention).

---

## Reuse from b2 (developer leverage — DO NOT reinvent)

- `InfiniteScrollSentinel` — ZERO changes; props are `bookmark | isFetching | onTrigger`
- `.sk-v1` shimmer keyframes — paste the exact CSS block from `BoardGridSkeleton.tsx`; scope it to `[data-component='PinGridSkeleton'] .sk-v1` selectors
- Mock-fixture pattern — create `lib/pinterest/__fixtures__/pins.ts` mirroring `boards.ts` structure
- Brand-token discipline + `data-component` convention — identical to b2
- Suspense Page→Section pattern — same as b2 `page.tsx`: await fetch in the CHILD server component, NOT in the `Page()` body; the `PinGrid` section is what suspends
- `loadMorePins` server action in `app/(authenticated)/pinterest/actions.ts` — extend the b2 `actions.ts` file, do not create a new one

---

## Out of scope (DO NOT design or build in this slice)

- Styled `TokenInvalidView` / `InsufficientScopeView` (b4)
- Token-replacement copy module (b4)
- Empty-state UI for boards-without-pins (b5); this slice ships a minimal inline "No pins yet." message only if the `items` array is empty — no styled component
- `error.tsx` changes
- Pin click navigation beyond the Pinterest external link already in `PinCard` markup (Epic B is browse-only; no in-app pin detail route)
- `[boardId]/not-found.tsx` — the parent-segment `not-found.tsx` is the correct placement; do NOT add a board-specific one in this slice

---

## Acceptance criteria → component mapping

| Acceptance criterion                                                    | Component(s) satisfying it                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Route streams `PinGridSkeleton` then resolved `PinGrid`                 | `PinGridSkeleton` (Suspense fallback) → `PinGrid` (resolved)                                                          |
| Sentinel triggers append on `bookmark` intersection                     | `InfiniteScrollSentinel` → calls `loadMorePins` server action → `PinGrid` state append                                |
| Sentinel stops when `nextBookmark === null`                             | `InfiniteScrollSentinel` `disabled` prop, set when `nextBookmark` is null                                             |
| Invalid `boardId` renders `not-found.tsx` (not `error.tsx`)             | async server component calls `notFound()` on `not_found` error; `app/(authenticated)/pinterest/not-found.tsx` renders |
| `PinCard` consumes `media.images` variants from `i.pinimg.com`          | `PinCard` `next/image` + variant fallback chain; relies on B1's `next.config.ts` allowlist                            |
| Uniform grid (not masonry)                                              | `PinGrid` CSS grid with fixed columns; `PinCard` `aspect-square` cover + `object-cover`                               |
| Touch targets meet tablet convention                                    | `PinCard` full-card `<a>` tap region (>> 44×44px); back-link `min-height: 44px`                                       |
| Server action shape `{ boardId, bookmark }` → `{ items, nextBookmark }` | `app/(authenticated)/pinterest/actions.ts` `loadMorePins()`                                                           |
| `aria-live="polite"` on `PinGrid`; `aria-busy` toggles                  | `PinGrid` `<section>` attributes; toggled by `InfiniteScrollSentinel` fetch lifecycle                                 |
| `data-component` on every component root                                | Per component inventory table above                                                                                   |

---

## `not-found.tsx` placement (confirmed)

Goes at `app/(authenticated)/pinterest/not-found.tsx` (PARENT segment), NOT inside `[boardId]/`. Next.js 15 bubbles `notFound()` to the nearest ancestor `not-found.tsx`. This keeps the user inside the authenticated shell (sidebar + nav remain visible). Call `notFound()` from the async server component that performs the `listPinterestBoardPins` fetch — never inside a catch block that swallows the error.

---

## OPEN QUESTIONS

None. All color, spacing, motion timing, and accessibility decisions were extracted from the approved inputs. No new creative calls were made.

> **Most fragile motion-quality choice for the developer's attention:** The `.sk-v1` shimmer uses animated `background-position` — the one deliberate non-compositor exception in the spec. It MUST be scoped strictly to elements with `.sk-v1` inside `[data-component='PinGridSkeleton']`. If accidentally applied to any `PinCard` content surface (the cover `div`, info area, resolved grid), it produces a "crawling" artifact on loaded content. Grep `.sk-v1` before merge and confirm it appears ONLY in `PinGridSkeleton.tsx`. This is the same discipline risk as b2 — treat it as a merge gate.

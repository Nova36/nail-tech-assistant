---
story_id: b2-pinterest-boards-grid
agent: ui-designer
timestamp: 2026-04-27T00:00:00Z
status: authoritative
sources:
  - state/wireframes/epic-b-pinterest-integration/b2-pinterest-boards-grid/claude-v2.html
  - state/wireframes/epic-b-pinterest-integration/b2-pinterest-boards-grid/claude-v1.html (shimmer)
  - state/wireframes/epic-b-pinterest-integration/_animations-spec.md
  - state/wireframes/epic-b-pinterest-integration/_a11y-spec.md
  - state/epics/epic-b-pinterest-integration/stories/b2-pinterest-boards-grid.yaml
  - app/globals.css
---

# /pinterest Boards Grid — Developer Brief

## TL;DR

Build the `/pinterest` route as a server-rendered page inside the authenticated shell: a streaming `<Suspense>` boundary delivers a `BoardGridSkeleton` shimmer (claude-v1 keyframes, applied to this story's skeleton), then resolves to `BoardGrid` with `InfiniteScrollSentinel` driven infinite-scroll append. Every color and spacing value must resolve to a CSS custom property from `app/globals.css` — zero hardcoded hex. The two blocking gates before merge: (1) shimmer uses `var(--card)` as its base fill (not a new hex), and (2) all interactive surfaces expose `aria-live`, `aria-busy`, and `data-component` attributes per this brief.

---

## Component inventory + data-component attributes

| Component              | File                                               | data-component             | Role                                                                                                                                 |
| ---------------------- | -------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| BoardGrid              | `components/pinterest/BoardGrid.tsx`               | `"BoardGrid"`              | client; receives initial items + bookmark from server; manages append state; renders `BoardCard[]` + `InfiniteScrollSentinel`        |
| BoardCard              | `components/pinterest/BoardCard.tsx`               | `"BoardCard"`              | client; `next/image` square cover + board name + optional pin count + private badge; wrapped in `<Link href="/pinterest/[boardId]">` |
| BoardGridSkeleton      | `components/pinterest/BoardGridSkeleton.tsx`       | `"BoardGridSkeleton"`      | server-renderable; 6 placeholder cards with `.sk-v1` shimmer; `aria-busy="true"` on wrapper                                          |
| InfiniteScrollSentinel | `components/pinterest/InfiniteScrollSentinel.tsx`  | `"InfiniteScrollSentinel"` | client; `IntersectionObserver`; `aria-hidden="true"`; breathes (`.sentinel.fetching`) while fetching                                 |
| TokenPlaceholderInline | inline in `app/(authenticated)/pinterest/page.tsx` | `"TokenPlaceholderInline"` | server; minimal 401/403 inline placeholder — heading + one-line copy only; b4 upgrades to styled views                               |

---

## Layout (extracted from claude-v2.html)

**Page shell:**

- Outer container: `mx-auto max-w-6xl` (matches the authenticated shell max-width established in Epic A)
- Horizontal padding: `px-6` (desktop/tablet), `px-5` (mobile)
- Vertical padding: `py-12` (desktop), `py-10` (tablet), `py-6` (mobile)

**Page header (above the grid):**

- Eyebrow: `text-[11px] tracking-[0.28em] uppercase` in `var(--muted-foreground)`; text: "Pinterest"
- Hero heading: Fraunces, `text-6xl font-light tracking-[-0.03em] leading-[0.98]` (desktop), `text-5xl` (tablet), `text-4xl` (mobile); content: `Your <em class="italic text-primary">boards.</em>`
- Subtext: `text-sm leading-6` in `var(--muted-foreground)`; `max-w-lg`
- Bottom margin before grid: `mb-14` (desktop), `mb-10` (tablet), `mb-8` (mobile)

**BoardGrid:**

- Desktop (lg, 1280px): `grid grid-cols-3 gap-8`
- Tablet (md, 768px): `grid grid-cols-2 gap-6`
- Mobile (sm, 375px): `grid grid-cols-1 gap-6`
- `role="list"` on the `<ul>`; `<li>` wraps each `BoardCard`
- `aria-live="polite"` + `aria-relevant="additions"` + `aria-busy="false"` on the grid `<section>` (toggled to `"true"` during sentinel fetch)
- `aria-labelledby` pointing at the page `<h2>` id

**BoardCard:**

- Border radius: `rounded-[28px]` (`border-radius: 28px`)
- Background: `bg-card` → `var(--card)`
- Box shadow: `0 12px 32px rgba(61,53,48,0.08)` (raw value from wireframe; acceptable on non-color properties)
- Cover image area: `aspect-square` (1:1); `next/image` fills the slot; placeholder gradient uses brand token mixes (see wireframe `.cover` class)
- Info area padding: `p-6` (desktop), `p-5` (tablet/mobile)
- Board name: Fraunces, `text-2xl font-light tracking-[-0.01em] line-clamp-2 leading-snug` (desktop), `text-xl font-light line-clamp-2` (tablet/mobile)
- Pin count: `text-xs` in `var(--muted-foreground)`, `mt-2 tracking-wide`
- Private badge: inline SVG lock icon + "Private · N pins" label in `var(--muted-foreground)`, `inline-flex items-center gap-1.5`
- Hover: `transform: translateY(-2px)` + `border-color: rgb(212 165 168 / 0.6)` (Dusty Rose tint — decorative, AA-exempt)
- Hover transition: `transition: transform 200ms ease-out, border-color 200ms ease-out`
- Focus-visible ring: `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2` (ring = `var(--ring)` = Mulberry Dusk `#6b3f5e`)
- Touch target minimum: `min-h-[44px]` on the card element; card as a whole far exceeds this
- `aria-label="{boardName} ({pinCount} pins)"` on the `<a>` wrapper
- `data-component="BoardCard"` on the outermost rendered element

**BoardGridSkeleton:**

- 6 placeholder cards, same `card-v2` shell (`rounded-[28px]`, `bg-card`, box-shadow)
- Cover: `aspect-square` + `.sk-v1` class (shimmer — see Motion section)
- Title line: `h-5 rounded-full` width variants (`w-3/4`, `w-2/3`, `w-4/5`) + `.sk-v1`
- Meta line: `h-3 rounded-full` width variants (`w-1/4`, `w-1/3`) + `.sk-v1`
- Lines spaced with `space-y-3` inside `p-6`
- `aria-busy="true"` on the `<section data-component="BoardGridSkeleton">` wrapper

**InfiniteScrollSentinel:**

- A 10×10px circle: `width: 10px; height: 10px; border-radius: 50%; background: var(--primary-tint); opacity: 0.55`
- Centered below grid: `flex justify-center`
- Margin above: `mt-16` (desktop), `mt-10` (tablet/mobile)
- Adds `.fetching` class while a fetch is in-flight → triggers `breathe` animation
- `aria-hidden="true"` at all times
- `data-component="InfiniteScrollSentinel"` on wrapper

**TokenPlaceholderInline (401 / 403 — this slice only):**

- Container: `max-w-md mx-auto text-center rounded-[28px] bg-card p-12` with dashed border in `rgb(107 63 94 / 0.5)` (Mulberry Dusk semi-transparent — border is decorative, not text)
- 401 heading: `font-fraunces text-3xl font-light tracking-[-0.02em]` — "Pinterest is <em class="italic text-primary">paused.</em>"
- 401 copy: `text-sm leading-6 text-muted-foreground mt-4` — "Your access token needs to be replaced. Update `PINTEREST_ACCESS_TOKEN` in your Vercel project settings."
- 403 heading: same style — "Pinterest needs <em class="italic text-primary">broader access.</em>"
- 403 copy: same style — "Your Pinterest token lacks required scopes. Update `PINTEREST_ACCESS_TOKEN` with `boards:read` + `pins:read` scopes in your Vercel project settings."
- Both: rendered server-side, no animation, no `error.tsx` involvement

---

## Color + typography (BRAND TOKENS ONLY — no new hex)

All values resolve through `app/globals.css` `:root` block. The Tailwind `@theme inline` block maps these to utility classes.

| Surface                              | CSS variable                            | Resolved hex    | Tailwind utility                              |
| ------------------------------------ | --------------------------------------- | --------------- | --------------------------------------------- |
| Page background                      | `var(--background)`                     | `#faf7f2`       | `bg-background`                               |
| Board card background                | `var(--card)`                           | `#f0ebe3`       | `bg-card`                                     |
| **Skeleton fill**                    | `var(--card)`                           | `#f0ebe3`       | `.sk-v1` base (see shimmer spec)              |
| Foreground / heading text            | `var(--foreground)`                     | `#3d3530`       | `text-foreground`                             |
| Muted text (pin count, eyebrow)      | `var(--muted-foreground)`               | `#6f625c`       | `text-muted-foreground`                       |
| Primary accent (italic heading word) | `var(--primary)`                        | `#6b3f5e`       | `text-primary`                                |
| Focus ring                           | `var(--ring)`                           | `#6b3f5e`       | `ring-[var(--ring)]`                          |
| Sentinel dot                         | `var(--primary-tint)` / `var(--accent)` | `#d4a5a8`       | inline style                                  |
| Hover border tint                    | Dusty Rose semi-transparent             | decorative only | inline `border-color: rgb(212 165 168 / 0.6)` |
| Placeholder dashed border            | Mulberry Dusk semi-transparent          | decorative only | inline `border-color: rgb(107 63 94 / 0.5)`   |

**IMPORTANT — MISS 3:** The wireframe's `.sk-v2` class uses `#e8dfd4` and `.sk-v2-line` uses `#dcd0c2`. These are NOT brand tokens. In implementation, replace both with `var(--card)` (`#f0ebe3`) as the skeleton fill, and use a slightly darker opacity layer for skeleton lines (e.g., `rgba(61,53,48,0.07)` overlay on `var(--card)`), OR simply use `var(--card)` for both and let the shimmer gradient provide the line distinction. Do not ship `#e8dfd4` or `#dcd0c2`.

**Note on `--accent` vs `--primary-tint`:** `app/globals.css` maps `--accent` to `#d4a5a8` (Dusty Rose), not `#c9a96e` (Champagne Gold). The wireframe `:root` has the Champagne Gold under `--accent`. In implementation, use `globals.css` as truth: `var(--accent)` = Dusty Rose `#d4a5a8`. Champagne Gold lives at `var(--color-accent)` = `#c9a96e` (the semantic accent for UI use, not decorative tints).

---

## Typography hierarchy

Fonts: Fraunces (display/headings) + Inter (body). Load via `next/font/google` or existing font setup in the authenticated layout.

| Role                             | Font            | Size              | Weight             | Tracking             | Line height      |
| -------------------------------- | --------------- | ----------------- | ------------------ | -------------------- | ---------------- |
| Page hero h2 (desktop)           | Fraunces        | `text-6xl` (60px) | `font-light` (300) | `tracking-[-0.03em]` | `leading-[0.98]` |
| Page hero h2 (tablet)            | Fraunces        | `text-5xl` (48px) | `font-light`       | `tracking-[-0.03em]` | default          |
| Page hero h2 (mobile)            | Fraunces        | `text-4xl` (36px) | `font-light`       | `tracking-[-0.03em]` | default          |
| Italic accent span               | Fraunces italic | inherits          | inherits           | —                    | —                |
| Board card title (desktop)       | Fraunces        | `text-2xl` (24px) | `font-light`       | `tracking-[-0.01em]` | `leading-snug`   |
| Board card title (tablet/mobile) | Fraunces        | `text-xl` (20px)  | `font-light`       | —                    | default          |
| Eyebrow label                    | Inter           | `text-[11px]`     | normal             | `tracking-[0.28em]`  | —                |
| Pin count / meta                 | Inter           | `text-xs` (12px)  | normal             | `tracking-wide`      | —                |
| Placeholder heading              | Fraunces        | `text-3xl` (30px) | `font-light`       | `tracking-[-0.02em]` | —                |
| Placeholder body                 | Inter           | `text-sm` (14px)  | normal             | —                    | `leading-6`      |

---

## Motion (from \_animations-spec.md)

### Skeleton shimmer — `.sk-v1` (from claude-v1.html — authoritative addendum)

Apply ONLY to `BoardGridSkeleton`. Not to `TokenInvalidView`, placeholder, or any card content surface.

```css
.sk-v1 {
  background:
    linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.45) 50%,
      rgba(255, 255, 255, 0) 70%
    ),
    var(--card); /* brand token, NOT #e8dfd4 */
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

@media (prefers-reduced-motion: reduce) {
  .sk-v1 {
    animation: none !important;
    background: var(--card);
  }
}
```

### Skeleton-to-content fade (from \_animations-spec.md §3 `card-enter`)

When `<Suspense>` resolves and `BoardGrid` mounts, the initial set of cards should use `card-enter`:

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
```

Duration: `260ms ease-out`. Class `.card-enter` applied on mount.

### IntersectionObserver-triggered append stagger (from \_animations-spec.md §4d)

When sentinel fires and new cards are appended: apply `.card-enter` class + inline `animation-delay` per card:

```js
// In BoardGrid client component, after appending new items:
newCards.forEach((card, i) => {
  card.style.animationDelay = `${Math.min(i * 40, 320)}ms`;
  // then add card-enter class
});
```

Increment: 40ms. Envelope cap: 320ms (clamp with `Math.min`). Do NOT exceed this — a full page of 9 cards at 40ms lands exactly at 320ms.

### InfiniteScrollSentinel breathe (from \_animations-spec.md §3)

```css
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

.sentinel.fetching {
  animation: breathe 2.2s ease-in-out infinite;
}
```

### Reduced-motion master block

```css
@media (prefers-reduced-motion: reduce) {
  .sk-v1,
  .sentinel.fetching,
  .card-enter,
  [data-component^='Board'],
  [data-component$='Skeleton'] {
    animation: none !important;
  }
  [data-component='BoardCard'] {
    transition: none !important;
  }
  [data-component='BoardCard']:hover {
    transform: none !important;
    box-shadow: none !important;
  }
}
```

Under reduced-motion: skeleton is a static `var(--card)` fill (shape conveys loading state), cards appear instantly without fade, sentinel is static dot at 0.55 opacity. Content is always fully visible.

---

## Accessibility (from \_a11y-spec.md)

### Landmark structure

```html
<main>
  <section data-component="PageHeader" aria-labelledby="boards-heading">
    <p class="... uppercase">Pinterest</p>
    <h2 id="boards-heading">
      Your <em class="italic text-primary">boards.</em>
    </h2>
    <p>
      Inspiration pulled from your Pinterest account. Open a board to browse its
      pins.
    </p>
  </section>

  <section
    data-component="BoardGrid"
    aria-labelledby="boards-heading"
    aria-live="polite"
    aria-relevant="additions"
    aria-busy="false"
  >
    <!-- BoardCard[] via <ul role="list"><li> -->
  </section>

  <div data-component="InfiniteScrollSentinel" aria-hidden="true"></div>
</main>
```

### aria-live + aria-busy toggling

- `aria-live="polite"` + `aria-relevant="additions"` on `BoardGrid` `<section>` — screen readers announce newly-appended boards without interrupting.
- Toggle `aria-busy="true"` on `BoardGrid` while sentinel fetch is in-flight; reset to `"false"` on completion.
- `BoardGridSkeleton`: `aria-busy="true"` on its wrapper section.

### BoardCard interactive element

```html
<a
  href="/pinterest/{board.id}"
  aria-label="{boardName} ({pinCount} pins)"
  class="focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
>
  <next/image alt="{boardName}" ... />
  <!-- board name + pin count -->
</a>
```

- The `<a>` wraps the entire card — the tap target is the full card area (well above 44×44px minimum per \_a11y-spec.md §b3 touch target audit).
- Lock icon SVG: `aria-hidden="true"` (decorative).
- `rel="noopener noreferrer"` not needed here — links go to internal route `/pinterest/[boardId]`, not a new tab.

### Tab order

Skip-link → page header → `BoardCard[0]` → `BoardCard[1]` → … → (sentinel is not focusable). Newly-appended cards become tab-reachable after append; `aria-live` on the grid announces the addition.

### Focus visible

All interactive surfaces: `focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]`. Never `focus:` only.

### Touch target

`BoardCard`: entire card as tap region — far exceeds 44×44px. No concern per \_a11y-spec.md §b3. Eyebrow labels in `var(--muted-foreground)` at `text-[11px]`: mark decorative eyebrow with `aria-hidden="true"` OR ensure the section's `aria-labelledby` provides equivalent context (the h2 does).

---

## Test breakpoint matrix (per implementation_notes MISS 4)

| Breakpoint | Spec width | Wireframe width   | Grid columns | Card aspect | Notes                                    |
| ---------- | ---------- | ----------------- | ------------ | ----------- | ---------------------------------------- |
| sm         | **375px**  | 390px (wireframe) | 1            | 1:1         | Test at 375; wireframe used 390 (MISS 4) |
| md         | **768px**  | 820px (wireframe) | 2            | 1:1         | Test at 768; wireframe used 820 (MISS 4) |
| lg         | **1280px** | 1280px            | 3            | 1:1         | Matches spec                             |

Breakpoint tokens: `--breakpoint-sm: 40rem` (640px), `--breakpoint-md: 48rem` (768px), `--breakpoint-lg: 64rem` (1024px) per `app/globals.css`. Use these for Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).

**Tailwind responsive grid:**

```html
<ul
  class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-8 ..."
></ul>
```

---

## 4 known misses to address in impl (from COMPARISON.md)

- **MISS 1 (tokens):** rely on `app/globals.css` `:root` variables via Tailwind v4 `@theme inline` — DO NOT hardcode hex values. Use `bg-card`, `text-primary`, `text-muted-foreground`, `ring-[var(--ring)]`, etc.
- **MISS 2 (annotations):** add `data-component=` attributes per the component inventory above on every rendered root element.
- **MISS 3 (new hex):** zero new colors; brand palette only. Skeleton fill = `var(--card)` (`#f0ebe3`) — NOT `#e8dfd4` (wireframe's `.sk-v2` class) and NOT `#dcd0c2` (wireframe's `.sk-v2-line` class). Both are out-of-spec; replace with `var(--card)` base and shimmer gradient.
- **MISS 4 (breakpoints):** test at 375 / 768 / 1280 per `--breakpoint-*` tokens. The wireframe renders at 390 / 820 / 1280 — those are presentation widths only, not the implementation target.

---

## Out of scope (DO NOT design or build in this slice)

- Pin grid (`b3`) — `PinGrid`, `PinCard`, `PinGridSkeleton`, `/pinterest/[boardId]` route implementation
- Token-replacement copy module (`b4` ships shared copy)
- Styled `TokenInvalidView` / `InsufficientScopeView` (`b4`) — this slice ships a MINIMAL inline placeholder only
- `error.tsx` changes (`b4`)
- Empty-state UI (`b5`) — flag the empty-boards slot in `page.tsx` with a comment but do not render styled empty state
- Polish micro-animations beyond shimmer + `card-enter` + sentinel breathe
- `not-found.tsx` for this route

---

## Acceptance criteria → component mapping

| Acceptance criterion                                            | Component(s) satisfying it                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Skeleton streams first, then resolved `BoardGrid`               | `BoardGridSkeleton` (Suspense fallback) → `BoardGrid` (resolved)                           |
| 401 renders MINIMAL inline placeholder, NOT error.tsx           | `TokenPlaceholderInline` in `page.tsx` (server-rendered, pre-Suspense)                     |
| 403 renders DISTINCT MINIMAL inline placeholder                 | `TokenPlaceholderInline` (403 variant) — different heading + copy                          |
| `verifyPinterestToken()` awaited BEFORE `listPinterestBoards()` | `app/(authenticated)/pinterest/page.tsx` server component ordering                         |
| Sentinel triggers append on `bookmark` intersection             | `InfiniteScrollSentinel` → calls `loadMoreBoards` server action → `BoardGrid` state append |
| Sentinel stops when `nextBookmark === null`                     | `InfiniteScrollSentinel` `disabled` prop, set when `nextBookmark` is null                  |
| `BoardCard` link `href` = `/pinterest/[boardId]`                | `BoardCard` `<Link href={...}>`                                                            |
| Server action returns `{ items, nextBookmark }` shape           | `app/(authenticated)/pinterest/actions.ts` `loadMoreBoards()`                              |
| No image-host config error for `i.pinimg.com`                   | Relies on B1's `next.config.ts` allowlist — `BoardCard` `next/image`                       |
| Touch targets meet tablet-friendly sizing                       | `BoardCard` full-card `<a>` tap region (>> 44×44px)                                        |
| `wireframes:` block populated before execute                    | This brief + YAML `wireframes:` block (already populated per story file)                   |

---

## OPEN QUESTIONS

None. All color, spacing, motion timing, and accessibility decisions were extracted from the approved inputs. No new creative calls were made.

> **Most fragile motion-quality choice for the developer's attention:** The `.sk-v1` shimmer uses `background-position` animation — the one deliberate non-compositor exception in the spec. It must be scoped strictly to elements with the `.sk-v1` class inside `BoardGridSkeleton`. If accidentally applied to `BoardCard` content surfaces (e.g., the cover gradient `div`), it will produce a "crawling" artifact on loaded content. Grep `.sk-v1` before merge and confirm it appears ONLY in `BoardGridSkeleton.tsx`.

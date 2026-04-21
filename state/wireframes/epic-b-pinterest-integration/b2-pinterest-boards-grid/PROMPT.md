# Wireframe prompt — `/pinterest` boards grid (Epic B, story b2)

> Self-contained prompt. Single source brief used by **both** the external Claude design tool **and** our internal Hive `ui-designer` agent. Same input, same output format (HTML), so the outputs can be compared like-for-like. Produces 3 alternate renditions of the same screen.

## Output format — HTML (NOT PNG, NOT Frame0)

Each rendition is a **single self-contained `.html` file** that opens in any browser with no build step:

- Inline `<style>` block at top of `<head>` containing the project's actual CSS custom properties (Mulberry Dusk palette below) so the wireframe looks like the real app.
- Tailwind via CDN: `<script src="https://cdn.tailwindcss.com"></script>` (or `<script src="https://unpkg.com/@tailwindcss/browser@4"></script>` for v4 syntax) — this gives Tailwind classes without a build pipeline.
- Use semantic HTML mirroring the React component structure that will be built (`<main>`, `<section>`, `<article>` for board cards, etc.). Component boundaries should be obvious from the markup so the developer can map HTML → component file 1:1.
- Show **multiple breakpoint states stacked vertically** in the same file (mobile → tablet → desktop) using viewport-sim wrapper divs at fixed widths, each labeled. Better than producing 3 separate files per breakpoint.
- Include light annotations as small `<aside>` callouts in the brand's `--muted-foreground` color naming each region (BoardGrid, BoardCard, BoardGridSkeleton, InfiniteScrollSentinel, header, 401/403 placeholder, empty-state slot).
- No JavaScript needed for the wireframe itself (skeleton + sentinel can be static visual representations; no interactivity required).

---

## What I'm asking you to design

The first Pinterest browse view in a single-user web app called **Nail Tech Assistant** — a Mother's Day 2026 gift for a working nail technician (the user's wife). She'll open this view inside an already-authenticated app shell to browse her own Pinterest boards as inspiration for nail designs.

This is the **boards grid** screen at `/pinterest`. Selecting a board on this screen navigates to a separate pin-grid screen (out of scope for this wireframe — only design the boards view).

**Produce 3 distinct rendition options**, varied in layout density, card composition, and skeleton/sentinel treatment. Same visual language across all three.

---

## Visual language (must reuse — already established by Epic A)

The boards view nests inside the existing authenticated shell — `<main className="mx-auto max-w-6xl px-6 py-8">` — and should feel like a sibling to the existing studio dashboard tiles.

### Colors (CSS custom properties already in `app/globals.css`)

- `--background: #faf7f2` (Ivory Cream — page background)
- `--foreground: #3d3530` (warm dark brown — body text)
- `--card: #f0ebe3` (raised surface — board cards sit on this)
- `--primary: #6b3f5e` (Mulberry Dusk — accents, focus rings)
- `--primary-tint: #d4a5a8` (soft rose — hover/affordance)
- `--accent: #c9a96e` (Champagne Gold — secondary accent)
- `--muted-foreground: #8c7e78` (warm grey — meta text, pin-count, timestamps)
- `--border: #8c7e78`
- Body backdrop has a subtle radial-gradient at top: `radial-gradient(circle at top, rgb(212 165 168 / 0.18), transparent 35%)`

### Typography

- **Headings:** Fraunces (serif), light weight `font-light`, tight letter-spacing `tracking-[-0.03em]`, italic for accent words colored `text-primary`. Example pattern from existing dashboard: `<h1>Your design <span class="italic text-primary">studio.</span></h1>`
- **Body:** Inter (sans-serif), small (`text-sm`, `leading-6`), `text-muted-foreground` for meta
- **Eyebrows / labels:** uppercase, very wide tracking `tracking-[0.28em]`, tiny (`text-[11px]`), `text-muted-foreground`

### Card pattern (already in use on dashboard)

```
rounded-[28px]
bg-card
shadow-[0_12px_32px_rgba(61,53,48,0.08)]   ← soft, warm, low-contrast shadow
border border-dashed border-primary/50        ← optional, used on placeholder tiles
hover:-translate-y-0.5                         ← subtle lift on hover
focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.2)]
```

### Critical "do NOT" rules

- **Do NOT use `--gradient-signature`** (`linear-gradient(135deg, #e8d5e0, #c9b4c9, #d4a8b0, #e8c9a0)`). That gradient is RESERVED for the "New design" entry tile on the dashboard so it remains the singular hero affordance. Pinterest boards are siblings, not heroes.
- **Do NOT introduce shadcn primitives or a `cn()` helper** — this app is intentionally Tailwind-first.
- **Do NOT use masonry layout.** Uniform grid only.
- **Do NOT use a "load more" button.** Pagination is infinite-scroll via an IntersectionObserver sentinel at the bottom of the grid.

---

## Surfaces to design (each rendition shows ALL of these)

### 1. Page header (above the grid)

- Page title with Fraunces italic accent — pattern like "Your <span italic text-primary>boards.</span>" or similar
- One-line muted body subhead (e.g., "Inspiration pulled from your Pinterest account.")
- Optional: tiny eyebrow label "Pinterest" with the wide-tracked uppercase treatment
- Should anchor the screen the way the dashboard hero anchors `/`

### 2. `BoardGrid` — uniform grid of `BoardCard`s

- **Column counts**:
  - mobile (< 640px): 1 column
  - sm (≥ 640px): 2 columns
  - md (≥ 768px): 2-3 columns
  - lg (≥ 1024px): 3 columns
  - xl (≥ 1280px): 3-4 columns
- Try a different column rhythm in each rendition (e.g., v1 = denser/4-col xl, v2 = 3-col-max, v3 = 2-col with bigger cards)
- Gap: 24-32px range
- Cards must be uniform height (uniform grid invariant)

### 3. `BoardCard` — repeating tile in the grid

- **Cover image** — Pinterest gives us a cover image URL per board (from `media` field). Aspect ratio: try 4:3 in v1, 1:1 (square) in v2, 3:2 in v3 — show variety.
- **Board name** — Fraunces, medium weight, 1-2 lines, ellipsis on overflow
- **Pin count** — small Inter `text-muted-foreground`, e.g. "47 pins"
- **Optional privacy indicator** — for "secret" boards (small lock icon + "Private")
- **Touch target** — entire card is clickable (min 44px tappable region per `--touch-target-min`)
- **Hover/focus state** — subtle `-translate-y-0.5` lift + the existing focus ring pattern
- **No text overlay on cover image** — title sits below the cover, not on top (cleaner, accessible)

### 4. `BoardGridSkeleton` — initial Suspense fallback

- Renders **6 skeleton cards** above the fold while the first page of boards streams in (12 in v1 if you go denser, 8 in v3 if cards are bigger)
- Use `bg-secondary` or `bg-muted` (`#f0ebe3`) as a calm static fill OR a very gentle horizontal shimmer
- Keep skeleton card silhouette matching the real card geometry (rounded-[28px], same proportions)
- Do NOT shimmer aggressively — warm + quiet is the bar

### 5. `InfiniteScrollSentinel` — "loading next page" affordance

- Sits at the bottom of the grid, gets observed by IntersectionObserver
- When in-view and fetching: show a small, quiet pulse (e.g., a 32px circle filled with `--primary-tint` at 0.5 opacity, slow pulse animation)
- When idle (no more pages): no visible affordance (sentinel collapses to height: 0)
- Do NOT use a chunky spinner or "Loading…" text banner — visual quietness matters

### 6. **Minimal inline 401/403 placeholder** (in place of the grid when token is unhealthy)

This is intentionally minimal — slice b4 will upgrade it later. For this rendition, render a small calm card (single column, centered, max-w-md) where the grid would be:

- Heading: Fraunces, "Pinterest is paused." (or similar warm phrasing)
- Body: 2 short sentences, e.g., "Your access token needs to be replaced. Update `PINTEREST_ACCESS_TOKEN` in your Vercel project settings."
- No buttons, no fancy treatment — this is a placeholder, not a remediation page

### 7. Empty state (zero boards) — slot only

- Reserve the same grid area
- Single calm message: Fraunces heading "No boards yet." + one Inter sentence
- Don't render a fake skeleton or an empty `<div>` — the slot must be visually intentional

---

## Constraints to encode in the wireframes

- **Uniform grid, NOT masonry** (varying card aspect inside cards is fine; the GRID stays uniform)
- **Infinite scroll, NOT load-more button**
- **Suspense streaming** — the page paints the header + skeleton immediately, then the boards stream in (first page) without a full-page loading state
- **Tailwind-first** — no Radix, no shadcn primitives in the wireframe annotations
- **Accessibility**:
  - Each card is a single focusable region with a visible focus ring (the project's `focus-visible:ring-2` pattern)
  - `prefers-reduced-motion` collapses the hover-lift, the skeleton shimmer, and the sentinel pulse to no-op
  - Color contrast ≥ 4.5:1 for body text on `--card` background
  - Touch targets ≥ 44px

---

## Variation guidance for the 3 renditions

Make them genuinely different so the comparison is useful, not 3 near-identical mockups:

- **v1 — Denser** : 4 columns at xl, 4:3 cover aspect, smaller card padding, more boards above the fold
- **v2 — Editorial** : 3 columns at lg/xl, 1:1 (square) covers, generous padding, larger Fraunces titles, calmer rhythm
- **v3 — Magazine** : 2 columns at lg/xl, 3:2 covers, cards big and confident, more whitespace, eyebrow + meta line above each title

For each rendition, also include a quick variation of:

- Skeleton treatment (static fill vs gentle shimmer vs pulsing single line)
- Sentinel (invisible-until-fetching vs always-visible-as-quiet-dot)
- Card hover state (lift vs lift+border-color shift vs lift+shadow-deepen)

---

## Output

For each rendition `v1` / `v2` / `v3`:

- A single self-contained `.html` file (per the format spec at the top of this prompt)
- All three breakpoints (mobile / tablet / desktop) in the same file, stacked
- Element annotations (BoardGrid, BoardCard, BoardGridSkeleton, InfiniteScrollSentinel, header, placeholder, empty state) so the developer can map them to component files

Save renditions to:

```
state/wireframes/epic-b-pinterest-integration/b2-pinterest-boards-grid/v1.html
state/wireframes/epic-b-pinterest-integration/b2-pinterest-boards-grid/v2.html
state/wireframes/epic-b-pinterest-integration/b2-pinterest-boards-grid/v3.html
```

If your tool doesn't write files directly (e.g., chat-based output), produce the HTML inline and I'll save it to those paths manually. Keep each rendition under ~400 lines of HTML — these are wireframes, not finished pages.

## Comparison context (so both tools know the bar)

Two outputs of this prompt are being compared head-to-head:

- **Output A:** generated by Anthropic's Claude design tool (external, hosted)
- **Output B:** generated by our internal Hive `ui-designer` agent operating inside the planning team

The goal is to evaluate whether our internal tooling produces wireframes of comparable quality to the external tool, given identical input. **Don't try to "win" the comparison by being clever** — just produce honest, useful wireframes that follow this brief. The comparison is about the tooling, not about the prompt-following.

---

## What I'll do with the output

I'll review all 3, pick one (or request changes), and the picked rendition becomes the authoritative pixel + spacing reference for the developer agent that implements `/pinterest`. The tester writes acceptance tests against the wireframe semantics. No code is written until the wireframe is approved.

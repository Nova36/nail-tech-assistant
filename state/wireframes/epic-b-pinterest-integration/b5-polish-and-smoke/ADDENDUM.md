# b5 — Polish addendum

Lighter-touch story. Two renditions (v1, v2) for three states each: `EmptyBoardsState`, `EmptyBoardState`, `BrowseErrorRetry`. Not full Touchpoint 1 — addendum to the Epic B sweep.

**Constant across both renditions (per spec):**

- `role="status"` on empty states, `role="alert"` on BrowseErrorRetry.
- Pushpin glyph `aria-hidden="true"`, 40px on desktop, Taupe-Mist stroke + Dusty-Rose decorative dot accent.
- BrowseErrorRetry **heading uses Warm Charcoal** (NOT destructive red — destructive is reserved for destructive actions per brief).
- BrowseErrorRetry stays inline inside the grid area (does NOT unmount page chrome).
- Retry button uses animations-spec §7d pattern: `translateY(-1px)` hover lift, 90° icon rotate, 80ms active-snap.
- `.view-settle` 240ms fade-in on mount for all three components.
- Reduced-motion override on every animation.
- `aria-describedby` ties retry button to error heading.

---

## Variation

|                           | **v1 — Centered**                | **v2 — Composed**                                                   |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Empty states alignment    | Center                           | Left (5-col grid: 2 cols silhouette, 3 cols copy)                   |
| Empty states illustration | Circle-with-dot pushpin (simple) | Dashed board-outline silhouette + fuller pushpin overlaid on corner |
| Heading size (desktop)    | `text-4xl`                       | `text-5xl`                                                          |
| Feel                      | Quiet, simple, utility-leaning   | More composed, more editorial, more Pinterest-evocative             |

`BrowseErrorRetry` is identical layout across v1 and v2 (the story asks for inline in-grid treatment; no room for much variation at the addendum scale).

---

## Scorecard

| Criterion                                           | v1 — Centered | v2 — Composed |
| --------------------------------------------------- | ------------- | ------------- |
| Brief fidelity                                      | 5             | 5             |
| Empty-state polish                                  | 3             | **5**         |
| A11y adherence (15-pt relevant items)               | 5             | 5             |
| Motion adherence (10-pt)                            | 5             | 5             |
| Cohesion with rest of Epic B (editorial brand tone) | 3             | **5**         |
| **Total**                                           | **21/25**     | **25/25**     |

---

## 15-point a11y audit notes

Both renditions pass all applicable checks. The notable items:

- **Check #5** (decorative `aria-hidden`): pushpin glyphs, board silhouette, Dusty-Rose accent dots, back-arrow chevrons — all marked `aria-hidden="true"`.
- **Check #6** (Taupe Mist): body copy uses `var(--muted-foreground)` = `#6F625C` (AA-legible token from Fix (a)).
- **Check #10**: Empty states use `role="status"` (informational, not urgent). BrowseErrorRetry uses `role="alert"` (interruption-worthy fetch failure).
- **Check #11** (focus rings): retry button has `focus-visible` 2px ring with offset.
- **Check #12** (touch targets): retry button `min-h-[44px] px-5 py-3`. Back-to-boards link `min-h-[44px]`.
- **Check #15** (reduced-motion): `.view-settle`, `.retry-button` transition, `.retry-icon` rotation all have `@media (prefers-reduced-motion: reduce)` overrides.

---

## 10-point animations audit notes

Both renditions pass. Specifically:

- **Check #4** (hover uses `transform`): retry button `translateY(-1px)`, retry icon `rotate(90deg)` — both compositor-only.
- **Check #7** (`will-change` sparingly): `will-change: transform` only on `.retry-button` — the one element in b5 that earns the GPU hint.
- **Check #8** (timing ladder): 180ms button color, 220ms box-shadow, 240ms icon rotate, 80ms active-snap — all within spec bands.
- **Check #10** (no shimmer on non-skeleton content): no shimmer anywhere in b5. Empty states are static. Confirmed.

**Pushpin glyph static** (animations-spec §7c): no float loop on either rendition. Decision rationale documented in spec — empty states communicate absence; idle motion contradicts that.

---

## Gaps per rendition

### v1 — Centered

- **Illustration is lightweight.** A simple circle-with-dot reads as a wireframe placeholder more than a deliberate illustration. Works as an MVP but doesn't match the editorial brand tone established by the dashboard + b2 winner.
- **No compositional anchor.** Center-alignment with a small glyph feels under-designed compared to the Fraunces hero moments elsewhere. The empty state reads as a "sorry, nothing here" message rather than an invitation.

### v2 — Composed

- **Silhouette overlap risk at narrow mobile widths** — the fuller pushpin overlays the silhouette's top-right corner, which at 375px width with large Fraunces headings below could feel cramped. Mobile treatment uses a constrained `max-w-[200px]` silhouette and 40px glyph to mitigate. Reviewed: layout holds.
- **Slightly more visual weight** may be overkill for the "nothing's here" moment. Risk is minor — the content is editorial-leaning already.

---

## Recommended default

**v2 — Composed.**

**Reason:** The brand tone established by the dashboard, b2 winner, and b3/b4 wireframes is editorial and unhurried. A dashed-board silhouette + fuller pushpin glyph carries that voice into the empty state; a bare circle-with-dot does not. v1 is acceptable MVP but reads as under-designed compared to the rest of the epic.

The risk of v2 is minor visual weight at narrow widths, mitigated with the `max-w-[200px]` silhouette sizing on mobile.

---

## Selection prompt for next session

> Which b5 rendition should I ship — v1 (Centered, simple circle-with-dot pushpin) or v2 (Composed, left-aligned with dashed board silhouette + fuller pushpin)?
>
> My recommended default is **v2** — the dashed silhouette carries the editorial brand tone into empty states, matching the rest of Epic B. v1 is an acceptable MVP but reads as under-designed next to the dashboard and b2 winner. `BrowseErrorRetry` is effectively identical between the two.

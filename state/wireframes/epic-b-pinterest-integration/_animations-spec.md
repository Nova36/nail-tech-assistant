# Epic B Animations Spec

**version:** 1.0
**authored:** 2026-04-20
**author:** animations-specialist
**supersedes:** nothing — this EXTENDS `_base-template.md` §5, it does not replace it
**scope:** b3 pins grid, b4 TokenInvalidView, b4 InsufficientScopeView, b5 empty/error states
**stack constraint:** pure CSS + Tailwind v4. No JS animation libraries. Compositor-only properties (`transform`, `opacity`) with one deliberate exception for shimmer (`background-position`, contained).

---

## Table of contents

1. [Global motion principles](#1-global-motion-principles)
2. [Perceptual timing reference](#2-perceptual-timing-reference)
3. [Shared keyframes (paste into every rendition)](#3-shared-keyframes-paste-into-every-rendition)
4. [b3 — Pinterest pin grid](#4-b3--pinterest-pin-grid)
5. [b4 — TokenInvalidView (401)](#5-b4--tokeninvalidview-401)
6. [b4 — InsufficientScopeView (403)](#6-b4--insufficientscopeview-403)
7. [b5 — Empty & retryable error states](#7-b5--empty--retryable-error-states)
8. [Reduced-motion master block](#8-reduced-motion-master-block)
9. [What NOT to animate (explicit off-limits)](#9-what-not-to-animate-explicit-off-limits)
10. [Animations audit checklist (10 items)](#10-animations-audit-checklist)
11. [Disagreements with the base template](#11-disagreements-with-the-base-template)

---

## 1. Global motion principles

The motion system for Epic B is **quiet, editorial, and composed**. Three rules that apply everywhere:

1. **Compositor-only for everything animated repeatedly** — `transform` and `opacity`. The shimmer is the single exception (animated `background-position`), and it is contained to skeleton surfaces only.
2. **≤300ms for UI feedback, ≤450ms for entrance** — anything longer than 450ms starts to feel "felt-slow" to a user who is browsing. Idle loops may run long (shimmer is 2.6s, breathe is 2.2s) because the user is not waiting on them to complete.
3. **Reduced-motion replaces, never deletes** — under `prefers-reduced-motion: reduce`, animated entrances become instant (opacity snaps to 1, no translate), idle loops stop entirely, hover transforms are neutralized. Nothing disappears — the content is always fully present.

**"Pops of fun" is not "loudness."** Don's affirm on 2026-04-20 pairs motion WITH illustration. The motion is restrained precisely because the illustration carries some of the delight — we do not need both to be shouting.

---

## 2. Perceptual timing reference

| Duration | User perception | Use for |
|---|---|---|
| 0-120ms | Imperceptible / "instant" | Color-shift on hover (`color`, `border-color`). Feels snappy. |
| 150-220ms | Quick, responsive | Hover transforms (lift, border-color), underline-grow, link color. |
| 220-320ms | Quick + quality | Card entrance fade, remediation view fade-in, stagger cell. |
| 400-600ms | Deliberate, felt | Glyph draw-in (if used), staged multi-step reveal. |
| >700ms | Felt-slow when waiting | **Never use for waiting-state entrances.** Acceptable only for idle loops the user is not blocked on. |
| 2000-3000ms | Idle-loop territory | Shimmer (2.6s), sentinel breathe (2.2s), optional glyph float (3-4s). |

**Easing default:** `ease-out` for entrances (fast start, soft landing — feels responsive), `ease-in-out` for idle loops (symmetric, non-distracting), `cubic-bezier(0.4, 0, 0.2, 1)` (Material "standard") for any hover that needs a touch more polish than plain `ease`.

---

## 3. Shared keyframes (paste into every rendition)

These already exist in `_base-template.md` §5. They are the foundation; every story builds on them. Copy verbatim:

```css
/* Skeleton shimmer — the compositor exception, contained to skeleton surfaces */
@keyframes sk-sweep {
  0%   { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

/* Sentinel idle breathe — signals "I am watching for your next page" */
@keyframes breathe {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50%      { opacity: 0.8;  transform: scale(1.25); }
}

/* Card entrance — used by infinite-scroll appended pages and by remediation fade-in */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Remediation-view fade-in — flatter translate than card-enter, more "settling" */
@keyframes view-settle {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**Note:** `view-settle` is new in this spec (not in base template). It is the composed-entrance keyframe for the b4 remediation views — deliberately flatter than `card-enter` (2px vs 4px) because a whole-view entrance at 4px would feel jumpy.

---

## 4. b3 — Pinterest pin grid

### 4a. Surface inventory

| `data-component` | Element | Motion |
|---|---|---|
| `BoardDetailHeader` | The h1 + Champagne Gold eyebrow above the grid | Fade-in on mount (opacity only, 260ms ease-out) |
| `PinGridSkeleton` | 8-12 skeleton tiles shown before first data | Shimmer (`sk-sweep`, 2.6s infinite) |
| `PinGrid` | The uniform 3-col grid container | No motion on the container itself |
| `PinCard` | Each pin tile | Hover lift + border-tint (shared with b2 `BoardCard`); stagger fade-in on append |
| `InfiniteScrollSentinel` | The 10px dot below the grid | Idle `breathe` animation when `.fetching` class is on |
| *appended page of PinCards* | Newly-mounted `PinCard`s after sentinel trigger | `card-enter` with staggered `animation-delay` |

### 4b. Motion recipe (copy-paste ready)

```css
/* Page-mount entrance — the Fraunces h1 + eyebrow settle in together */
[data-component="BoardDetailHeader"] {
  animation: view-settle 280ms ease-out both;
}

/* Skeleton fill (base template §5a) */
[data-component="PinGridSkeleton"] .sk-v1 {
  background:
    linear-gradient(100deg,
      rgba(255,255,255,0) 30%,
      rgba(255,255,255,0.45) 50%,
      rgba(255,255,255,0) 70%),
    var(--card);
  background-size: 220% 100%;
  background-position: 120% 0;
  animation: sk-sweep 2.6s ease-in-out infinite;
}

/* Card hover (base template §5c, repeated for clarity) */
[data-component="PinCard"] {
  transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
  border: 1px solid transparent;
}
[data-component="PinCard"]:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--primary-tint) 55%, transparent);
  box-shadow: 0 8px 24px -12px color-mix(in oklab, var(--primary) 20%, transparent);
}

/* Appended-page stagger — CRITICAL for the b3 infinite-scroll feel */
[data-component="PinCard"].card-enter {
  animation: card-enter 260ms ease-out both;
  /* animation-delay is set INLINE per card by the IntersectionObserver callback — see 4d */
}

/* Sentinel (base template §5b) */
[data-component="InfiniteScrollSentinel"] .sentinel {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--primary-tint);
  opacity: 0.55;
}
[data-component="InfiniteScrollSentinel"] .sentinel.fetching {
  animation: breathe 2.2s ease-in-out infinite;
}
```

### 4c. Timing rationale

- **260ms for `card-enter`** — sits squarely in the "quick + quality" band. Long enough to be perceptible as a mount transition (not a pop-in), short enough that a user scrolling fast does not wait on it.
- **2.6s for shimmer** — at 1.8s the sweep feels anxious, at 3s+ it looks broken. 2.6s is the sweet spot validated in b2 claude-v1 review.
- **220ms for hover transitions** — matches Material's "standard" curve range. Below 180ms feels cold; above 280ms a hover starts to drag.
- **2.2s for sentinel breathe** — deliberately slightly faster than shimmer so the two loops never feel synchronized. Also: a "breath" should not feel sleepy; 2.2s is a calm breath rate.

### 4d. Stagger pattern — the load-bearing b3 decision

**Increment:** `40ms` between cards.
**Total envelope cap:** `320ms` — past this the tail cards feel detached.
**Mechanism:** the IntersectionObserver callback that appends a new page sets `style="animation-delay: ${Math.min(i * 40, 320)}ms"` on each new card's inline style as it is appended, where `i` is the card's index within that page batch.

```js
// Reference implementation for the PinGrid component — for the ui-designer's
// wireframe this is just illustrative; actual wiring happens in implementation.
newCards.forEach((card, i) => {
  card.style.animationDelay = `${Math.min(i * 40, 320)}ms`;
  card.classList.add('card-enter');
});
```

**Why 40ms and not 60ms:** a page of 9 pins (3 rows × 3 cols) with 60ms stagger would envelope at 480ms — past our "felt-slow" threshold. At 40ms, 9 cards envelope at 320ms — right at the cap. If a page grows to >9 cards, we clamp delay at 320ms so late cards do not drag out.

**Why per-card stagger and not per-row:** per-card stagger creates a diagonal wipe that reads as "new content cascading in," which feels deliberately composed. Per-row stagger reads as chunky and less editorial.

### 4e. Reduced-motion fallback

```css
@media (prefers-reduced-motion: reduce) {
  [data-component="BoardDetailHeader"] { animation: none !important; }
  [data-component="PinGridSkeleton"] .sk-v1 { animation: none !important; }
  [data-component="PinCard"] { transition: none !important; }
  [data-component="PinCard"]:hover { transform: none !important; box-shadow: none !important; }
  [data-component="PinCard"].card-enter { animation: none !important; }
  [data-component="InfiniteScrollSentinel"] .sentinel.fetching { animation: none !important; }
}
```

**Behavior under reduced-motion:** grid mounts instantly, skeleton is static (still uses `var(--card)` as a solid fill — the user sees "this content is loading" from the shape alone), appended cards appear instantly, sentinel is a static dot at full 0.55 opacity. Hover still works for color-shifts; only transforms are neutralized.

---

## 5. b4 — TokenInvalidView (401)

**Tone:** Option C. Composed. Quiet. One Champagne Gold accent on step-counter numerals. One icon glyph (disconnected-link). Motion is deliberately dialed down.

### 5a. Surface inventory

| `data-component` | Element | Motion |
|---|---|---|
| `TokenRemediationLoadingSkeleton` | Brief loading sliver BEFORE view resolves | Shimmer (`sk-sweep`, 2.6s) |
| `TokenInvalidView` (wrapper) | The whole view container | `view-settle` on mount, 240ms |
| Icon glyph (disconnected-link, inside `TokenInvalidView`) | The restrained vector above h1 | **Static. No animation.** (See decision 5c.) |
| h1 + Inter sentence | Heading block | Inherits parent fade-in (no own animation) |
| `RemediationSteps` | Ordered list of 4 steps | No stagger on the steps — list appears atomically with parent |
| Step-counter numerals (inside `RemediationSteps`) | The "1 / 2 / 3 / 4" circles with Mulberry Dusk border | Static |
| `.link-action` ("Open Pinterest Dashboard") | Outbound link | Underline-grow on hover (base template §5e) + enhanced micro-interaction (see 5d) |

### 5b. Motion recipe

```css
/* The whole view settles in as one composed piece — no inner stagger */
[data-component="TokenInvalidView"] {
  animation: view-settle 240ms ease-out both;
}

/* Loading sliver that precedes the view — this is where shimmer lives, NOT on the remediation content */
[data-component="TokenRemediationLoadingSkeleton"] .sk-v1 {
  background:
    linear-gradient(100deg,
      rgba(255,255,255,0) 30%,
      rgba(255,255,255,0.45) 50%,
      rgba(255,255,255,0) 70%),
    var(--card);
  background-size: 220% 100%;
  background-position: 120% 0;
  animation: sk-sweep 2.6s ease-in-out infinite;
}

/* Link-action underline grow (shared base template §5e) */
[data-component="TokenInvalidView"] .link-action {
  position: relative;
  color: var(--primary);
  text-decoration: none;
  transition: color 180ms ease;
}
[data-component="TokenInvalidView"] .link-action::after {
  content: ''; position: absolute; left: 0; bottom: -2px;
  height: 1px; width: 0;
  background: currentColor;
  transition: width 220ms ease;
}
[data-component="TokenInvalidView"] .link-action:hover::after { width: 100%; }

/* Subtle arrow nudge on the outbound "Open Pinterest Dashboard" link (see 5d) */
[data-component="TokenInvalidView"] .link-action .arrow {
  display: inline-block;
  transition: transform 220ms ease;
}
[data-component="TokenInvalidView"] .link-action:hover .arrow {
  transform: translateX(2px);
}
```

### 5c. Icon glyph decision — STATIC (no draw-in)

**Decision:** the disconnected-link glyph renders **statically**. No `stroke-dasharray` draw-in animation.

**Rationale:**
1. The glyph is informational, not decorative. It helps a user (likely Don debugging his own token at midnight) identify "this is the 401 screen" at a glance. A 600ms draw-in delays recognition.
2. Option C's rule 4 says "motion dialed down." A draw-in would be the most animated element on the screen — inverting the intended hierarchy.
3. The whole view already fades in via `view-settle` at 240ms. Layering a second animation on the glyph inside that parent fade is noisy.
4. In a reduced-motion context, the draw-in would need to be replaced with instant render anyway. Starting from "instant" keeps motion-on and motion-reduced visually identical, which preserves the operator-facing calm tone.

**If the wireframe ever needs a visual "this is the remediation path" flourish, use copy (the Fraunces italic accent word) or color (the single Champagne Gold on step-counter numerals) — not motion.**

### 5d. Enhanced link-action micro-interaction — the 2px arrow nudge

The base template's underline-grow is good but a standalone outbound link to Pinterest Dashboard deserves a touch more affordance. Proposal (approved for inclusion):

- Render the link as `Open Pinterest Dashboard <span class="arrow">→</span>`.
- On hover: underline grows from 0 to 100% (existing 220ms), AND the arrow `translateX(2px)` (220ms ease).
- Effect: the link "leans" toward the action. Quiet, non-bouncy, operator-appropriate.

This is strictly additive — only the outbound Pinterest link gets this treatment. Internal links (none in b4, but for future consistency) would use underline-grow only.

### 5e. Timing rationale

- **240ms for `view-settle`** — faster than `card-enter` (260ms) because this is a whole-view fade, not a per-card entrance. The shorter duration reads as "settling" rather than "arriving," which matches the composed Option C tone.
- **220ms for the arrow nudge** — matches underline-grow duration so the two hover effects resolve together. Mismatched durations on the same element always feel unpolished.
- **Flatter `translateY` (2px, not 4px) in `view-settle`** — a full view rising 4px feels like it was off-screen. 2px reads as "coming into focus" which is the right metaphor for a remediation screen.

### 5f. Stagger pattern

**None.** The four remediation steps mount atomically with the parent view. Option C explicitly says "no stagger." A numbered list that staggers draws attention to the animation; a numbered list that appears all at once draws attention to the content.

### 5g. Reduced-motion fallback

```css
@media (prefers-reduced-motion: reduce) {
  [data-component="TokenInvalidView"] { animation: none !important; }
  [data-component="TokenRemediationLoadingSkeleton"] .sk-v1 { animation: none !important; }
  [data-component="TokenInvalidView"] .link-action { transition: none !important; }
  [data-component="TokenInvalidView"] .link-action::after { transition: none !important; width: 0 !important; }
  [data-component="TokenInvalidView"] .link-action .arrow { transition: none !important; }
}
```

**Behavior under reduced-motion:** view renders instantly, skeleton is a static block, hover produces no transforms. The Champagne Gold accent, icon glyph, typography hierarchy all remain — the content is unchanged. Users who need reduced motion lose nothing informational.

---

## 6. b4 — InsufficientScopeView (403)

**Identical motion spec to `TokenInvalidView`** with three surface-level swaps:

| Differs from 401 in | 401 | 403 |
|---|---|---|
| `data-component` | `TokenInvalidView` | `InsufficientScopeView` |
| Icon glyph | disconnected-link | key-ring-with-missing-key |
| Step-counter numeral border | Mulberry Dusk (`var(--primary)`) | Champagne Gold (`var(--accent)`) |

### 6a. Motion recipe

Everything from §5b, with the selector changed:

```css
[data-component="InsufficientScopeView"] {
  animation: view-settle 240ms ease-out both;
}

/* Same underline-grow + arrow nudge as TokenInvalidView */
[data-component="InsufficientScopeView"] .link-action { /* …same as 5b… */ }
[data-component="InsufficientScopeView"] .link-action::after { /* …same… */ }
[data-component="InsufficientScopeView"] .link-action:hover::after { width: 100%; }
[data-component="InsufficientScopeView"] .link-action .arrow { transition: transform 220ms ease; }
[data-component="InsufficientScopeView"] .link-action:hover .arrow { transform: translateX(2px); }
```

### 6b. Icon glyph decision — STATIC (same as 5c)

Same rationale. The distinction between 401 and 403 comes from the glyph shape (disconnected-link vs key-ring) and the step-counter border color (Mulberry vs Champagne Gold) — both visible before any motion resolves. Motion does not carry the 401/403 signal, which is correct: a color-blind or reduced-motion user still sees the distinction.

### 6c. Reduced-motion fallback

Identical to 5g with selector `[data-component="InsufficientScopeView"]` substituted throughout.

### 6d. Note on visual distinctness without motion

Option C rule 5 says "401 vs 403 must look visibly distinct at a glance." The motion spec is **identical** between the two views because:
- Making motion differ would confuse the signal. If 403 shimmered and 401 did not, users would conflate motion with severity.
- Both views are operator-facing remediation; both deserve the same composed tone.
- The glyph + step-counter color difference is already at-a-glance distinguishable without invoking motion.

---

## 7. b5 — Empty & retryable error states

### 7a. Surface inventory

| `data-component` | Element | Motion |
|---|---|---|
| `EmptyBoardsState` wrapper | Centered empty state, no boards from Pinterest | `view-settle` on mount, 240ms |
| `EmptyBoardState` wrapper | Same pattern, for a specific empty board | `view-settle` on mount, 240ms |
| Pushpin glyph | The minimal 40×40 glyph above the copy | **Static. No idle float.** (See decision 7c.) |
| Fraunces "No boards yet." / "This board is empty." | Copy block | Inherits parent fade |
| `BrowseErrorRetry` wrapper | Retryable browse error component | `view-settle` on mount, 240ms |
| Retry button (inside `BrowseErrorRetry`) | The one actionable affordance in b5 | Enhanced micro-interaction (see 7d) |

### 7b. Motion recipe

```css
[data-component="EmptyBoardsState"],
[data-component="EmptyBoardState"],
[data-component="BrowseErrorRetry"] {
  animation: view-settle 240ms ease-out both;
}

/* Retry button micro-interaction — b5 is where a LITTLE more life is earned */
[data-component="BrowseErrorRetry"] .retry-button {
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    box-shadow 220ms ease;
  will-change: transform;
}
[data-component="BrowseErrorRetry"] .retry-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px -8px color-mix(in oklab, var(--primary) 25%, transparent);
}
[data-component="BrowseErrorRetry"] .retry-button:active {
  transform: translateY(0);
  transition-duration: 80ms;
}

/* The retry icon (circular arrow) gets a quarter-rotation on hover — quiet, intentional */
[data-component="BrowseErrorRetry"] .retry-button .retry-icon {
  transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
}
[data-component="BrowseErrorRetry"] .retry-button:hover .retry-icon {
  transform: rotate(90deg);
}
```

### 7c. Pushpin glyph decision — STATIC (no idle float)

**Decision:** the pushpin glyph renders **statically** on both `EmptyBoardsState` and `EmptyBoardState`. No 3-4px float loop.

**Rationale:**
1. An idle float loop on an empty state draws the eye indefinitely. The purpose of an empty state is to communicate "there is nothing here" and offer next steps — not to hold attention.
2. Don's "pops of fun" is an affirm for motion + illustration, not an instruction to animate everything. The illustration IS the pop here. Motion would be redundant.
3. The pushpin glyph is a static object in real life. A floating pushpin reads as surreal/playful, which conflicts with the editorial, quietly-luxurious brand tone.
4. Under `prefers-reduced-motion`, the float would have to stop — meaning the animated version and the static version diverge, and the static version (for ~20% of users per WCAG best-practice estimates) would be the "correct" baseline anyway. Starting from static means every user sees the designed-canonical state.

**If a future iteration wants a flourish here, do it in the copy or the pin-color, not motion.**

### 7d. Retry button — where b5 earns a little more life

The retry button is the single actionable affordance across all three b5 states. It deserves micro-interactions slightly more expressive than the b4 link-action:

- **Hover:** `translateY(-1px)` lift + soft shadow + retry-icon `rotate(90deg)` over 240ms. The icon rotation telegraphs "this will refresh" — a learned visual pattern.
- **Active (press):** `translateY(0)` + faster 80ms transition — makes the button feel responsive and physical.

This is the ONE place in Epic B where a hover affordance does more than underline-grow. Reasoning: the retry button is the only CTA the user might need to press twice (if the first retry also fails). A snappier press feedback reduces the "did that register?" question.

### 7e. Timing rationale

- **240ms for `view-settle`** — consistent with b4. Empty states and remediation states share a "composed, quiet" tone.
- **180ms for button color/transform** — snappier than 220ms because buttons need to feel responsive. 180ms is at the edge of imperceptible-to-quick.
- **240ms cubic-bezier for icon rotate** — the custom curve gives the rotation a slight acceleration/deceleration that makes it feel mechanical (gear-turning) rather than floaty. Right for a retry gesture.
- **80ms active transition** — press feedback must feel like the button already moved before the user's finger lifted. Anything >120ms on active-state feels laggy.

### 7f. Reduced-motion fallback

```css
@media (prefers-reduced-motion: reduce) {
  [data-component="EmptyBoardsState"],
  [data-component="EmptyBoardState"],
  [data-component="BrowseErrorRetry"] { animation: none !important; }
  [data-component="BrowseErrorRetry"] .retry-button { transition: none !important; }
  [data-component="BrowseErrorRetry"] .retry-button:hover { transform: none !important; box-shadow: none !important; }
  [data-component="BrowseErrorRetry"] .retry-button:active { transform: none !important; }
  [data-component="BrowseErrorRetry"] .retry-button .retry-icon { transition: none !important; }
  [data-component="BrowseErrorRetry"] .retry-button:hover .retry-icon { transform: none !important; }
}
```

---

## 8. Reduced-motion master block

Paste this **once** per wireframe, after all component-specific `@media` overrides. It is the backstop — catches anything story-specific overrides missed:

```css
@media (prefers-reduced-motion: reduce) {
  /* Universal catch-alls — every animated class becomes instant */
  .sk-v1,
  .sentinel.fetching,
  .card-enter,
  [data-component$="View"],
  [data-component$="State"],
  [data-component$="Retry"],
  [data-component^="Board"],
  [data-component^="Pin"],
  [data-component$="Skeleton"] { animation: none !important; }

  /* Hover transforms neutralized; color-shifts preserved (still informational) */
  .card { transition: none !important; }
  .card:hover { transform: none !important; box-shadow: none !important; }
  .link-action::after { transition: none !important; width: 0 !important; }
}
```

**Why `!important`:** reduced-motion overrides must beat any later specificity. This block is a floor, not a suggestion.

---

## 9. What NOT to animate (explicit off-limits)

This list exists so the ui-designer does not over-animate. If you are tempted to animate something on this list, you have probably misread the Option C tone.

1. **b3 `BoardDetailHeader` text itself** — no letter-by-letter typewriter, no Fraunces stroke draw-in. The whole header fades in as one block.
2. **b3 `PinGrid` container** — only individual cards animate; the grid wrapper is static.
3. **b3 grid images** — no Ken Burns pan, no parallax on scroll, no image entrance animation beyond the card's own fade-in.
4. **b4 remediation content body** — explicitly called out in base template §5a and `_base-template.md` §10. No shimmer, no stagger, no per-step reveal on the ordered list.
5. **b4 icon glyph** — static (see 5c). No draw-in, no pulse, no hover animation on the glyph itself.
6. **b4 step-counter numerals** — the "1 / 2 / 3 / 4" circles are decorative-color accents, not motion surfaces. No count-up, no glow, no rotation.
7. **b4 `<em>` italic accent word** — Fraunces italic is already doing typographic work. No color-cycle, no underline dance.
8. **b5 pushpin glyph** — static (see 7c). No float, no bounce, no pulse.
9. **b5 dashed-line board outline** — if the wireframe renders the dashed board outline as a decorative element, no marching-ants animation. Static dashes.
10. **Anything using `width`, `height`, `top`, `left`, or `margin` as an animation property** — layout thrashing. The shimmer's `background-position` is the single intentional exception and it is contained to a compositor-promoted element.
11. **Anything over 600ms for a waiting-state entrance** — users are waiting for content, not a show. Idle loops (shimmer, breathe) may run longer because users aren't blocked on them.
12. **JavaScript animation libraries** — no GSAP, Framer Motion, Anime.js, Motion One, React Spring. Pure CSS only. This is a hard constraint, not a preference.

---

## 10. Animations audit checklist

Use this checklist when reviewing any b3/b4/b5 component implementation against this spec. Ten items; each should be verifiable in a minute or less.

1. **Compositor-only properties only** — grep the component's CSS for animated `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`. Expected: zero matches. Shimmer `background-position` is the one allowed exception, and only on elements with `.sk-v1`.
2. **`prefers-reduced-motion: reduce` overrides present** — every `@keyframes` reference has a corresponding `@media (prefers-reduced-motion: reduce) { … animation: none !important; }` rule. Zero orphan animations.
3. **Reduced-motion verified in devtools** — open Chrome devtools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → confirm the page still renders all content, no motion runs, no layout shift.
4. **60fps on a throttled device** — Performance panel, CPU throttling 4x, record a stagger-append of 9 cards. Expected: no red frames, no layout/paint spikes. If there are, the animation is using a non-compositor property.
5. **Shimmer contained to skeleton surfaces** — grep `.sk-v1` usage; it should ONLY appear on `BoardGridSkeleton`, `PinGridSkeleton`, `TokenRemediationLoadingSkeleton`. Never on `TokenInvalidView`, `InsufficientScopeView`, or any `*State` component.
6. **Stagger envelope ≤ 320ms** — in the PinGrid implementation, confirm `animationDelay` is clamped with `Math.min(i * 40, 320)` or equivalent. A page of 20+ cards must not produce a 1-second cascade.
7. **Hover transforms use `transform`, not layout** — grep `:hover` selectors; expected transforms are `translateY`, `translateX`, `scale`, `rotate`. Never animated `margin-top`, `top`, or `padding` on hover.
8. **`will-change` used sparingly** — only on the retry button (§7b). `will-change: transform` on every card would blow out GPU memory. Grep for `will-change`; count ≤ 3 instances across all Epic B components.
9. **Timing ladder respected** — entrances ≤300ms, hovers 150-220ms, idle loops ≥2s. Grep every `animation:` and `transition:` duration; flag any in the forbidden 400-700ms band (unless it is the glyph draw-in, which we decided against anyway).
10. **No JS animation libraries** — grep `package.json` dependencies for `gsap`, `framer-motion`, `motion`, `@motionone`, `react-spring`, `anime`, `popmotion`. Expected: zero matches.

If any item fails, the component is not ready for merge per Epic B's motion standard.

---

## 11. Disagreements with the base template

The base template `_base-template.md` §5 is solid. Two minor calibrations, not corrections:

1. **§5d (stagger) says "40ms between cards, total envelope ≤ 320ms" without clamping guidance.** This spec makes the clamp explicit: `Math.min(i * 40, 320)`. The base template implies the cap but does not prescribe what happens on a page of 20+ cards. Recommend inlining the clamp into the base template's §5d on next revision.
2. **§5 is missing a `view-settle` keyframe for whole-view fade-ins (b4, b5).** The base template has `card-enter` (4px translate) which is right for per-card entrances but feels jumpy applied to a whole-view remediation screen. This spec introduces `view-settle` (2px translate) as the composed-entrance alternative. Recommend adding `view-settle` to the base template's §5 shared keyframes on next revision.

Neither is a blocker. The wireframes can be produced against this spec as-is; the base template should absorb these on its next pass.

---

## Summary

**Motion principle for Epic B:** quiet, editorial, composed. Motion works WITH illustration, never LOUDER than it. Every animated surface has a reduced-motion twin. Compositor-only properties except the contained shimmer. No JS libraries.

**The three load-bearing decisions in this spec:**
1. **b3 stagger = 40ms increment, 320ms envelope cap, clamped** — any more and new-page loads feel sluggish.
2. **b4 icon glyphs are static** — motion should not be the thing that distinguishes 401 from 403; color + shape already do that, and they stay distinguishable under reduced-motion.
3. **b5 pushpin glyph is static** — empty states communicate absence; idle motion contradicts that message.

This spec is the reference the ui-designer consumes. If something ambiguous comes up during wireframe production, fall back to these three principles before adding motion.

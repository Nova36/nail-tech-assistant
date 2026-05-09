# Claude Design — Epic E ChatRefinementPanel Wireframes

**Use this prompt in Claude Design.** Brand-system already loaded for nail-tech-assistant — reference tokens by name, do not redefine.

---

## Goal

Wireframe **ChatRefinementPanel** + optional **IterationTimeline** for Epic E (Chat Refinement, Slice 7) of the Nail Tech Assistant. Surface lives on the saved-design detail page (`/design/[id]`), inserted into the success branch of `Confirm.tsx` after `VisualizerFrame`.

**User flow:** nail technician opens a saved design → types refinement messages like "make it more pastel" or "add gold accents" → app generates a new image attached to that design → repeats up to 5 turns. Panel must show ordered turn history, current-image clarity, pending/success/failure state per turn, and a clean "session full" terminal state at turn 5.

**Tablet-first.** Primary device: landscape iPad. Secondary: portrait. Phone scope is one of the 5 decisions below.

---

## Hard constraints

- **Insertion context:** Confirm.tsx already renders `VisualizerFrame` + prompt display + "Back to adjust" button stack. Panel mounts AFTER VisualizerFrame, BEFORE "Back to adjust." No existing two-column shell — picking layout is decision #1.
- **Brand system:** locked at `.pHive/brand/brand-system.yaml`. Use loaded tokens. No new palette, no new type ramp.
- **States panel must surface per turn:** `pending` (turn persisted, generation in flight), `success` (generation linked + visualizer updated), `failure` (turn persisted, generation errored — must NOT look like an orphan).
- **Current-image indicator:** user must always be able to tell which generation is currently shown in the visualizer relative to the turn list.
- **Hard cap:** 5 turns per session. Turn 5 input → submitted, turn 6 input → disabled with "session full" message.
- **Empty/whitespace input:** disabled submit button, no API call.
- **Max input length:** 500 chars; surface count near limit.
- **No animations spec yet** — call out where motion would help (state transitions, image swap) but defer specifics.

---

## 5 open decisions to resolve in the wireframes

The wireframe IS the answer to these. Show one variant per decision (or a clearly labeled best-pick if multiple feel equivalent):

1. **Tablet landscape layout.** Where does the panel sit relative to the visualizer?
   - Options: `right-side-drawer` (40/60 split, panel right), `bottom-strip` (visualizer top 60%, panel bottom 40%), `split-30pct` (visualizer 70%, panel right 30%).
   - PRD ref: FR-E-4 / NFR UX. Tablet landscape is primary.

2. **IterationTimeline separation.** Does the panel's own scrolling turn-history suffice, or does the visualizer area need a separate horizontal/vertical strip of generation thumbnails tied to chat turns?
   - Options: `collapse-into-panel` (no separate timeline; panel scroll = history), `separate-component` (compact thumbnail strip in visualizer area).
   - Source: Slice 7 manifest item #8 is conditional. Cheaper path is `collapse-into-panel`.

3. **Orphaned-turn failure UX.** When a turn persists but generation fails, how is it shown?
   - Options: `inline-error-badge-retry` (turn row shows red badge + "Retry" button), `system-message-retry` (turn row neutral, system message below offers retry), `dismissible-banner` (full-width banner above panel with retry).
   - PRD ref: FR-E-6 / US-E-2 AC2. The user must understand the message was persisted but generation didn't land.

4. **Current-image indicator.** How does the user know which turn produced the visualizer's current image?
   - Options: `auto-latest-badge` (latest successful turn shows "Current" badge automatically), `user-selectable` (user can tap any successful turn to load its image into visualizer).
   - PRD ref: US-E-2 AC1. `auto-latest-badge` is simpler; `user-selectable` enables comparison.

5. **Phone scope.** Does this surface need to work on phone screens, or tablet-only?
   - Options: `tablet-only` (responsive break: redirect or fallback message on phone), `first-class-phone` (panel collapses cleanly to single-column).
   - PRD ref: NFR UX. Project profile says tablet-first; phone is secondary if cheap.

---

## Components to wireframe

### ChatRefinementPanel (required)

- **Header:** turn counter (e.g., "Turn 3 of 5") + design name (read-only context).
- **Turn list (scrollable, ordered ascending):**
  - Each row: turn index, message text, state badge (pending/success/failure), timestamp (relative: "2m ago"), "current" indicator if relevant per decision #4.
  - On `failure`: state badge variant + retry affordance per decision #3.
- **Input area:**
  - Multi-line text input, max 500 chars, char counter near limit.
  - Submit button (disabled when input empty/whitespace, or session at 5 turns).
  - "Session full" terminal state at turn 5: input disabled with explanatory message, link to start new design.
- **Empty state:** when no turns yet — friendly prompt suggesting "make it more pastel" / "add gold accents" example messages.
- **Loading state:** when current turn is `pending` — submit area disabled, latest row shows pending indicator.

### IterationTimeline (conditional — decision #2)

If `separate-component`: compact horizontal strip of generation result thumbnails (~60×60px), one per successful turn, ordered chronologically, current one highlighted. Lives in the visualizer area, not the panel.

If `collapse-into-panel`: no wireframe needed.

---

## Layout deliverables

For decision #1, produce three layout variants (right-side-drawer, bottom-strip, split-30pct) at:

- iPad landscape (1180×820)
- iPad portrait (820×1180)
- iPhone 14 (390×844) — only if decision #5 lands as `first-class-phone`

For each variant, show:

- Empty state (no turns)
- Active state (3 turns: 2 success + 1 pending)
- Terminal state (5 turns at session full, with one failed turn showing decision #3 UX)
- Failure state isolated (one turn failed mid-session)

---

## Output format

Single HTML file at `.pHive/wireframes/epic-e-chat-refinement/wireframes.html` showing all variants side-by-side with labels. Use brand tokens. After Don approves the layout choice, produce `.pHive/wireframes/epic-e-chat-refinement/manifest.yaml` recording the chosen options for each of the 5 decisions and `wireframe_approval.status: approved`.

```yaml
# manifest.yaml shape
wireframe_approval:
  status: approved
  approved_at: <ISO>
  decisions:
    tablet-landscape-layout: <chosen option>
    iteration-timeline-separation: <chosen option>
    orphaned-turn-failure-ux: <chosen option>
    current-image-indicator: <chosen option>
    phone-scope: <chosen option>
artifacts:
  - .pHive/wireframes/epic-e-chat-refinement/wireframes.html
notes: <any rationale Don wants captured>
```

## Reference for Claude Design

- Brand system already loaded — use tokens by name
- PRD Epic E: `/Users/don/Documents/GitHub/Nail Tech Assitant/.pHive/planning/prd.md` lines 618-700
- Slice 7 manifest: `/Users/don/Documents/GitHub/Nail Tech Assitant/.pHive/planning/structured-outline.md` lines 420-465
- Insertion-point precedent (Confirm.tsx success branch): research-brief §UI integration surface
- Existing visualizer to anchor against: `components/visualizer/NailVisualizer.tsx`, `components/visualizer/VisualizerFrame.tsx`

## Out of scope

- Animation specifics (call out where motion helps; defer choreography)
- Final color/typography decisions (use brand tokens by name)
- Implementation code
- Backend/API design

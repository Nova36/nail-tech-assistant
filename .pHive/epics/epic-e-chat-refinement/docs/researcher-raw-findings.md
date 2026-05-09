# Researcher Raw Findings — Epic E: Chat Refinement

---

## Q1: Saved-Design Lineage Contract

### How a design is persisted today

**createDesignDraft** (`lib/designs/lifecycle.ts:41-105`):

- Creates `Design` object with fields: `id`, `userId`, `name`, `primaryReferenceId`, `secondaryReferenceIds`, `promptText`, `nailShape`, `latestGenerationId` (null), `createdAt`, `updatedAt`
- Writes to `designs/{designId}` via `db.collection('designs').doc(designId).withConverter(designConverter).set(design)`

### Firestore schema — `designs` collection

Fields (from `lib/firestore/converters/designs.ts:36-73`):

```
userId: string
name: string | null
primaryReferenceId: string
secondaryReferenceIds: string[]
promptText: string | null
nailShape: NailShape  (stored as 'nail_shape' on-disk per shape-state.ts:51)
latestGenerationId: string | null
createdAt: string (ISO)
updatedAt: string (ISO)
```

NOTE: `fromFirestore` reads both `data.nail_shape` and `data.nailShape` (line 51) — on-disk key may be `nail_shape` (snake_case). The converter merges both.

### Firestore schema — `generations` collection

Fields (from `lib/firestore/converters/generations.ts:50-99`):

```
designId: string
userId: string  (denormalized — rules enforce ownership without parent lookup)
requestJson: unknown  (full provider request stored for lineage)
resultStoragePath: string | null
providerResponseMetadata: unknown | null
status: 'pending' | 'success' | 'failure'
errorCode: GenerationErrorCode | null
errorMessage: string | null
createdAt: string (ISO)
updatedAt: string (ISO)
```

### What GET /api/designs/[id] returns (d6 hydration shape)

Route: `app/api/designs/[id]/route.ts:21-77`

Response shape:

```ts
{
  design: Design,                        // full Design object (id included via converter)
  references: {
    primary: Reference | null,
    secondary: Reference[],
    staleReferenceCount: number,
    primaryReferenceMissing?: true
  },
  latestGeneration: ApiGeneration        // Generation with resultStoragePath stripped, imageUrl added for 'success' status
}
```

`loadDesignDetail` (`lib/designs/load.ts:25-122`):

- Reads design doc with converter (returns null if not found or cross-user)
- Batch-resolves primary + secondary references in parallel via `Promise.all`
- Resolves `latestGeneration` from `design.latestGenerationId` if present
- Surfaces `staleReferenceCount` (increments for each missing primary or secondary ref)
- `primaryReferenceMissing: true` appended when primary is null

Route handler (`app/api/designs/[id]/route.ts:44-55`):

- For `latestGeneration.status === 'success'`: resolves `resultStoragePath` to a signed `imageUrl`, then deletes `resultStoragePath` from the response payload

### How d8 constructs a generation from stored design inputs

d8 story (`d8-regenerate-from-stored-inputs.yaml`):

- Calls `loadDesignDetail` (d6 loader) to get stored `primaryReference`, `secondaryReferences`, `promptText`, `nailShape` — NOT from request body
- If `staleReferenceCount > 0`, returns controlled failure without calling provider
- Calls `lifecycle.persistGenerationStart` → provider generate → `lifecycle.persistGenerationResult`
- Uses `lib/ai/buildGeminiRequest.ts` (from c14) with stored inputs only

### Lineage path design → generation (Epic E attachment point)

`persistGenerationResult` (`lib/designs/lifecycle.ts:228-333`):

- Lines 300-316: atomic Firestore transaction updates both:
  - `generations/{generationId}`: status='success', resultStoragePath, metadata
  - `designs/{designId}`: `latestGenerationId = generationId`
- This transaction is the canonical lineage attachment point
- Epic E chat turns must reference both the `designId` AND the resulting `generationId`
- The `requestJson` field on `generations` already stores the full provider request — chat turns can store the refinement message that produced the next generation

---

## Q2: Firestore Rules + Indexes Precedent

### User-scoping pattern

`firestore.rules`:

- All collections gate on `request.auth != null && resource.data.userId == request.auth.uid`
- `designs/{designId}` (lines 27-49): read/create/update/delete all scoped to `userId` field
  - Two update rules: shape-only (`nail_shape + updatedAt`) and name-only (`name + updatedAt`)
  - Clients can ONLY mutate those two field sets; all other mutations go via Admin SDK
- `generations/{generationId}` (lines 51-65): same userId pattern, update allows all fields (lifecycle transitions not enforced client-side)
- `references/{refId}` (lines 11-21): same pattern
- Default deny-all catch-all at lines 71-73: `match /{document=**} { allow read, write: if false; }`

**Convention:** New collections (e.g. `chat_turns`) must add explicit rules ABOVE the default deny. Pattern to mirror:

```
match /chat_turns/{turnId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  // update/delete rules scoped to specific allowed field sets
}
```

### Indexes on designs and generations

`firestore.indexes.json`:

```
designs:    [userId ASC, createdAt DESC]   — supports library grid query
generations: [designId ASC, createdAt DESC] — supports turn-ordered generation history per design
references:  [userId ASC, createdAt DESC]
```

Epic E will need a `chat_turns` index: `[designId ASC, createdAt ASC]` (ordered oldest-first for accumulation) and potentially `[userId ASC, createdAt DESC]` for ownership queries.

### Canonical converter pattern

`lib/firestore/converters/designs.ts` — canonical example:

- Imports `FirestoreDataConverter` from `firebase-admin/firestore`
- `toFirestore`: strips `id`, maps typed fields to plain object
- `fromFirestore`: reads `snapshot.id` to restore `id`, validates enums, defaults optional fields to null/[]
- Usage: `.collection('designs').doc(id).withConverter(designConverter).get()`

`lib/firestore/converters/index.ts` re-exports all converters for single-import access.

### Canonical route handler wiring rules → route → converter

`app/api/designs/[id]/route.ts` (full file, 77 lines) — complete example:

- Auth: `getSession(req)` returns `session.uid`
- Converter: `loadDesignDetail` internally calls `.withConverter(designConverter)` and `.withConverter(referenceConverter)`
- Rules: `loadDesignDetail` returns null for cross-user (rule denial + ownership check)
- Response: returns typed JSON, strips sensitive fields (resultStoragePath)
- Error: catch logs `code + message`, returns 500

---

## Q3: UI Component Patterns to Reuse

### Layout shell

`app/(authenticated)/design/[designId]/page.tsx` (server component, 49 lines):

- Uses `getSessionForServerAction()` for auth (NOT `getSession(req)` — that's for route handlers)
- Calls `loadDesignDetail` directly (server component data fetch, no fetch() call)
- Passes hydration props to `<Confirm>` client component
- Layout: `<main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">`

### Where ChatRefinementPanel would sit

`Confirm.tsx` (client component, 334 lines) contains the full design page state machine:

- State: `GenerationState` = idle | pending | success | failure
- Active layout (success branch, lines 253-314):
  - `<VisualizerFrame>` containing `<NailVisualizer>` + `<ShapeSelector>`
  - Prompt display block (read-only)
  - "Back to adjust" navigation
- **ChatRefinementPanel natural insertion point**: after the `<VisualizerFrame>` block and prompt display, before the "Back to adjust" button — or as a sidebar in a 2-col layout. Currently no sidebar structure; adding one requires `Confirm.tsx` layout restructure.

### State/actions pattern

- **Server actions** used for generate: `generateDesign` imported dynamically from `app/(authenticated)/design/actions.ts` (line 58-59 in Confirm.tsx)
- **Route handlers** used for PATCH shape: direct `fetch('/api/designs/${designId}/shape', { method: 'PATCH' })` (lines 193-203)
- Chat route will follow the route handler pattern (not server action) — POST /api/designs/[id]/chat per structured-outline Slice 7 spec

### Hydration from GET design loader

Page hydrates `Confirm.tsx` with:

```ts
<Confirm
  designId={designDetail.design.id}
  nailShape={designDetail.design.nailShape}
  promptText={designDetail.design.promptText}
  latestGenerationId={designDetail.design.latestGenerationId}
  initialImageUrl={initialImageUrl}  // signed URL for success state
/>
```

Epic E will need `initialChatTurns?: ChatTurn[]` added to ConfirmProps for panel hydration on reopen.

### NailVisualizer props

`components/NailVisualizer/NailVisualizer.tsx`:

- Props: `theme: 'flat' | 'line-art'`, `imageUrl: string | null`, `nailShape: NailShape`, `onImageError?: () => void`
- SVG viewBox: `0 0 1280 540` — 5 fan-arranged nail anchors, no hand silhouette
- `VisualizerFrame` is a thin wrapper: `<div className="visualizer-frame">{children}</div>`

### Turn-history-style components

No existing turn-history, timeline, or chat components found anywhere in the repo. `components/studio/` has generation state components (GenerationPreview, GenerationErrorState, GenerateButton) but no conversation/turn UI. Epic E must build ChatRefinementPanel and IterationTimeline from scratch.

---

## Validation Note

CHECKED:

- firebase-admin: used throughout codebase via Admin SDK. Converter pattern is stable. No context7 lookup needed — codebase patterns are authoritative.
- @google/genai (vertexai:true): established in c1 spike and confirmed in d8 story context. lib/ai/buildGeminiRequest.ts referenced but not read (out of scope). Flag for writer: verify c14/buildGeminiRequest signature before writing chat-generation prompt.
- zod: used in Epic C reference validation. Not directly in lifecycle.ts or converters — converters use manual validation. No Zod schema for Design or Generation types. Flag: Epic E chat turn schema may want Zod for route input validation — check existing zod usage pattern in lib/ before writing.
- next/headers + getSessionForServerAction: confirmed pattern at page.tsx:17. Server actions use `getSessionForServerAction()`; route handlers use `getSession(req)`. Chat route (route handler) must use `getSession(req)`.

SOURCE: codebase-only (no context7 runs — all findings derived from direct file reads)
CONFIDENCE: high for lineage + rules + converter patterns; medium for zod usage in Epic E (need to check lib/ zod patterns)

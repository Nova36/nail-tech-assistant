# c16 Research Brief — `generateDesign` Server Action

## 1. Surface lock

**Server action.** Spike P95 = **8.83s** (well under the 30s threshold). No route handler will be added.

---

## 2. Canonical-code corrections

The story spec's Path A code block contains several mismatches with the real source. Corrected below.

### 2a. Session helper

```
// WRONG (spec canonical)
const session = await getSession();

// RIGHT
const session = await getSessionForServerAction();
```

Evidence (`lib/firebase/session.ts`):

- `getSession` at line 64: `export async function getSession(req: NextRequest): Promise<Session | null>` — takes a `NextRequest`; unusable in a server action.
- `getSessionForServerAction` at line 68: `export async function getSessionForServerAction(): Promise<Session | null>` — zero-arg, reads from `next/headers` cookies. This is the correct helper.

### 2b. Firestore handle pattern

`createDesign` (`app/(authenticated)/design/actions.ts:54`) does NOT obtain a Firestore handle directly — it delegates entirely to `createDesignDraft` from `lib/designs/lifecycle`. Inside `createDesignDraft` (`lib/designs/lifecycle.ts:75`), the pattern is:

```ts
const db = getFirestore(createServerFirebaseAdmin());
```

`generateDesign` must obtain a design + references BEFORE calling `persistGenerationStart`, so it needs its own handle. Reuse the same pattern:

```ts
import { getFirestore } from 'firebase-admin/firestore';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';

const db = getFirestore(createServerFirebaseAdmin());
```

This is already what the spec canonical block shows, and it matches lifecycle. No correction needed here — just confirm the pattern is consistent.

### 2c. `bucket.file(...)` argument and signed-URL options

The spec canonical block computes the file path inline:

```ts
const filePath = `users/${session.uid}/generations/${generationId}.${
  outcome.mimeType === 'image/jpeg' ? 'jpg' : 'png'
}`;
const file = bucket.file(filePath);
```

The **correct** form uses `generationPath()` from `lib/firebase/storage.ts`:

```ts
import {
  getServerFirebaseStorage,
  generationPath,
} from '@/lib/firebase/storage';

const ext = outcome.mimeType === 'image/jpeg' ? 'jpg' : 'png';
const filePath = generationPath(session.uid, generationId, ext);
// → "users/{uid}/generations/{generationId}.jpg"  (no leading dot — normalizeExtension strips it)
const bucket = getServerFirebaseStorage();
const [signedUrl] = await bucket.file(filePath).getSignedUrl({
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000,
});
```

`generationPath` (`lib/firebase/storage.ts:127-135`) calls `normalizeExtension(ext)` which strips a leading dot, so `'png'` and `'.png'` are both safe — pass without leading dot to match the existing callers.

`uploadGenerationBytes` (`lib/firebase/storage.ts:186`) calls `generationPath(input.uid, input.genId, ext)` with the same shape, so the signed-URL path and the upload path are guaranteed to match.

### 2d. `generate` argument shape

`generate` takes `GenerateInput` (`lib/ai/generate.ts:13-18`):

```ts
export interface GenerateInput {
  primaryReference: Reference;
  secondaryReferences: Reference[];
  promptText: string | null;
  nailShape: NailShape;
}
```

Call site must resolve the `Reference` objects fully (not just IDs) before calling `generate`. The spec canonical block does this correctly.

### 2e. `persistGenerationStart` argument shape

`persistGenerationStart` (`lib/designs/lifecycle.ts:119-123`) takes:

```ts
input: {
  userId: string;
  designId: string;
  requestJson: unknown;
}
```

Returns `PersistGenerationStartResult` (`lib/designs/lifecycle.ts:107-117`):

- Success: `{ ok: true; generationId: string }`
- Failure reasons: `'design_not_found' | 'design_unauthorized' | 'rules_denied' | 'firestore_failure'`

### 2f. `persistGenerationResult` argument shape

`persistGenerationResult` (`lib/designs/lifecycle.ts:228-232`) takes:

```ts
input: {
  generationId: string;
  userId: string;
  designId: string;
  outcome: GenerateResult;
}
```

Returns `PersistGenerationResultResult` (`lib/designs/lifecycle.ts:204-210`):

- Success: `{ ok: true }`
- Failure reasons: `'storage_fail' | 'firestore_failure' | 'unknown'`

**Important:** when `outcome.ok === false` (provider failure), `persistGenerationResult` still returns `{ ok: true }` after writing the failure row. The caller should check `outcome.ok` AFTER checking `persisted.ok`. The spec canonical block does this correctly (`if (!persisted.ok)` first, then `if (!outcome.ok)`).

---

## 3. Reason → errorCode mapping table

| Source module                  | Raw `reason`              | Target `GenerateDesignErrorCode` |
| ------------------------------ | ------------------------- | -------------------------------- |
| `persistGenerationStart`       | `design_not_found`        | `design_not_found`               |
| `persistGenerationStart`       | `design_unauthorized`     | `design_unauthorized`            |
| `persistGenerationStart`       | `rules_denied`            | `unknown`                        |
| `persistGenerationStart`       | `firestore_failure`       | `unknown`                        |
| `lib/ai/generate` (`generate`) | `refusal`                 | `refusal`                        |
| `lib/ai/generate` (`generate`) | `rate_limit`              | `rate_limit`                     |
| `lib/ai/generate` (`generate`) | `network`                 | `network`                        |
| `lib/ai/generate` (`generate`) | `low_quality`             | `low_quality`                    |
| `lib/ai/generate` (`generate`) | `missing_reference_bytes` | `unknown`                        |
| `lib/ai/generate` (`generate`) | `primary_required`        | `invalid_input`                  |
| `persistGenerationResult`      | `storage_fail`            | `storage_fail`                   |
| `persistGenerationResult`      | `firestore_failure`       | `unknown`                        |
| `persistGenerationResult`      | `unknown`                 | `unknown`                        |

Final `GenerateDesignErrorCode` union:

```ts
type GenerateDesignErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'design_not_found'
  | 'design_unauthorized'
  | 'refusal'
  | 'rate_limit'
  | 'network'
  | 'low_quality'
  | 'storage_fail'
  | 'unknown';
```

Note: `GenerationErrorCode` in `lib/types.ts:19-23` is `'refusal' | 'rate_limit' | 'network' | 'unknown'` — 4-wide. The `GenerateDesignErrorCode` above is the surface-layer extension and is intentionally wider.

---

## 4. Image URL strategy

Use a 15-minute signed URL via the Storage Admin SDK:

```ts
import {
  getServerFirebaseStorage,
  generationPath,
} from '@/lib/firebase/storage';

// mime → ext mapping
const ext =
  outcome.mimeType === 'image/jpeg'
    ? 'jpg'
    : outcome.mimeType === 'image/png'
      ? 'png'
      : 'png'; // fallback

const filePath = generationPath(session.uid, generationId, ext);
const bucket = getServerFirebaseStorage();
const [signedUrl] = await bucket.file(filePath).getSignedUrl({
  action: 'read',
  expires: Date.now() + 15 * 60 * 1000,
});
return { status: 'success', generationId, imageUrl: signedUrl };
```

`generationPath` body (`lib/firebase/storage.ts:127-135`):

```ts
export function generationPath(
  uid: string,
  genId: string,
  ext: string
): string {
  if (!uid) throw new Error('generationPath: uid required');
  if (!genId) throw new Error('generationPath: genId required');
  return `users/${uid}/generations/${genId}.${normalizeExtension(ext)}`;
}
```

`normalizeExtension` strips a leading dot, so pass `'png'` not `'.png'`. This path matches exactly what `uploadGenerationBytes` (`lib/firebase/storage.ts:186`) writes during `persistGenerationResult`, so the signed-URL file pointer is guaranteed to resolve.

---

## 5. Tester hints (Claude)

### File list (4 unit + 1 integration; NO route-handler test — surface is locked to server action)

```
tests/unit/actions/generate-design-happy-path.test.ts
tests/unit/actions/generate-design-auth-context.test.ts
tests/unit/actions/generate-design-error-paths.test.ts
tests/unit/actions/generate-design-storage-url.test.ts  (signed-URL path)
tests/integration/designs/generate-design-end-to-end.test.ts
```

### Mock targets (unit tests)

- `getSessionForServerAction` from `@/lib/firebase/session`
- `generate` from `@/lib/ai/generate`
- `persistGenerationStart` from `@/lib/designs/lifecycle`
- `persistGenerationResult` from `@/lib/designs/lifecycle`
- `getServerFirebaseStorage` from `@/lib/firebase/storage` — return a fake `Bucket` whose `.file(path).getSignedUrl(opts)` resolves to `['https://storage.example.com/signed-url']`
- Firestore admin `.collection('designs').doc(id).withConverter(...).get()` and `.collection('references').doc(id).withConverter(...).get()` — use `vi.mock('firebase-admin/firestore')` or inject via a helper stub

### Signed-URL snapshot safety

`Date.now() + 15 * 60 * 1000` produces a non-deterministic `expires` value. In tests, either:

- Pin `Date.now` with `vi.setSystemTime(new Date('2026-01-01'))` before each relevant test, or
- Assert only that `getSignedUrl` was called with `action: 'read'` and that `imageUrl` is a string, not the exact URL.

### `PINTEREST_ACCESS_TOKEN` stub (every unit test file)

`app/(authenticated)/design/actions.ts` re-exports `selectPinterestPin`, which transitively imports `lib/pinterest/client` at module load, which reads `process.env.PINTEREST_ACCESS_TOKEN`. Add this at the top of every unit test file:

```ts
process.env.PINTEREST_ACCESS_TOKEN = 'test';
```

### Integration test config

`vitest.config.rules.ts` at line 35 already includes:

```ts
'tests/integration/designs/**/*.test.ts',
```

No include-line addition needed. The integration test at `tests/integration/designs/generate-design-end-to-end.test.ts` will be picked up automatically.

The integration test should add `@vitest-environment node` per-file directive (jsdom's `Request` polyfill does not handle multipart — and even though c16 is not a route, the emulator calls use Node HTTP):

```ts
// @vitest-environment node
```

---

## 6. Developer hints (Codex)

**All changes live in `app/(authenticated)/design/actions.ts`.** No route handler, no new files.

Sequential pipeline order (must not be reordered):

1. `getSessionForServerAction()` → unauthorized guard
2. Validate `designId` (trim, non-empty) → `invalid_input` guard
3. `getFirestore(createServerFirebaseAdmin())` → load design doc with `withConverter(designConverter)`
4. Ownership check (`design.userId !== session.uid`) → `design_unauthorized` guard
5. Load all reference docs with `withConverter(referenceConverter)` — parallel `Promise.all` is fine
6. Missing reference guard → `unknown` (or fail fast with a descriptive message)
7. `persistGenerationStart({ userId, designId, requestJson })` → map failure reasons per §3
8. `generate({ primaryReference, secondaryReferences, promptText, nailShape })`
9. `persistGenerationResult({ generationId, userId, designId, outcome })`
10. If `!persisted.ok` → map `persisted.reason` per §3 and return failure
11. If `!outcome.ok` → map `outcome.reason` per §3 and return failure
12. Mint signed URL via `generationPath` + `getServerFirebaseStorage().file(path).getSignedUrl(...)` per §4
13. Return `{ status: 'success', generationId, imageUrl: signedUrl }`

Rules:

- Do NOT import `firebase-admin/firestore` for the `FieldValue`/admin-only APIs — `getFirestore` is enough
- Reuse `withConverter(designConverter)` and `withConverter(referenceConverter)` from `@/lib/firestore/converters`
- No `try/catch` shims masking errors, no `// @ts-ignore`, no node_modules patches
- `cta: 'adjust_inputs'` on every failure branch

---

## 7. Acceptance self-check

| AC (from c16-generate-design-surface.yaml)                                                                    | Test file                              |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Authenticated session + valid design → success envelope with `generationId` + `imageUrl`                      | `generate-design-happy-path.test.ts`   |
| No session → `errorCode: 'unauthorized'`; provider NOT called                                                 | `generate-design-auth-context.test.ts` |
| `persistGenerationStart` returns `design_not_found` → `errorCode: 'design_not_found'`; `generate` NOT called  | `generate-design-error-paths.test.ts`  |
| `generate` returns `refusal` → `persistGenerationResult` called with failure; envelope `errorCode: 'refusal'` | `generate-design-error-paths.test.ts`  |
| c14 success + c15 success → `imageUrl` resolves bytes at `users/{uid}/generations/{genId}.png`                | `generate-design-end-to-end.test.ts`   |
| `persistGenerationResult` returns `storage_fail` → envelope `errorCode: 'storage_fail'`                       | `generate-design-error-paths.test.ts`  |
| `generate` returns `missing_reference_bytes` → `errorCode: 'unknown'`                                         | `generate-design-error-paths.test.ts`  |
| `generateDesign` lives in `app/(authenticated)/design/actions.ts` (same module as c9/c10)                     | Grep AC — reviewer check               |
| Path B (route handler) ACs — **OUT OF SCOPE** (spike lock = server action)                                    | —                                      |
| Imports only `lib/firebase/session`, `lib/designs/lifecycle`, `lib/ai/generate`, supporting types             | Grep AC — reviewer check               |
| `metadata.retryCount` + `metadata.durationMs` on generation row                                               | `generate-design-end-to-end.test.ts`   |

ACs with no unit test home (grep-only):

- "imports ONLY …" and "lives in same module as c9/c10" are reviewer grep checks, not automated. Codex should ensure compliance; reviewer confirms.

---

## 8. Open risks

**Concurrent calls:** out of scope per story §risks low. c15 accepts two pending rows; no corruption risk.

**Signed-URL expiry in test snapshots:** non-deterministic `expires` value. Fix: `vi.setSystemTime(new Date('2026-01-01'))` in relevant unit tests, or assert only that `imageUrl` is a non-empty string (preferred for snapshot stability).

**Integration-config gap:** `vitest.config.rules.ts:35` already includes `tests/integration/designs/**/*.test.ts` — no gap. However, the integration test must mock `generate` from `@/lib/ai/generate` to avoid live Vertex AI calls during emulator runs. The emulator covers Firestore + Storage; the AI provider must always be mocked in the integration lane.

**`rules_denied` reason from `persistGenerationStart`:** this reason is NOT in `reasonToCode` in the spec canonical block. It must be added (maps to `'unknown'` per §3 table, or handled as a separate `errorCode` — brief recommends `'unknown'` to stay within the 10-member union).

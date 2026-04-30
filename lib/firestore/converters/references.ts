/**
 * c3-data-model-types-converters — Firestore converter for the `references`
 * collection.
 *
 * Pure data translator. NO `'server-only'` import, NO `firebase-admin/app`
 * import, NO `process.env.*` lookup. SDK side effects (admin init,
 * `withConverter` registration) happen at the call site, not here.
 *
 * Validation closure: `source` must be `'pinterest' | 'upload'`. Other fields
 * pass through; downstream story c6 enforces the
 * `pinterestPinId !== null when source === 'pinterest'` invariant at ingest
 * time per design_decisions in this story.
 */
import type { Reference, ReferenceSource } from '@/lib/types';
import type { FirestoreDataConverter } from 'firebase-admin/firestore';

const REFERENCE_SOURCES: readonly ReferenceSource[] = ['pinterest', 'upload'];

function isReferenceSource(value: unknown): value is ReferenceSource {
  return (
    typeof value === 'string' &&
    (REFERENCE_SOURCES as readonly string[]).includes(value)
  );
}

export const referenceConverter: FirestoreDataConverter<Reference> = {
  toFirestore(ref) {
    const r = ref as Reference;
    return {
      userId: r.userId,
      source: r.source,
      sourceUrl: r.sourceUrl,
      storagePath: r.storagePath,
      pinterestPinId: r.pinterestPinId,
      createdAt: r.createdAt,
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    if (!isReferenceSource(data.source)) {
      throw new Error(
        `referenceConverter: invalid source: ${String(data.source)}`
      );
    }
    return {
      id: snapshot.id,
      userId: data.userId as string,
      source: data.source,
      sourceUrl: (data.sourceUrl ?? null) as string | null,
      storagePath: data.storagePath as string,
      pinterestPinId: (data.pinterestPinId ?? null) as string | null,
      createdAt: data.createdAt as string,
    };
  },
};

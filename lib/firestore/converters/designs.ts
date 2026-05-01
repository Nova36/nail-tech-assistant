/**
 * c3-data-model-types-converters — Firestore converter for the `designs`
 * collection.
 *
 * Pure data translator. fromFirestore defaults missing optional fields:
 *   secondaryReferenceIds → []
 *   promptText           → null
 *   latestGenerationId   → null
 *   name                 → null
 *
 * Validation closure: `nailShape` must be in the existing `NailShape` union
 * from `lib/types.ts`. Outline-vs-code drift on `'stiletto'` is deferred to
 * a separate `lib/types.ts` change per design_decisions.
 */
import type { Design, NailShape } from '@/lib/types';
import type { FirestoreDataConverter } from 'firebase-admin/firestore';

const NAIL_SHAPES: readonly NailShape[] = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
];

function isNailShape(value: unknown): value is NailShape {
  return (
    typeof value === 'string' &&
    (NAIL_SHAPES as readonly string[]).includes(value)
  );
}

export const designConverter: FirestoreDataConverter<Design> = {
  toFirestore(design) {
    const d = design as Design;
    return {
      userId: d.userId,
      name: d.name,
      primaryReferenceId: d.primaryReferenceId,
      secondaryReferenceIds: d.secondaryReferenceIds,
      promptText: d.promptText,
      nailShape: d.nailShape,
      latestGenerationId: d.latestGenerationId,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    if (!isNailShape(data.nailShape)) {
      throw new Error(
        `designConverter: invalid nailShape: ${String(data.nailShape)}`
      );
    }
    const secondary = Array.isArray(data.secondaryReferenceIds)
      ? (data.secondaryReferenceIds as string[])
      : [];
    return {
      id: snapshot.id,
      userId: data.userId as string,
      name: (data.name ?? null) as string | null,
      primaryReferenceId: data.primaryReferenceId as string,
      secondaryReferenceIds: secondary,
      promptText: (data.promptText ?? null) as string | null,
      nailShape: data.nailShape,
      latestGenerationId: (data.latestGenerationId ?? null) as string | null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  },
};

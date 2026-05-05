import 'server-only';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import {
  designConverter,
  generationConverter,
  referenceConverter,
} from '@/lib/firestore/converters';

import type { Design, Generation, Reference } from '@/lib/types';

export type DesignDetail = {
  design: Design;
  references: {
    primary: Reference | null;
    secondary: Reference[];
    staleReferenceCount: number;
    primaryReferenceMissing?: true;
  };
  latestGeneration: Generation | null;
};

export async function loadDesignDetail(input: {
  designId: string;
  userId: string;
}): Promise<DesignDetail | null> {
  const db = getFirestore(createServerFirebaseAdmin());

  try {
    const designSnap = await db
      .collection('designs')
      .doc(input.designId)
      .withConverter(designConverter)
      .get();

    if (!designSnap.exists) {
      return null;
    }

    const design = designSnap.data();
    if (!design || design.userId !== input.userId) {
      return null;
    }

    const primaryPromise = db
      .collection('references')
      .doc(design.primaryReferenceId)
      .withConverter(referenceConverter)
      .get();
    const secondaryPromises = design.secondaryReferenceIds.map((referenceId) =>
      db
        .collection('references')
        .doc(referenceId)
        .withConverter(referenceConverter)
        .get()
    );
    const generationPromise = design.latestGenerationId
      ? db
          .collection('generations')
          .doc(design.latestGenerationId)
          .withConverter(generationConverter)
          .get()
      : null;

    const [primarySnap, secondarySnaps, generationSnap] = await Promise.all([
      primaryPromise,
      Promise.all(secondaryPromises),
      generationPromise,
    ]);

    const primary = primarySnap.exists ? (primarySnap.data() ?? null) : null;

    let staleReferenceCount = 0;
    if (!primary) {
      staleReferenceCount += 1;
    }

    const secondary: Reference[] = [];
    for (const snap of secondarySnaps) {
      if (!snap.exists) {
        staleReferenceCount += 1;
        continue;
      }

      const reference = snap.data();
      if (!reference) {
        staleReferenceCount += 1;
        continue;
      }

      secondary.push(reference);
    }

    const latestGeneration =
      generationSnap && generationSnap.exists
        ? (generationSnap.data() ?? null)
        : null;

    return {
      design,
      references: {
        primary,
        secondary,
        staleReferenceCount,
        ...(primary ? {} : { primaryReferenceMissing: true as const }),
      },
      latestGeneration,
    };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[designs/load] loadDesignDetail failed', {
      code,
      message,
      designId: input.designId,
      userId: input.userId,
    });
    throw error;
  }
}

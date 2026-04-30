import 'server-only';

import crypto from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { designConverter } from '@/lib/firestore/converters';
import { buildReferenceSet } from '@/lib/references/reference-set';

import type { Design, NailShape } from '@/lib/types';

export type CreateDesignDraftResult =
  | { ok: true; designId: string; status: 'draft_created' }
  | {
      ok: false;
      reason:
        | 'primary_required'
        | 'invalid_reference_id'
        | 'duplicate_reference_id'
        | 'primary_in_secondary'
        | 'prompt_too_long'
        | 'invalid_nail_shape'
        | 'rules_denied'
        | 'firestore_failure'
        | 'unknown';
      message: string;
    };

export async function createDesignDraft(input: {
  userId: string;
  primaryReferenceId: string;
  secondaryReferenceIds: string[];
  promptText?: string | null;
  nailShape: string;
}): Promise<CreateDesignDraftResult> {
  const built = buildReferenceSet({
    primaryReferenceId: input.primaryReferenceId,
    secondaryReferenceIds: input.secondaryReferenceIds,
    promptText: input.promptText ?? null,
    nailShape: input.nailShape,
  });

  if (!built.ok) {
    return built;
  }

  const designId = crypto.randomUUID();
  const now = new Date().toISOString();
  const design: Design = {
    id: designId,
    userId: input.userId,
    name: null,
    primaryReferenceId: built.set.primaryReferenceId,
    secondaryReferenceIds: built.set.secondaryReferenceIds,
    promptText: built.set.promptText,
    nailShape: built.set.nailShape as NailShape,
    latestGenerationId: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = getFirestore(createServerFirebaseAdmin());
    await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .set(design);

    return { ok: true, designId, status: 'draft_created' };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);

    if (code === 'permission-denied') {
      console.error('[createDesign] firestore rules denied', {
        uid: input.userId,
        designId,
        code,
        message,
      });
      return { ok: false, reason: 'rules_denied', message };
    }

    console.error('[createDesign] firestore write failed', {
      uid: input.userId,
      designId,
      code,
      message,
    });
    return { ok: false, reason: 'firestore_failure', message };
  }
}

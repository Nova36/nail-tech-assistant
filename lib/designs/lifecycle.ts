import 'server-only';

import crypto from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { uploadGenerationBytes } from '@/lib/firebase/storage';
import {
  designConverter,
  generationConverter,
} from '@/lib/firestore/converters';
import { buildReferenceSet } from '@/lib/references/reference-set';

import type { GenerateResult } from '@/lib/ai/generate';
import type {
  Design,
  Generation,
  GenerationErrorCode,
  GenerationStatus,
  NailShape,
} from '@/lib/types';

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

export type PersistGenerationStartResult =
  | { ok: true; generationId: string }
  | {
      ok: false;
      reason:
        | 'design_not_found'
        | 'design_unauthorized'
        | 'rules_denied'
        | 'firestore_failure';
      message: string;
    };

export async function persistGenerationStart(input: {
  userId: string;
  designId: string;
  requestJson: unknown;
}): Promise<PersistGenerationStartResult> {
  const db = getFirestore(createServerFirebaseAdmin());

  try {
    const designSnap = await db
      .collection('designs')
      .doc(input.designId)
      .withConverter(designConverter)
      .get();
    if (!designSnap.exists) {
      return {
        ok: false,
        reason: 'design_not_found',
        message: `design ${input.designId} not found`,
      };
    }
    const design = designSnap.data();
    if (design && design.userId !== input.userId) {
      return {
        ok: false,
        reason: 'design_unauthorized',
        message: 'design owned by another user',
      };
    }
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[lifecycle] persistGenerationStart design read failed', {
      uid: input.userId,
      designId: input.designId,
      code,
      message,
    });
    return { ok: false, reason: 'firestore_failure', message };
  }

  const generationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const generation: Generation = {
    id: generationId,
    designId: input.designId,
    userId: input.userId,
    requestJson: input.requestJson,
    resultStoragePath: null,
    providerResponseMetadata: null,
    status: 'pending',
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db
      .collection('generations')
      .doc(generationId)
      .withConverter(generationConverter)
      .set(generation);
    return { ok: true, generationId };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    if (code === 'permission-denied') {
      console.error('[lifecycle] persistGenerationStart rules denied', {
        uid: input.userId,
        generationId,
        code,
        message,
      });
      return { ok: false, reason: 'rules_denied', message };
    }
    console.error('[lifecycle] persistGenerationStart firestore failed', {
      uid: input.userId,
      generationId,
      code,
      message,
    });
    return { ok: false, reason: 'firestore_failure', message };
  }
}

export type PersistGenerationResultResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'storage_fail' | 'firestore_failure' | 'unknown';
      message: string;
    };

function reasonToErrorCode(
  reason:
    | 'refusal'
    | 'rate_limit'
    | 'network'
    | 'low_quality'
    | 'unknown'
    | 'missing_reference_bytes'
    | 'primary_required'
): GenerationErrorCode {
  if (reason === 'refusal') return 'refusal';
  if (reason === 'rate_limit') return 'rate_limit';
  if (reason === 'network') return 'network';
  return 'unknown';
}

export async function persistGenerationResult(input: {
  generationId: string;
  userId: string;
  designId: string;
  outcome: GenerateResult;
}): Promise<PersistGenerationResultResult> {
  const db = getFirestore(createServerFirebaseAdmin());
  const generationRef = db
    .collection('generations')
    .doc(input.generationId)
    .withConverter(generationConverter);
  const designRef = db
    .collection('designs')
    .doc(input.designId)
    .withConverter(designConverter);
  const now = new Date().toISOString();

  if (!input.outcome.ok) {
    const errorCode = reasonToErrorCode(input.outcome.reason);
    try {
      await generationRef.update({
        status: 'failure' satisfies GenerationStatus,
        errorCode,
        errorMessage: input.outcome.message,
        providerResponseMetadata: input.outcome.metadata,
        updatedAt: now,
      });
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      const message = (err as Error).message ?? String(err);
      console.error(
        '[lifecycle] persistGenerationResult failure update failed',
        {
          uid: input.userId,
          generationId: input.generationId,
          code,
          message,
        }
      );
      return { ok: false, reason: 'firestore_failure', message };
    }
  }

  const upload = await uploadGenerationBytes({
    uid: input.userId,
    genId: input.generationId,
    bytes: input.outcome.imageBytes,
    contentType: input.outcome.mimeType,
  });

  if (!upload.ok) {
    try {
      await generationRef.update({
        status: 'failure' satisfies GenerationStatus,
        errorCode: 'unknown' satisfies GenerationErrorCode,
        errorMessage: `storage_fail: ${upload.message}`,
        updatedAt: now,
      });
    } catch (err) {
      console.error(
        '[lifecycle] persistGenerationResult storage-fail rescue failed',
        {
          uid: input.userId,
          generationId: input.generationId,
          err: (err as Error).message,
        }
      );
    }
    return { ok: false, reason: 'storage_fail', message: upload.message };
  }

  try {
    await db.runTransaction(async (txn) => {
      txn.update(generationRef, {
        status: 'success' satisfies GenerationStatus,
        resultStoragePath: upload.storagePath,
        providerResponseMetadata: input.outcome.ok
          ? input.outcome.metadata
          : null,
        errorCode: null,
        errorMessage: null,
        updatedAt: now,
      });
      txn.update(designRef, {
        latestGenerationId: input.generationId,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error(
      '[lifecycle] firestore transaction failed after storage write succeeded',
      {
        uid: input.userId,
        generationId: input.generationId,
        storagePath: upload.storagePath,
        code,
        message,
      }
    );
    return { ok: false, reason: 'firestore_failure', message };
  }
}

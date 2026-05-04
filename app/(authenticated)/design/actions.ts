'use server';

import { getFirestore } from 'firebase-admin/firestore';

import { generate } from '@/lib/ai/generate';
import { resolveImageUrl } from '@/lib/designs/imageUrl';
import {
  createDesignDraft,
  type CreateDesignDraftResult,
  persistGenerationResult,
  persistGenerationStart,
} from '@/lib/designs/lifecycle';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSessionForServerAction } from '@/lib/firebase/session';
import { generationPath } from '@/lib/firebase/storage';
import {
  designConverter,
  generationConverter,
  referenceConverter,
} from '@/lib/firestore/converters';
import {
  ingestPinterestPin,
  type IngestPinterestPinResult,
} from '@/lib/references/ingest';

import type { Reference } from '@/lib/types';

export type SelectPinterestPinResult =
  | IngestPinterestPinResult
  | { ok: false; reason: 'unauthorized' | 'invalid_input'; message: string };

export async function selectPinterestPin(
  pinId: string
): Promise<SelectPinterestPinResult> {
  const session = await getSessionForServerAction();
  if (!session?.uid) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: 'sign in required',
    };
  }

  const trimmed = (pinId ?? '').trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: 'invalid_input',
      message: 'pinId is required',
    };
  }

  return ingestPinterestPin({
    userId: session.uid,
    pinId: trimmed,
  });
}

export type CreateDesignResult =
  | CreateDesignDraftResult
  | { ok: false; reason: 'unauthorized'; message: string };

export async function createDesign(input: {
  primaryReferenceId: string;
  secondaryReferenceIds: string[];
  promptText?: string | null;
  nailShape: string;
}): Promise<CreateDesignResult> {
  const session = await getSessionForServerAction();

  if (!session?.uid) {
    return {
      ok: false,
      reason: 'unauthorized',
      message: 'sign in required',
    };
  }

  return createDesignDraft({
    userId: session.uid,
    ...input,
  });
}

export type GenerateDesignErrorCode =
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

export type GenerateDesignResult =
  | {
      status: 'success';
      generationId: string;
      imageUrl: string;
      nailSwatchUrl?: string | null;
    }
  | {
      status: 'failure';
      errorCode: GenerateDesignErrorCode;
      cta: 'adjust_inputs';
      message: string;
    };

function generateDesignFailure(
  errorCode: GenerateDesignErrorCode,
  message: string
): GenerateDesignResult {
  return {
    status: 'failure',
    errorCode,
    cta: 'adjust_inputs',
    message,
  };
}

function mapPersistGenerationStartReason(
  reason:
    | 'design_not_found'
    | 'design_unauthorized'
    | 'rules_denied'
    | 'firestore_failure'
): GenerateDesignErrorCode {
  if (reason === 'design_not_found') return 'design_not_found';
  if (reason === 'design_unauthorized') return 'design_unauthorized';
  return 'unknown';
}

function mapGenerateReason(
  reason:
    | 'missing_reference_bytes'
    | 'primary_required'
    | 'refusal'
    | 'rate_limit'
    | 'network'
    | 'low_quality'
    | 'unknown'
): GenerateDesignErrorCode {
  if (reason === 'primary_required') return 'invalid_input';
  if (reason === 'refusal') return 'refusal';
  if (reason === 'rate_limit') return 'rate_limit';
  if (reason === 'network') return 'network';
  if (reason === 'low_quality') return 'low_quality';
  return 'unknown';
}

function mapPersistGenerationResultReason(
  reason: 'storage_fail' | 'firestore_failure' | 'unknown'
): GenerateDesignErrorCode {
  if (reason === 'storage_fail') return 'storage_fail';
  return 'unknown';
}

function mimeTypeToExtension(mimeType: string): 'jpg' | 'png' {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return 'png';
}

function isReference(value: Reference | null): value is Reference {
  return value !== null;
}

export async function generateDesign(input: {
  designId: string;
}): Promise<GenerateDesignResult> {
  const session = await getSessionForServerAction();
  if (!session?.uid) {
    return generateDesignFailure('unauthorized', 'sign in required');
  }

  const designId = (input.designId ?? '').trim();
  if (!designId) {
    return generateDesignFailure('invalid_input', 'designId is required');
  }

  const db = getFirestore(createServerFirebaseAdmin());
  const designSnap = await db
    .collection('designs')
    .doc(designId)
    .withConverter(designConverter)
    .get();
  if (!designSnap.exists) {
    return generateDesignFailure(
      'design_not_found',
      `design ${designId} not found`
    );
  }

  const design = designSnap.data();
  if (!design) {
    return generateDesignFailure(
      'design_not_found',
      `design ${designId} not found`
    );
  }

  if (design.userId !== session.uid) {
    return generateDesignFailure(
      'design_unauthorized',
      'design owned by another user'
    );
  }

  const referenceIds = [
    design.primaryReferenceId,
    ...design.secondaryReferenceIds,
  ];
  const referenceSnaps = await Promise.all(
    referenceIds.map((referenceId) =>
      db
        .collection('references')
        .doc(referenceId)
        .withConverter(referenceConverter)
        .get()
    )
  );

  const references = referenceSnaps.map((referenceSnap) => {
    if (!referenceSnap.exists) {
      return null;
    }

    const reference = referenceSnap.data();
    return reference ?? null;
  });

  if (references.some((reference) => reference === null)) {
    const missingReferenceId =
      referenceIds[references.findIndex((reference) => reference === null)] ??
      'unknown';
    return generateDesignFailure(
      'unknown',
      `reference ${missingReferenceId} not found`
    );
  }

  const resolvedReferences = references.filter(isReference);
  const [primaryReference, ...secondaryReferences] = resolvedReferences;
  const started = await persistGenerationStart({
    userId: session.uid,
    designId,
    requestJson: {
      designId,
      primaryReferenceId: design.primaryReferenceId,
      secondaryReferenceIds: design.secondaryReferenceIds,
      promptText: design.promptText,
      nailShape: design.nailShape,
    },
  });

  if (!started.ok) {
    return generateDesignFailure(
      mapPersistGenerationStartReason(started.reason),
      started.message
    );
  }

  const outcome = await generate({
    primaryReference,
    secondaryReferences,
    promptText: design.promptText,
    nailShape: design.nailShape,
  });

  const persisted = await persistGenerationResult({
    generationId: started.generationId,
    userId: session.uid,
    designId,
    outcome,
  });

  if (!persisted.ok) {
    return generateDesignFailure(
      mapPersistGenerationResultReason(persisted.reason),
      persisted.message
    );
  }

  if (!outcome.ok) {
    return generateDesignFailure(
      mapGenerateReason(outcome.reason),
      outcome.message
    );
  }

  const ext = mimeTypeToExtension(outcome.mimeType);
  const imageUrl = await resolveImageUrl(
    generationPath(session.uid, started.generationId, ext)
  );

  if (!imageUrl) {
    return generateDesignFailure(
      'storage_fail',
      'generation image unavailable'
    );
  }

  const persistedGenerationSnap = await db
    .collection('generations')
    .doc(started.generationId)
    .withConverter(generationConverter)
    .get();
  const persistedGeneration = persistedGenerationSnap.exists
    ? (persistedGenerationSnap.data() ?? null)
    : null;
  const nailSwatchUrl = await resolveImageUrl(
    persistedGeneration?.nailSwatchStoragePath ?? null
  );

  return {
    status: 'success',
    generationId: started.generationId,
    imageUrl,
    nailSwatchUrl,
  };
}

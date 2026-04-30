'use server';

import {
  createDesignDraft,
  type CreateDesignDraftResult,
} from '@/lib/designs/lifecycle';
import { getSessionForServerAction } from '@/lib/firebase/session';
import {
  ingestPinterestPin,
  type IngestPinterestPinResult,
} from '@/lib/references/ingest';

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

'use server';

import {
  createDesignDraft,
  type CreateDesignDraftResult,
} from '@/lib/designs/lifecycle';
import { getSessionForServerAction } from '@/lib/firebase/session';

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

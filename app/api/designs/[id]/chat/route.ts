import crypto from 'node:crypto';

import {
  getFirestore,
  type DocumentData,
  type DocumentReference,
} from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';

import { generate } from '@/lib/ai/generate';
import { accumulateChatInstructions } from '@/lib/designs/chat-refinement';
import {
  persistGenerationResult,
  persistGenerationStart,
} from '@/lib/designs/lifecycle';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSession } from '@/lib/firebase/session';
import {
  designConverter,
  referenceConverter,
} from '@/lib/firestore/converters';

import type { GenerationErrorCode, Reference } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FailureBody = {
  status: 'failure';
  errorCode: string;
  message: string;
};

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  unauthorized: 401,
  design_unauthorized: 403,
  design_not_found: 404,
  invalid_input: 400,
  session_full: 409,
};

function failure(
  errorCode: string,
  message: string,
  status = STATUS_BY_ERROR_CODE[errorCode] ?? 400
): NextResponse<FailureBody> {
  return NextResponse.json(
    { status: 'failure', errorCode, message },
    { status }
  );
}

function mapGenerationReasonToErrorCode(
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

function mapStartFailureReason(
  reason:
    | 'design_not_found'
    | 'design_unauthorized'
    | 'rules_denied'
    | 'firestore_failure'
): string {
  if (reason === 'design_not_found') return 'design_not_found';
  if (reason === 'design_unauthorized') return 'design_unauthorized';
  return 'unknown';
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session?.uid) {
    return NextResponse.json(
      { status: 'unauthorized', message: 'sign in required' },
      { status: 401 }
    );
  }

  let chatTurnRef: DocumentReference<DocumentData> | null = null;

  async function markChatTurnFailed(where: string): Promise<void> {
    if (!chatTurnRef) {
      return;
    }

    try {
      await chatTurnRef.update({
        status: 'failed',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code ?? 'unknown';
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[api/designs/[id]/chat] ${where} failed`, {
        code,
        message,
      });
    }
  }

  try {
    const { id: designId } = await ctx.params;

    const body = (await req.json()) as { message?: unknown };
    if (typeof body.message !== 'string') {
      return failure('invalid_input', 'message must be a string');
    }

    const trimmedMessage = body.message.trim();
    if (!trimmedMessage) {
      return failure('invalid_input', 'message must not be empty');
    }
    if (trimmedMessage.length > 500) {
      return failure(
        'invalid_input',
        'message must be 500 characters or fewer'
      );
    }

    const db = getFirestore(createServerFirebaseAdmin());
    const designSnap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();

    if (!designSnap.exists) {
      return failure('design_not_found', `design ${designId} not found`, 404);
    }

    const design = designSnap.data();
    if (!design || design.userId !== session.uid) {
      return failure(
        'design_unauthorized',
        'design owned by another user',
        403
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

    const references: Reference[] = [];
    for (let index = 0; index < referenceSnaps.length; index += 1) {
      const referenceSnap = referenceSnaps[index];
      const referenceId = referenceIds[index];
      if (!referenceSnap.exists) {
        return failure('unknown', `reference ${referenceId} not found`);
      }
      const reference = referenceSnap.data();
      if (!reference) {
        return failure('unknown', `reference ${referenceId} not found`);
      }
      references.push(reference);
    }

    const [primaryReference, ...secondaryReferences] = references;
    const priorTurnsSnap = await db
      .collection('designs')
      .doc(designId)
      .collection('chat_turns')
      .orderBy('createdAt', 'asc')
      .get();
    const priorTurns = priorTurnsSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<
        Parameters<typeof accumulateChatInstructions>[0]['priorTurns'][number],
        'id'
      >),
    }));

    const refinement = accumulateChatInstructions({
      priorTurns,
      nextMessage: trimmedMessage,
    });
    if (refinement.sessionFull === true) {
      return failure('session_full', '5-turn refinement cap reached', 409);
    }

    const providerPromptText = [design.promptText, refinement.compiledPrompt]
      .filter(Boolean)
      .join('\n');

    const chatTurnId = crypto.randomUUID();
    const now = new Date().toISOString();
    chatTurnRef = db
      .collection('designs')
      .doc(designId)
      .collection('chat_turns')
      .doc(chatTurnId);

    await chatTurnRef.set({
      userId: session.uid,
      designId,
      message: trimmedMessage,
      status: 'pending',
      generationId: null,
      createdAt: now,
      updatedAt: now,
    });

    const started = await persistGenerationStart({
      userId: session.uid,
      designId,
      requestJson: {
        primaryReferenceId: design.primaryReferenceId,
        secondaryReferenceIds: design.secondaryReferenceIds,
        promptText: design.promptText,
        nailShape: design.nailShape,
        chat: {
          chatTurnId,
          message: trimmedMessage,
          compiledPrompt: refinement.compiledPrompt,
          providerPromptText,
        },
      },
    });

    if (!started.ok) {
      await markChatTurnFailed('persistGenerationStart chat_turn update');
      return failure(
        mapStartFailureReason(started.reason),
        started.message,
        STATUS_BY_ERROR_CODE[mapStartFailureReason(started.reason)] ?? 400
      );
    }

    const outcome = await generate({
      primaryReference,
      secondaryReferences,
      promptText: providerPromptText || null,
      nailShape: design.nailShape,
    });

    const persisted = await persistGenerationResult({
      generationId: started.generationId,
      userId: session.uid,
      designId,
      chatTurnId,
      outcome,
    });

    if (persisted.ok && outcome.ok) {
      return NextResponse.json(
        {
          status: 'success',
          chatTurnId,
          generationId: started.generationId,
        },
        { status: 200 }
      );
    }

    if (!outcome.ok) {
      await markChatTurnFailed('provider outcome chat_turn update');
      return failure(
        mapGenerationReasonToErrorCode(outcome.reason),
        outcome.message
      );
    }

    await markChatTurnFailed('persistGenerationResult chat_turn update');
    return failure(
      'unknown',
      persisted.ok ? 'failed to persist generation' : persisted.message
    );
  } catch (error) {
    await markChatTurnFailed('top-level catch chat_turn update');

    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/chat] post failed', {
      code,
      message,
    });

    return NextResponse.json(
      { status: 'error', message: 'failed to process chat' },
      { status: 500 }
    );
  }
}

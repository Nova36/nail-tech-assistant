import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';

import { persistShape } from '@/lib/designs/shape-state';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSession } from '@/lib/firebase/session';
import { designConverter } from '@/lib/firestore/converters';

import type { NailShape } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_NAIL_SHAPES = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
] as const satisfies readonly NailShape[];

function isNailShape(value: unknown): value is NailShape {
  return (
    typeof value === 'string' &&
    (VALID_NAIL_SHAPES as readonly string[]).includes(value)
  );
}

function isShapeBody(value: unknown): value is { nailShape: NailShape } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'nailShape') {
    return false;
  }

  return isNailShape((value as { nailShape?: unknown }).nailShape);
}

export async function PATCH(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/shape] json parse failed', {
      code,
      message,
    });
    return NextResponse.json(
      { status: 'invalid', message: 'invalid JSON body' },
      { status: 400 }
    );
  }

  if (!isShapeBody(body)) {
    return NextResponse.json(
      { status: 'invalid', message: 'body must be exactly { nailShape }' },
      { status: 400 }
    );
  }

  const { id } = await ctx.params;
  const db = getFirestore(createServerFirebaseAdmin());

  try {
    const designSnap = await db
      .collection('designs')
      .doc(id)
      .withConverter(designConverter)
      .get();

    if (!designSnap.exists) {
      return NextResponse.json(
        { status: 'not_found', message: `design ${id} not found` },
        { status: 404 }
      );
    }

    const design = designSnap.data();
    if (!design || design.userId !== session.uid) {
      return NextResponse.json(
        { status: 'forbidden', message: 'design owned by another user' },
        { status: 403 }
      );
    }

    const result = await persistShape({
      designId: id,
      nailShape: body.nailShape,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/shape] patch failed', {
      code,
      message,
    });

    if (message.startsWith('Invalid nailShape:')) {
      return NextResponse.json({ status: 'invalid', message }, { status: 400 });
    }

    return NextResponse.json(
      { status: 'error', message: 'failed to update shape' },
      { status: 500 }
    );
  }
}

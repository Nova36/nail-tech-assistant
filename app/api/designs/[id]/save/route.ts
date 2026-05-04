import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse, type NextRequest } from 'next/server';

import { applyName, persistName } from '@/lib/designs/name-state';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSession } from '@/lib/firebase/session';
import { designConverter } from '@/lib/firestore/converters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSaveBody(value: unknown): value is { name: string | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'name') {
    return false;
  }

  const name = (value as { name?: unknown }).name;
  return name === null || typeof name === 'string';
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

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/save] json parse failed', {
      code,
      message,
    });
    return NextResponse.json(
      { status: 'invalid', message: 'invalid JSON body' },
      { status: 400 }
    );
  }

  if (!isSaveBody(body)) {
    return NextResponse.json(
      { status: 'invalid', message: 'body must be exactly { name }' },
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

    let normalized;
    try {
      normalized = applyName({
        designId: id,
        name: body.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ status: 'invalid', message }, { status: 400 });
    }

    const result = await persistName(normalized);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/save] post failed', {
      code,
      message,
    });

    return NextResponse.json(
      { status: 'error', message: 'failed to save name' },
      { status: 500 }
    );
  }
}

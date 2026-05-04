import { NextResponse, type NextRequest } from 'next/server';

import { generateDesign } from '@/app/(authenticated)/design/actions';
import { getSession } from '@/lib/firebase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const { id } = await ctx.params;

  try {
    const result = await generateDesign({ designId: id });
    if (result.status === 'success') {
      return NextResponse.json(
        {
          status: 'success',
          generationId: result.generationId,
          imageUrl: result.imageUrl,
        },
        { status: 200 }
      );
    }

    const statusByErrorCode: Record<string, number> = {
      unauthorized: 401,
      design_unauthorized: 403,
      design_not_found: 404,
      invalid_input: 400,
    };
    const status = statusByErrorCode[result.errorCode] ?? 400;

    return NextResponse.json(
      {
        status: 'failure',
        errorCode: result.errorCode,
        message: result.message,
      },
      { status }
    );
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]/regenerate] post failed', {
      code,
      message,
    });

    return NextResponse.json(
      { status: 'error', message: 'failed to regenerate' },
      { status: 500 }
    );
  }
}

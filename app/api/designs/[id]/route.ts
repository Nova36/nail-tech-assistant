import { NextResponse, type NextRequest } from 'next/server';

import { resolveImageUrl } from '@/lib/designs/imageUrl';
import { loadDesignDetail } from '@/lib/designs/load';
import { getSession } from '@/lib/firebase/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApiGeneration =
  | null
  | ({
      imageUrl?: string;
    } & Omit<
      NonNullable<
        Awaited<ReturnType<typeof loadDesignDetail>>
      >['latestGeneration'],
      'resultStoragePath'
    >);

export async function GET(
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

  try {
    const { id } = await ctx.params;
    const detail = await loadDesignDetail({
      designId: id,
      userId: session.uid,
    });

    if (!detail) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    let latestGeneration: ApiGeneration = detail.latestGeneration;
    if (detail.latestGeneration?.status === 'success') {
      const imageUrl = await resolveImageUrl(
        detail.latestGeneration.resultStoragePath
      );
      latestGeneration = {
        ...detail.latestGeneration,
        imageUrl: imageUrl ?? undefined,
      };
      delete (latestGeneration as { resultStoragePath?: string | null })
        .resultStoragePath;
    }

    return NextResponse.json(
      {
        design: detail.design,
        references: detail.references,
        latestGeneration,
      },
      { status: 200 }
    );
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/designs/[id]] GET failed', {
      code,
      message,
    });
    return NextResponse.json(
      { status: 'error', message: 'failed to load design detail' },
      { status: 500 }
    );
  }
}

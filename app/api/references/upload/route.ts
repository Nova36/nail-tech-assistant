import { NextResponse, type NextRequest } from 'next/server';

import { getSession } from '@/lib/firebase/session';
import { ingestUpload } from '@/lib/references/ingest';

/**
 * POST /api/references/upload — multipart upload ingestion endpoint.
 *
 * The lone exception to the api:surface-boundary server-actions-only lock
 * (see story c7 design_decisions). Server actions handle FormData but
 * multipart streaming through them is brittle on HEIC/HEIF and large
 * buffers; route handlers with `Request.formData()` are the canonical
 * Next.js multipart pattern.
 *
 * Body: multipart/form-data with one `file` field. Validates content type
 * (jpeg/png/heic/heif), size (≤ 10 MB), and presence. The session uid is
 * the only source of truth for ownership — any spoofed `userId` form field
 * is ignored.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB locked per story c7 Open Q5
const ACCEPTED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session?.uid) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unauthorized',
        message: 'sign in required',
      },
      { status: 401 }
    );
  }

  const contentTypeHeader = req.headers.get('content-type') ?? '';
  if (!contentTypeHeader.startsWith('multipart/form-data')) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unsupported_content_type',
        message: 'multipart/form-data required',
      },
      { status: 415 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[api/references/upload] formData parse failed', {
      code,
      message,
    });
    return NextResponse.json(
      { ok: false, reason: 'malformed_multipart', message },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'missing_file',
        message: 'field "file" required',
      },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'empty_file',
        message: 'file is empty',
      },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'file_too_large',
        message: 'max 10 MB',
      },
      { status: 413 }
    );
  }
  if (!ACCEPTED_CONTENT_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'unsupported_file_type',
        message: 'only image/jpeg, image/png, image/heic accepted',
      },
      { status: 415 }
    );
  }

  // Normalize HEIF → HEIC for the c5 storage helper, which only knows
  // jpeg/png/heic content types. Functionally identical formats; storing
  // both under a single extension simplifies downstream generation code.
  const contentType = file.type === 'image/heif' ? 'image/heic' : file.type;
  const bytes = Buffer.from(await file.arrayBuffer());

  const result = await ingestUpload({
    userId: session.uid,
    bytes,
    contentType,
    originalFilename: file.name,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result, { status: 200 });
}

import 'server-only';

import crypto from 'node:crypto';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { uploadReferenceBytes } from '@/lib/firebase/storage';
import { referenceConverter } from '@/lib/firestore/converters';
import { getPinterestPin } from '@/lib/pinterest/client';

import type { PinterestPin } from '@/lib/pinterest/types';
import type { Reference } from '@/lib/types';

/**
 * Server-proxied Pinterest pin ingestion.
 *
 * Flow (in this exact order — see story design_decisions for why):
 *   1. Fetch pin metadata via lib/pinterest/client (getPinterestPin).
 *   2. Reject non-image media types (video, multi, story).
 *   3. Pick the best image variant (1200x → 600x → 400x300 → 150x150).
 *   4. Fetch image bytes via Node fetch (CDN; no Authorization header — pinimg is public).
 *   5. Write bytes to Storage via c5 helper FIRST (durability).
 *   6. Write `references/{refId}` Firestore doc AFTER (referential integrity).
 *
 * On any failure the function returns a discriminated `{ ok: false; reason; message }`
 * envelope. No errors escape — caller pattern-matches reasons. Storage write before
 * Firestore is the order that minimizes orphaned-reference risk; if the Firestore
 * write fails after a Storage write succeeds, we log the orphan with full
 * identifiers so a future sweep job can find it.
 */

export type IngestPinterestPinResult =
  | { ok: true; reference: Reference }
  | {
      ok: false;
      reason:
        | 'invalid_token'
        | 'insufficient_scope'
        | 'not_found'
        | 'rate_limit'
        | 'network'
        | 'no_image_variant'
        | 'unsupported_media_type'
        | 'image_fetch_failed'
        | 'storage_failure'
        | 'firestore_failure'
        | 'unknown';
      message: string;
    };

const VARIANT_FALLBACK = ['1200x', '600x', '400x300', '150x150'] as const;

function pickBestImageVariant(
  pin: PinterestPin
): { url: string; variant: string } | null {
  const images = pin.media?.images;
  if (!images) return null;
  for (const variant of VARIANT_FALLBACK) {
    const candidate = images[variant];
    if (candidate?.url) {
      return { url: candidate.url, variant };
    }
  }
  return null;
}

function inferContentType(url: string): string {
  const lower = url.split('?')[0]?.toLowerCase() ?? '';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

export async function ingestPinterestPin(input: {
  userId: string;
  pinId: string;
}): Promise<IngestPinterestPinResult> {
  const pinResult = await getPinterestPin(input.pinId);
  if (!pinResult.ok) {
    return {
      ok: false,
      reason: pinResult.reason,
      message: `pinterest fetch failed: ${pinResult.reason}`,
    };
  }

  const pin = pinResult.pin;

  // Reject non-image media BEFORE variant selection — a video pin may still
  // include a thumbnail in `media.images`, but a thumbnail isn't a valid
  // representation of the source.
  if (pin.media?.media_type && pin.media.media_type !== 'image') {
    return {
      ok: false,
      reason: 'unsupported_media_type',
      message: `media_type "${pin.media.media_type}" is not supported in v1`,
    };
  }

  const variant = pickBestImageVariant(pin);
  if (!variant) {
    return {
      ok: false,
      reason: 'no_image_variant',
      message: `pin ${input.pinId} has no usable image variant`,
    };
  }

  let bytes: Buffer;
  try {
    const res = await fetch(variant.url);
    if (!res.ok) {
      console.error('[ingest] image fetch non-200', {
        pinId: input.pinId,
        status: res.status,
        url: variant.url,
      });
      return {
        ok: false,
        reason: 'image_fetch_failed',
        message: `image fetch failed: ${res.status}`,
      };
    }
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error('[ingest] image fetch threw', {
      pinId: input.pinId,
      code,
      message,
    });
    return { ok: false, reason: 'image_fetch_failed', message };
  }

  const refId = crypto.randomUUID();
  const contentType = inferContentType(variant.url);

  const upload = await uploadReferenceBytes({
    uid: input.userId,
    refId,
    bytes,
    contentType,
  });
  if (!upload.ok) {
    return {
      ok: false,
      reason:
        upload.reason === 'unauthorized' ? 'storage_failure' : upload.reason,
      message: upload.message,
    };
  }

  const reference: Reference = {
    id: refId,
    userId: input.userId,
    source: 'pinterest',
    sourceUrl: pin.link ?? null,
    storagePath: upload.storagePath,
    pinterestPinId: input.pinId,
    createdAt: new Date().toISOString(),
  };

  try {
    const db = getFirestore(createServerFirebaseAdmin());
    await db
      .collection('references')
      .doc(refId)
      .withConverter(referenceConverter)
      .set(reference);
    return { ok: true, reference };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    const message = (err as Error).message ?? String(err);
    console.error(
      '[ingest] firestore write failed after storage write succeeded',
      {
        uid: input.userId,
        refId,
        storagePath: upload.storagePath,
        code,
        message,
      }
    );
    return { ok: false, reason: 'firestore_failure', message };
  }
}

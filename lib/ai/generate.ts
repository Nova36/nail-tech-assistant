import 'server-only';
import { generateImage, type ProviderRequest } from '@/lib/ai/provider';
import { readReferenceBytes } from '@/lib/firebase/storage';

import type { Reference, NailShape } from '@/lib/types';

const RETRY_BACKOFF_MS = 500;
const TRANSIENT_REASONS: ReadonlySet<string> = new Set([
  'network',
  'rate_limit',
]);

export interface GenerateInput {
  primaryReference: Reference;
  secondaryReferences: Reference[];
  promptText: string | null;
  nailShape: NailShape;
}

export type GenerateResult =
  | {
      ok: true;
      imageBytes: Buffer;
      mimeType: 'image/png' | 'image/jpeg';
      metadata: { retryCount: number; durationMs: number };
    }
  | {
      ok: false;
      reason:
        | 'missing_reference_bytes'
        | 'primary_required'
        | 'refusal'
        | 'rate_limit'
        | 'network'
        | 'low_quality'
        | 'unknown';
      message: string;
      metadata: { retryCount: number; durationMs: number };
    };

export async function buildGeminiRequest(input: GenerateInput): Promise<
  | { ok: true; request: ProviderRequest }
  | {
      ok: false;
      reason: 'missing_reference_bytes' | 'primary_required';
      message: string;
    }
> {
  if (!input.primaryReference) {
    return {
      ok: false,
      reason: 'primary_required',
      message: 'primary reference is required',
    };
  }

  const primaryBytes = await readReferenceBytes(
    input.primaryReference.storagePath
  );
  if (!primaryBytes.ok) {
    return {
      ok: false,
      reason: 'missing_reference_bytes',
      message: `primary ${input.primaryReference.id}: ${primaryBytes.message}`,
    };
  }

  const secondaryImages: ProviderRequest['images'] = [];
  for (const ref of input.secondaryReferences) {
    const r = await readReferenceBytes(ref.storagePath);
    if (!r.ok) {
      return {
        ok: false,
        reason: 'missing_reference_bytes',
        message: `secondary ${ref.id}: ${r.message}`,
      };
    }
    secondaryImages.push({
      bytes: r.bytes,
      mimeType: r.contentType as ProviderRequest['images'][number]['mimeType'],
      role: 'secondary',
    });
  }

  const request: ProviderRequest = {
    images: [
      {
        bytes: primaryBytes.bytes,
        mimeType:
          primaryBytes.contentType as ProviderRequest['images'][number]['mimeType'],
        role: 'primary',
      },
      ...secondaryImages,
    ],
    promptText: input.promptText,
    nailShape: input.nailShape,
  };
  return { ok: true, request };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const startedAt = Date.now();
  const built = await buildGeminiRequest(input);
  if (!built.ok) {
    return {
      ok: false,
      reason: built.reason,
      message: built.message,
      metadata: { retryCount: 0, durationMs: Date.now() - startedAt },
    };
  }

  let result = await generateImage(built.request);
  let retryCount = 0;
  if (!result.ok && TRANSIENT_REASONS.has(result.reason)) {
    await sleep(RETRY_BACKOFF_MS);
    result = await generateImage(built.request);
    retryCount = 1;
  }

  const durationMs = Date.now() - startedAt;
  if (result.ok) {
    return {
      ok: true,
      imageBytes: result.imageBytes,
      mimeType: result.mimeType,
      metadata: { retryCount, durationMs },
    };
  }
  return {
    ok: false,
    reason: result.reason,
    message: result.message,
    metadata: { retryCount, durationMs },
  };
}

import 'server-only';

import { GoogleGenAI } from '@google/genai';

import type { NailShape } from '@/lib/types';

export interface ProviderImageInput {
  bytes: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/heic';
  role: 'primary' | 'secondary';
}

export interface ProviderRequest {
  images: ProviderImageInput[];
  promptText: string | null;
  nailShape: NailShape;
}

export type ProviderResult =
  | {
      ok: true;
      imageBytes: Buffer;
      mimeType: 'image/png' | 'image/jpeg';
      metadata: unknown;
    }
  | {
      ok: false;
      reason: 'refusal' | 'rate_limit' | 'network' | 'low_quality' | 'unknown';
      message: string;
    };

const MODEL_ID = 'gemini-3.1-flash-image-preview';
const GCP_PROJECT = 'nail-tech-assistant';
const GCP_LOCATION = 'global';

function loadCredentials(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON not valid JSON: ${(err as Error).message}`
    );
  }
}

const PRESENTATION_DIRECTIVES =
  'Render five photorealistic glossy painted nails of the requested shape, arranged in a single horizontal row left-to-right in finger order: pinky, ring, middle, index, thumb. Apply a natural size gradient — pinky is the smallest, ring slightly larger, middle the largest, index slightly smaller than middle, thumb second-largest. Flat opaque cream background, soft contact shadows. No hand, no fingers, no skin. Use the primary reference image as the design source; apply the user prompt as a direct edit, preserving everything not explicitly changed.';

function serializeRequest(req: ProviderRequest) {
  const parts: Array<{
    inlineData?: { mimeType: string; data: string };
    text?: string;
  }> = [];

  for (const img of req.images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.bytes.toString('base64'),
      },
    });
  }

  const userPromptLine = req.promptText
    ? `USER EDIT REQUEST (apply this to the primary reference): ${req.promptText}`
    : 'USER EDIT REQUEST: render the primary reference design faithfully on a hand.';

  const textBits = [
    userPromptLine,
    `Nail shape: ${req.nailShape}.`,
    PRESENTATION_DIRECTIVES,
  ];

  parts.push({ text: textBits.join('\n\n') });

  return {
    model: MODEL_ID,
    contents: [{ role: 'user' as const, parts }],
    config: {
      responseModalities: ['IMAGE', 'TEXT'] as Array<'IMAGE' | 'TEXT'>,
    },
  };
}

function classifyBlockReason(
  blockReason: string | undefined
): 'refusal' | 'unknown' {
  if (!blockReason) return 'unknown';
  if (blockReason === 'SAFETY' || blockReason === 'RECITATION') {
    return 'refusal';
  }
  return 'unknown';
}

const REQUEST_TIMEOUT_MS = 90_000;

export async function generateImage(
  req: ProviderRequest
): Promise<ProviderResult> {
  try {
    const credentials = loadCredentials();
    const ai = new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT,
      location: GCP_LOCATION,
      googleAuthOptions: { credentials },
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });

    const imageSizes = req.images.map((img) => ({
      role: img.role,
      mime: img.mimeType,
      bytes: img.bytes.length,
    }));
    console.log('[provider] generateImage start', {
      model: MODEL_ID,
      location: GCP_LOCATION,
      project: GCP_PROJECT,
      timeoutMs: REQUEST_TIMEOUT_MS,
      imageCount: req.images.length,
      imageSizes,
      promptLength: (req.promptText ?? '').length,
    });
    const response = await ai.models.generateContent(serializeRequest(req));
    console.log('[provider] generateImage response received');

    const blockReason = (
      response as { promptFeedback?: { blockReason?: string } }
    ).promptFeedback?.blockReason;

    if (blockReason) {
      return {
        ok: false,
        reason: classifyBlockReason(blockReason),
        message: `provider blocked: ${blockReason}`,
      };
    }

    const parts =
      (
        response as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { data: string; mimeType: string };
                text?: string;
              }>;
            };
          }>;
        }
      ).candidates?.[0]?.content?.parts ?? [];

    const imgPart = parts.find((part) => part.inlineData?.data);
    if (!imgPart?.inlineData?.data) {
      return {
        ok: false,
        reason: 'unknown',
        message: 'provider returned no image bytes',
      };
    }

    return {
      ok: true,
      imageBytes: Buffer.from(imgPart.inlineData.data, 'base64'),
      mimeType: (imgPart.inlineData.mimeType ?? 'image/png') as
        | 'image/png'
        | 'image/jpeg',
      metadata: response,
    };
  } catch (err) {
    const code =
      (err as { code?: string; status?: number }).code ??
      (err as { status?: number }).status?.toString() ??
      'unknown';
    const message = (err as Error).message ?? String(err);
    const cause = (err as { cause?: unknown }).cause;
    const causeCode =
      (cause as { code?: string } | undefined)?.code ?? undefined;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : cause !== undefined
          ? String(cause)
          : undefined;
    const stack = (err as Error).stack;

    console.error('[provider] generateImage failed', {
      code,
      message,
      model: MODEL_ID,
      location: GCP_LOCATION,
      causeCode,
      causeMessage,
      stackHead: stack?.split('\n').slice(0, 5).join(' | '),
    });

    let reason:
      | 'refusal'
      | 'rate_limit'
      | 'network'
      | 'low_quality'
      | 'unknown' = 'unknown';

    if (code === '429' || /rate limit/i.test(message)) {
      reason = 'rate_limit';
    } else if (
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      /network|timeout/i.test(message)
    ) {
      reason = 'network';
    }

    return { ok: false, reason, message };
  }
}

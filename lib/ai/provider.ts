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
// 2x2 transparent PNG — minimum valid bytes for VERTEX_MOCK=ok mode.
const MOCK_PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000020000000208060000007296de31000000164944415478da626001000000ffff03000005000100bd58e7350000000049454e44ae426082',
  'hex'
);

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

const RENDER_DIRECTIVES =
  'Render five photorealistic glossy painted nails of the requested shape, arranged in a single horizontal row left-to-right in finger order: pinky, ring, middle, index, thumb. Apply a natural size gradient — pinky is the smallest, ring slightly larger, middle the largest, index slightly smaller than middle, thumb second-largest. Flat opaque cream background, soft contact shadows. No hand, no fingers, no skin, no rings, no jewelry.';

const PRIMARY_ONLY_DIRECTIVE =
  'Use the reference image as the design source; apply the user prompt as a direct edit, preserving everything not explicitly changed.';

function serializeRequest(req: ProviderRequest) {
  const parts: Array<{
    inlineData?: { mimeType: string; data: string };
    text?: string;
  }> = [];

  const secondaryCount = req.images.length - 1;
  const hasSecondary = secondaryCount > 0;
  const userText = req.promptText?.trim() ?? '';

  if (hasSecondary) {
    parts.push({
      text: `TASK: Multi-reference nail design synthesis. You have ${req.images.length} labeled reference images below. You MUST visibly incorporate distinctive design elements from EVERY reference into the final result — do not output a design that resembles only one reference. Combine them as a stylist would: base palette + structure from the first, distinctive motifs/patterns/tip work/line art from the rest.`,
    });

    for (let i = 0; i < req.images.length; i += 1) {
      const img = req.images[i];
      const label =
        i === 0
          ? 'REFERENCE A (base — use its palette, finish, and overall style)'
          : `REFERENCE ${String.fromCharCode(65 + i)} (style donor — bring its distinctive design elements: patterns, motifs, line art, tip work, color accents, finishes)`;
      parts.push({ text: `${label}:` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.bytes.toString('base64'),
        },
      });
    }

    const blendInstruction = userText
      ? `USER INSTRUCTION (how to blend the references): "${userText}". Interpret this as a directive to fuse the references — produce ONE cohesive design that visibly draws from each reference above.`
      : 'USER INSTRUCTION: synthesize the references into one cohesive design that visibly draws from each one.';
    parts.push({ text: blendInstruction });
    parts.push({ text: `Nail shape: ${req.nailShape}.` });
    parts.push({ text: RENDER_DIRECTIVES });
  } else {
    parts.push({
      inlineData: {
        mimeType: req.images[0].mimeType,
        data: req.images[0].bytes.toString('base64'),
      },
    });

    const userPromptLine = userText
      ? `USER EDIT REQUEST (apply this to the reference): ${userText}`
      : 'USER EDIT REQUEST: render the reference design faithfully.';

    parts.push({
      text: [
        userPromptLine,
        `Nail shape: ${req.nailShape}.`,
        RENDER_DIRECTIVES,
        PRIMARY_ONLY_DIRECTIVE,
      ].join('\n\n'),
    });
  }

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
  const vertexMock = process.env.VERTEX_MOCK;
  if (process.env.VERCEL !== '1' && vertexMock) {
    switch (vertexMock) {
      case 'ok':
        return {
          ok: true,
          imageBytes: MOCK_PNG_BYTES,
          mimeType: 'image/png',
          metadata: { mock: true },
        };
      case 'refusal':
      case 'rate_limit':
      case 'low_quality':
      case 'network':
      case 'unknown':
        return {
          ok: false,
          reason: vertexMock,
          message: `VERTEX_MOCK forced ${vertexMock}`,
        };
    }
  }

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

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

const MODEL_ID = 'gemini-2.5-flash-image';
const GCP_PROJECT = 'nail-tech-assistant';
const GCP_LOCATION = 'us-central1';

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

  const textBits = [
    `Nail shape: ${req.nailShape}.`,
    req.promptText ? `Prompt: ${req.promptText}` : null,
    'Generate a nail design that incorporates the visual cues from the reference images.',
  ].filter(Boolean) as string[];

  parts.push({ text: textBits.join(' ') });

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
    });

    const response = await ai.models.generateContent(serializeRequest(req));

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

    console.error('[provider] generateImage failed', {
      code,
      message,
      model: MODEL_ID,
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

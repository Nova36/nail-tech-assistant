import 'server-only';

import { GoogleGenAI } from '@google/genai';

import {
  getServerFirebaseStorage,
  readReferenceBytes,
} from '@/lib/firebase/storage';

const MODEL_ID = 'gemini-2.5-flash-image';
const GCP_PROJECT = 'nail-tech-assistant';
const GCP_LOCATION = 'us-central1';
const EXTRACTION_PROMPT =
  'Create a clean isolated nail-polish swatch PNG matching the source nail color, finish, and pattern exactly, with only the polish surface filling the frame and no skin, fingertip, cuticle, nail-bed pink edge, shadow, or background.';

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

export async function extractNailSwatch(args: {
  sourceStoragePath: string;
  designId: string;
  userId: string;
}): Promise<{ ok: true; storagePath: string } | { ok: false }> {
  try {
    const read = await readReferenceBytes(args.sourceStoragePath);
    if (!read.ok) {
      console.error('[extract-swatch] readReferenceBytes failed', {
        code: 'source_unreadable',
        message: read.message,
      });
      return { ok: false };
    }

    const credentials = loadCredentials();
    const ai = new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT,
      location: GCP_LOCATION,
      googleAuthOptions: { credentials },
    });

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: read.contentType,
                data: read.bytes.toString('base64'),
              },
            },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'] as Array<'IMAGE' | 'TEXT'>,
      },
    });

    const part = (
      response as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { data?: string; mimeType?: string };
              text?: string;
            }>;
          };
        }>;
      }
    ).candidates?.[0]?.content?.parts?.find((candidatePart) =>
      Boolean(candidatePart?.inlineData?.data)
    );

    if (!part?.inlineData?.data) {
      console.error('[extract-swatch] vertex returned no image', {
        code: 'no_image',
        message: 'response had no inlineData parts',
      });
      return { ok: false };
    }

    const buf = Buffer.from(part.inlineData.data, 'base64');
    const storagePath = `designs/${args.designId}/swatch.png`;
    const bucket = getServerFirebaseStorage();
    await bucket.file(storagePath).save(buf, {
      metadata: { contentType: 'image/png' },
      resumable: false,
    });

    return { ok: true, storagePath };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[extract-swatch] failed', { code, message });
    return { ok: false };
  }
}

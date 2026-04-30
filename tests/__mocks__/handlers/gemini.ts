/**
 * c2-msw-install-harness — Gemini default MSW handler.
 *
 * Default stub for the Vertex AI Gemini image-generation endpoint locked in
 * c1 (`spike-gemini-sdk.md`). c14 will exercise this handler against the
 * real provider boundary; c2 only ships the default stub so c14's tests can
 * land without re-doing the harness wiring.
 *
 * SDK lock from c1: `@google/genai` v1.x in Vertex mode targeting
 * `aiplatform.googleapis.com`. The Vertex generateContent path is:
 *   POST /v1/projects/{project}/locations/{location}/publishers/google/
 *        models/{model}:generateContent
 *
 * The stub accepts ANY project / location / model under that shape so c14
 * doesn't have to pin the project ID at test time.
 */
import { http, HttpResponse } from 'msw';

// 1x1 transparent PNG — minimal valid image-generation response payload.
// Decoded byte length is small but the base64 form is what the Gemini API
// returns inside `candidates[].content.parts[].inlineData.data`.
const STUB_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

export const geminiHandlers = [
  http.post(
    'https://*.googleapis.com/v1/projects/:project/locations/:location/publishers/google/models/:model\\:generateContent',
    () =>
      HttpResponse.json({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                { text: 'Stub generation from MSW default handler.' },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: STUB_PNG_BASE64,
                  },
                },
              ],
            },
            finishReason: 'STOP',
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 0,
          totalTokenCount: 100,
        },
      })
  ),
];

// Throwaway spike harness for Epic C / story c1.
// Run: node --env-file=.env.local scripts/spike/gemini-spike.mjs
//
// Vertex AI mode: reuses FIREBASE_SERVICE_ACCOUNT_JSON for auth (the same
// service account that auths Firebase Admin — granted roles/aiplatform.user).
// Project: nail-tech-assistant | Location: us-central1.
//
// Writes per-type sample outputs + appends latency results to spike-gemini-sdk.md.
// This script is disposable. The durable artifact is the markdown record.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { GoogleGenAI } from '@google/genai';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT_DIR = path.join(
  REPO_ROOT,
  '.pHive/epics/epic-c-reference-and-generation/spike-outputs'
);
const REPORT_PATH = path.join(
  REPO_ROOT,
  '.pHive/epics/epic-c-reference-and-generation/docs/spike-gemini-sdk.md'
);

const GCP_PROJECT = 'nail-tech-assistant';
const GCP_LOCATION = 'us-central1';
const MODEL_ID = 'gemini-2.5-flash-image';

// Reference set — mirrors spike-reference-set.md row order. Don curated.
const REFERENCES = [
  {
    type: 'minimal-nail-art',
    url: 'https://i.pinimg.com/736x/6f/45/b1/6f45b1270e84b9949490b5ba4fd1c259.jpg',
    prompt:
      'Generate a clean, minimalist nail design inspired by the reference. Keep negative space, soft palette, subtle accents.',
  },
  {
    type: 'complex-patterned',
    url: 'https://i.pinimg.com/736x/79/98/83/7998833663a5ad5caf41416b425076ab.jpg',
    prompt:
      'Generate an intricate patterned nail design inspired by the reference. Preserve the density and motif structure; adapt to nail-shaped canvas.',
  },
  {
    type: 'abstract-palette',
    url: 'https://i.pinimg.com/1200x/6f/3c/2a/6f3c2a025fccf6a9a80ac1a0bb873a32.jpg',
    prompt:
      'Generate a nail design that translates the color palette and mood of the reference into wearable nail art. Reference is mood/palette only — not literal subject matter.',
  },
  {
    type: 'nature-inspired',
    url: 'https://i.pinimg.com/736x/e1/d4/4a/e1d44a73eb2fbc9638c294a1d1753b2a.jpg',
    prompt:
      'Generate a nail design inspired by the natural form, texture, and color of the reference. Stylize for nail-shaped canvas; do not photorealistically reproduce the reference subject.',
  },
  {
    type: 'fashion-editorial',
    url: 'https://i.pinimg.com/736x/57/4a/fb/574afba893c4d961fc06bc8d12f01de2.jpg',
    prompt:
      "Generate a high-fashion editorial nail design inspired by the reference's styling, texture, and palette. Aim for runway-ready, statement-piece feel.",
  },
];

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  }
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), mime };
}

function loadServiceAccountCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set in .env.local');
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${err.message}`
    );
  }
}

async function runOne(ai, ref, idx) {
  console.log(
    `[${idx + 1}/${REFERENCES.length}] ${ref.type} — fetching reference …`
  );
  const { base64, mime } = await fetchImageAsBase64(ref.url);
  console.log(
    `[${idx + 1}/${REFERENCES.length}] ${ref.type} — calling Gemini (Vertex) …`
  );

  const start = performance.now();
  let response;
  let error = null;
  try {
    response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64, mimeType: mime } },
            { text: ref.prompt },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });
  } catch (err) {
    error = err;
  }
  const latencyMs = Math.round(performance.now() - start);

  if (error) {
    const msg = (error.message ?? String(error))
      .replace(/\s+/g, ' ')
      .slice(0, 240);
    console.error(
      `[${idx + 1}/${REFERENCES.length}] ${ref.type} — ERROR ${latencyMs}ms ${msg}`
    );
    return {
      type: ref.type,
      latencyMs,
      ok: false,
      error: msg,
      outputPath: null,
    };
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  const textPart = parts.find((p) => p.text)?.text ?? null;

  let outputPath = null;
  if (imgPart) {
    const ext = imgPart.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
    outputPath = path.join(OUT_DIR, `${idx + 1}-${ref.type}.${ext}`);
    await writeFile(outputPath, Buffer.from(imgPart.inlineData.data, 'base64'));
    console.log(
      `[${idx + 1}/${REFERENCES.length}] ${ref.type} — OK ${latencyMs}ms → ${path.relative(REPO_ROOT, outputPath)}`
    );
  } else {
    console.warn(
      `[${idx + 1}/${REFERENCES.length}] ${ref.type} — no image in response. Text:`,
      textPart
    );
  }

  return {
    type: ref.type,
    latencyMs,
    ok: !!imgPart,
    error: imgPart ? null : 'no inline image in response',
    outputPath: outputPath ? path.relative(REPO_ROOT, outputPath) : null,
    text: textPart,
  };
}

function fmtMs(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function buildResultsTable(results) {
  const sorted = [...results].map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const p95Idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  const p95 = sorted[p95Idx] ?? 0;

  let md = '';
  md += '## Spike run results\n\n';
  md += `_Run timestamp: ${new Date().toISOString()}_\n`;
  md += `_Backend: Vertex AI | Project: \`${GCP_PROJECT}\` | Location: \`${GCP_LOCATION}\` | Model: \`${MODEL_ID}\`_\n`;
  md += `_SDK: \`@google/genai\` (unified, current) | Auth: service-account JSON via \`FIREBASE_SERVICE_ACCOUNT_JSON\`_\n\n`;
  md += '| # | Type | Latency | OK? | Output | Notes |\n';
  md += '|---|------|---------|-----|--------|-------|\n';
  results.forEach((r, i) => {
    const note = (r.error ?? r.text ?? '').replace(/\s+/g, ' ').slice(0, 120);
    md += `| ${i + 1} | ${r.type} | ${fmtMs(r.latencyMs)} | ${r.ok ? '✅' : '❌'} | ${r.outputPath ?? '—'} | ${note} |\n`;
  });
  md += `\n**Aggregate latency:** P50 ${fmtMs(p50)} · P95 ${fmtMs(p95)}\n`;
  md += `**Success rate:** ${results.filter((r) => r.ok).length}/${results.length}\n`;
  return md;
}

async function main() {
  const credentials = loadServiceAccountCredentials();

  await mkdir(OUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: GCP_PROJECT,
    location: GCP_LOCATION,
    googleAuthOptions: { credentials },
  });

  console.log(
    `Spike start. Backend=Vertex | Project=${GCP_PROJECT} | Location=${GCP_LOCATION} | Model=${MODEL_ID} | References=${REFERENCES.length}`
  );

  const results = [];
  for (let i = 0; i < REFERENCES.length; i++) {
    const r = await runOne(ai, REFERENCES[i], i);
    results.push(r);
  }

  const table = buildResultsTable(results);
  console.log('\n' + table);

  const existing = await readFile(REPORT_PATH, 'utf8');
  const SECTION_RE = /\n## Spike run results[\s\S]*$/;
  const next = SECTION_RE.test(existing)
    ? existing.replace(SECTION_RE, '\n' + table)
    : existing.trimEnd() + '\n\n' + table;
  await writeFile(REPORT_PATH, next);
  console.log(`Appended results to ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

await main();

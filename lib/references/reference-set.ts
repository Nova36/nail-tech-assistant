import type { NailShape } from '@/lib/types';

const NAIL_SHAPES = ['almond', 'coffin', 'square', 'round', 'oval'] as const;
const MAX_PROMPT_LENGTH = 1000;

function isNailShape(x: unknown): x is NailShape {
  return (
    typeof x === 'string' && (NAIL_SHAPES as readonly string[]).includes(x)
  );
}

export interface ReferenceSet {
  primaryReferenceId: string;
  secondaryReferenceIds: string[];
  promptText: string | null;
  nailShape: NailShape;
}

export type BuildReferenceSetResult =
  | { ok: true; set: ReferenceSet }
  | {
      ok: false;
      reason:
        | 'primary_required'
        | 'invalid_reference_id'
        | 'duplicate_reference_id'
        | 'primary_in_secondary'
        | 'prompt_too_long'
        | 'invalid_nail_shape';
      message: string;
    };

export function buildReferenceSet(input: {
  primaryReferenceId: string;
  secondaryReferenceIds: string[];
  promptText?: string | null;
  nailShape: string;
}): BuildReferenceSetResult {
  const primary = (input.primaryReferenceId ?? '').trim();
  if (!primary) {
    return {
      ok: false,
      reason: 'primary_required',
      message: 'primary reference is required',
    };
  }

  const secondary = input.secondaryReferenceIds ?? [];
  for (const id of secondary) {
    if (typeof id !== 'string' || id.trim() === '') {
      return {
        ok: false,
        reason: 'invalid_reference_id',
        message: 'secondary reference IDs must be non-empty strings',
      };
    }
  }

  const seen = new Set<string>();
  for (const id of secondary) {
    if (seen.has(id)) {
      return {
        ok: false,
        reason: 'duplicate_reference_id',
        message: `duplicate secondary reference: ${id}`,
      };
    }
    seen.add(id);
  }

  if (secondary.includes(primary)) {
    return {
      ok: false,
      reason: 'primary_in_secondary',
      message: `primary reference ${primary} appears in secondary list`,
    };
  }

  const normalizedPrompt =
    input.promptText && input.promptText.trim().length > 0
      ? input.promptText
      : null;
  if (
    normalizedPrompt !== null &&
    normalizedPrompt.length > MAX_PROMPT_LENGTH
  ) {
    return {
      ok: false,
      reason: 'prompt_too_long',
      message: `prompt exceeds ${MAX_PROMPT_LENGTH} chars`,
    };
  }

  if (!isNailShape(input.nailShape)) {
    return {
      ok: false,
      reason: 'invalid_nail_shape',
      message: `nailShape "${input.nailShape}" not in NailShape union`,
    };
  }

  return {
    ok: true,
    set: {
      primaryReferenceId: primary,
      secondaryReferenceIds: secondary,
      promptText: normalizedPrompt,
      nailShape: input.nailShape,
    },
  };
}

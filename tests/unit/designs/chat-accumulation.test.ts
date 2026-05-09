/**
 * e2-chat-refinement-accumulation — unit tests for the pure prompt-accumulation lib.
 *
 * Lane: tests/unit/** runs under vitest.config.ts (no emulator, no server-only).
 * The lib MUST stay pure: no Firestore imports, no provider imports, no
 * `server-only` directive. These tests assert the deterministic compiled-prompt
 * shape, empty-message rejection, whitespace trimming, ordering, and the 5-turn
 * cap full-session signal.
 *
 * Anchors:
 *   - structured-outline.md L439-L449
 *   - prd.md L635-L639, L664-L666
 *   - design-discussion.md §6 Q3 (5-turn cap, simple concatenation, no summarization)
 */
import { describe, expect, it } from 'vitest';

import {
  accumulateChatInstructions,
  EmptyMessageError,
  type ChatTurn,
} from '@/lib/designs/chat-refinement';

const turn = (overrides: Partial<ChatTurn> = {}): ChatTurn => ({
  id: 't1',
  designId: 'd1',
  userId: 'alice',
  message: 'make it more pastel',
  status: 'success',
  generationId: 'g1',
  createdAt: '2026-05-01T00:01:00Z',
  updatedAt: '2026-05-01T00:01:00Z',
  ...overrides,
});

describe('accumulateChatInstructions — empty-state happy path', () => {
  it('compiles to a single [Refinement 1] block when no prior turns exist', () => {
    const result = accumulateChatInstructions({
      priorTurns: [],
      nextMessage: 'add gold accents',
    });
    expect(result.compiledPrompt).toBe('[Refinement 1]: add gold accents');
    expect(result.sessionFull).toBeUndefined();
  });

  it('trims surrounding whitespace from the next message before compiling', () => {
    const result = accumulateChatInstructions({
      priorTurns: [],
      nextMessage: '   add gold accents\n',
    });
    expect(result.compiledPrompt).toBe('[Refinement 1]: add gold accents');
  });
});

describe('accumulateChatInstructions — multi-turn ordering and prefix stability', () => {
  it('emits chronological [Refinement N]: blocks separated by newlines', () => {
    const priorTurns: ChatTurn[] = [
      turn({ id: 't1', message: 'make it more pastel' }),
      turn({ id: 't2', message: 'add gold accents' }),
    ];
    const result = accumulateChatInstructions({
      priorTurns,
      nextMessage: 'try french tips',
    });
    expect(result.compiledPrompt).toBe(
      [
        '[Refinement 1]: make it more pastel',
        '[Refinement 2]: add gold accents',
        '[Refinement 3]: try french tips',
      ].join('\n')
    );
    expect(result.sessionFull).toBeUndefined();
  });

  it('preserves caller-supplied chronological order regardless of timestamp drift', () => {
    const priorTurns: ChatTurn[] = [
      turn({
        id: 't1',
        message: 'first',
        createdAt: '2026-05-02T00:00:00Z',
      }),
      turn({
        id: 't2',
        message: 'second',
        createdAt: '2026-05-01T00:00:00Z',
      }),
    ];
    const result = accumulateChatInstructions({
      priorTurns,
      nextMessage: 'third',
    });
    expect(result.compiledPrompt).toBe(
      [
        '[Refinement 1]: first',
        '[Refinement 2]: second',
        '[Refinement 3]: third',
      ].join('\n')
    );
  });
});

describe('accumulateChatInstructions — empty-message rejection', () => {
  it('throws EmptyMessageError on an empty string', () => {
    expect(() =>
      accumulateChatInstructions({ priorTurns: [], nextMessage: '' })
    ).toThrow(EmptyMessageError);
  });

  it('throws EmptyMessageError on a whitespace-only string', () => {
    expect(() =>
      accumulateChatInstructions({ priorTurns: [], nextMessage: '   \n\t' })
    ).toThrow(EmptyMessageError);
  });

  it('does not emit a prompt when rejecting an empty message', () => {
    let captured: ReturnType<typeof accumulateChatInstructions> | undefined;
    try {
      captured = accumulateChatInstructions({
        priorTurns: [],
        nextMessage: '',
      });
    } catch {
      // expected
    }
    expect(captured).toBeUndefined();
  });
});

describe('accumulateChatInstructions — 5-turn cap full-session signal', () => {
  const fivePriorTurns: ChatTurn[] = Array.from({ length: 5 }, (_, i) =>
    turn({
      id: `t${i + 1}`,
      message: `prior ${i + 1}`,
    })
  );

  it('returns sessionFull=true and does not append a 6th refinement when 5 turns already exist', () => {
    const result = accumulateChatInstructions({
      priorTurns: fivePriorTurns,
      nextMessage: 'sixth attempt',
    });
    expect(result.sessionFull).toBe(true);
    // The compiled prompt must NOT contain the rejected sixth message.
    expect(result.compiledPrompt).not.toContain('sixth attempt');
    expect(result.compiledPrompt).not.toContain('[Refinement 6]');
  });

  it('still emits the 5 prior turns in the compiled prompt for inspection when full', () => {
    const result = accumulateChatInstructions({
      priorTurns: fivePriorTurns,
      nextMessage: 'sixth attempt',
    });
    expect(result.compiledPrompt).toContain('[Refinement 1]: prior 1');
    expect(result.compiledPrompt).toContain('[Refinement 5]: prior 5');
  });

  it('accepts the 5th turn (boundary) when only 4 prior turns exist', () => {
    const fourPriorTurns = fivePriorTurns.slice(0, 4);
    const result = accumulateChatInstructions({
      priorTurns: fourPriorTurns,
      nextMessage: 'fifth attempt',
    });
    expect(result.sessionFull).toBeUndefined();
    expect(result.compiledPrompt).toContain('[Refinement 5]: fifth attempt');
  });
});

describe('accumulateChatInstructions — trimming applies to prior turns too', () => {
  it('trims whitespace embedded in prior-turn messages so compiled output stays clean', () => {
    const priorTurns: ChatTurn[] = [
      turn({ id: 't1', message: '  leading spaces  ' }),
    ];
    const result = accumulateChatInstructions({
      priorTurns,
      nextMessage: 'next',
    });
    expect(result.compiledPrompt).toBe(
      ['[Refinement 1]: leading spaces', '[Refinement 2]: next'].join('\n')
    );
  });
});

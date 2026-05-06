/**
 * @vitest-environment node
 *
 * e5 TDD — lib/designs/loadChatTurns.ts
 *
 * Server-only Admin SDK reader for /designs/{id}/chat_turns. Resolves each
 * turn's imageUrl via resolveImageUrl(generation.resultStoragePath).
 *
 * Per reference_jsdom_formdata_node_env.md: Admin SDK + Node primitives —
 * use node env directive at the top of this file.
 *
 * RED until e5 implement step ships lib/designs/loadChatTurns.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockResolveImageUrl = vi.fn();
vi.mock('@/lib/designs/imageUrl', () => ({
  resolveImageUrl: mockResolveImageUrl,
}));

const mockGet = vi.fn();
const mockOrderBy = vi.fn(() => ({
  get: mockGet,
  limit: vi.fn(() => ({ get: mockGet })),
}));
const mockChatTurnsCollection = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockGenerationDoc = vi.fn();
const mockDesignsCollection = vi.fn(() => ({
  doc: vi.fn(() => ({
    collection: mockChatTurnsCollection,
  })),
}));
const mockGenerationsCollection = vi.fn(() => ({ doc: mockGenerationDoc }));

const mockDb = {
  collection: vi.fn((name: string) =>
    name === 'designs' ? mockDesignsCollection() : mockGenerationsCollection()
  ),
};

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
}));

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: vi.fn(() => ({})),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveImageUrl.mockImplementation((path: string | null) =>
    Promise.resolve(path ? `https://example.com/${path}` : null)
  );
});

afterEach(() => {
  vi.resetModules();
});

function chatTurnDoc(input: {
  id: string;
  designId: string;
  userId: string;
  message: string;
  status: 'pending' | 'success' | 'failed';
  generationId: string | null;
  createdAt: string;
}) {
  return {
    id: input.id,
    data: () => ({
      designId: input.designId,
      userId: input.userId,
      message: input.message,
      status: input.status,
      generationId: input.generationId,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    }),
  };
}

describe('loadDesignChatTurns', () => {
  it('reads chat_turns ordered by createdAt ASC capped at 5', async () => {
    mockGet.mockResolvedValueOnce({ docs: [] });

    const { loadDesignChatTurns } = await import('@/lib/designs/loadChatTurns');
    await loadDesignChatTurns({ designId: 'd1', userId: 'u1' });

    expect(mockChatTurnsCollection).toHaveBeenCalled();
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'asc');
  });

  it('resolves imageUrl only for turns with non-null generationId', async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        chatTurnDoc({
          id: 't1',
          designId: 'd1',
          userId: 'u1',
          message: 'first',
          status: 'success',
          generationId: 'gen-1',
          createdAt: '2026-05-05T00:00:01Z',
        }),
        chatTurnDoc({
          id: 't2',
          designId: 'd1',
          userId: 'u1',
          message: 'pending',
          status: 'pending',
          generationId: null,
          createdAt: '2026-05-05T00:00:02Z',
        }),
        chatTurnDoc({
          id: 't3',
          designId: 'd1',
          userId: 'u1',
          message: 'fail',
          status: 'failed',
          generationId: null,
          createdAt: '2026-05-05T00:00:03Z',
        }),
      ],
    });

    // Generation lookup for t1 returns a doc with resultStoragePath
    mockGenerationDoc.mockReturnValueOnce({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ resultStoragePath: 'users/u1/g/abc.jpg' }),
      }),
    });

    const { loadDesignChatTurns } = await import('@/lib/designs/loadChatTurns');
    const result = await loadDesignChatTurns({ designId: 'd1', userId: 'u1' });

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe('t1');
    expect(result[0]?.imageUrl).toBe('https://example.com/users/u1/g/abc.jpg');
    expect(result[1]?.imageUrl).toBeNull();
    expect(result[2]?.imageUrl).toBeNull();
    expect(mockResolveImageUrl).toHaveBeenCalledTimes(1);
  });

  it('drops turns whose userId does not match input.userId', async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        chatTurnDoc({
          id: 't1',
          designId: 'd1',
          userId: 'u1',
          message: 'mine',
          status: 'success',
          generationId: 'gen-1',
          createdAt: '2026-05-05T00:00:01Z',
        }),
        chatTurnDoc({
          id: 'tx',
          designId: 'd1',
          userId: 'attacker',
          message: 'theirs',
          status: 'success',
          generationId: 'gen-x',
          createdAt: '2026-05-05T00:00:02Z',
        }),
      ],
    });

    mockGenerationDoc.mockReturnValueOnce({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ resultStoragePath: 'p/1.jpg' }),
      }),
    });

    const { loadDesignChatTurns } = await import('@/lib/designs/loadChatTurns');
    const result = await loadDesignChatTurns({ designId: 'd1', userId: 'u1' });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('t1');
  });

  it('returns empty array when Admin SDK throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));

    const { loadDesignChatTurns } = await import('@/lib/designs/loadChatTurns');
    const result = await loadDesignChatTurns({ designId: 'd1', userId: 'u1' });

    expect(result).toEqual([]);
  });

  it('returns empty array when collection is empty', async () => {
    mockGet.mockResolvedValueOnce({ docs: [] });

    const { loadDesignChatTurns } = await import('@/lib/designs/loadChatTurns');
    const result = await loadDesignChatTurns({ designId: 'd1', userId: 'u1' });

    expect(result).toEqual([]);
  });
});

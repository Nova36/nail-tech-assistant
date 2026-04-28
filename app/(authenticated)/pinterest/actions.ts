'use server';

import { listPinterestBoards } from '@/lib/pinterest/client';

import type { PinterestBoard } from '@/lib/pinterest/types';

export async function loadMoreBoards(bookmark: string): Promise<{
  items: PinterestBoard[];
  nextBookmark: string | null;
}> {
  const result = await listPinterestBoards({ bookmark });

  if (!result.ok) {
    throw new Error(`Failed to load Pinterest boards: ${result.reason}`);
  }

  return {
    items: result.items,
    nextBookmark: result.nextBookmark,
  };
}

'use server';

import {
  listPinterestBoardPins,
  listPinterestBoards,
} from '@/lib/pinterest/client';

import type { PinterestBoard, PinterestPin } from '@/lib/pinterest/types';

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

export async function loadMorePins(
  boardId: string,
  bookmark: string | null
): Promise<{
  items: PinterestPin[];
  nextBookmark: string | null;
}> {
  const result = await listPinterestBoardPins({
    boardId,
    bookmark: bookmark ?? undefined,
  });

  if (!result.ok) {
    throw new Error(`Failed to load Pinterest pins: ${result.reason}`);
  }

  return {
    items: result.items,
    nextBookmark: result.nextBookmark,
  };
}

import {
  listPinterestBoardPins,
  listPinterestBoards,
  verifyPinterestToken,
} from '@/lib/pinterest/client';

import { Wizard } from './Wizard';

import type { PinterestPin } from '@/lib/pinterest/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadInitialPins(): Promise<PinterestPin[]> {
  const verify = await verifyPinterestToken();
  if (!verify.ok) {
    console.warn('[design/new] pinterest verify failed', {
      reason: verify.reason,
    });
    return [];
  }

  const boards = await listPinterestBoards();
  if (!boards.ok) {
    console.warn('[design/new] pinterest list boards failed', {
      reason: boards.reason,
    });
    return [];
  }

  const firstBoard = boards.items[0];
  if (!firstBoard) {
    return [];
  }

  const pins = await listPinterestBoardPins({
    boardId: firstBoard.id,
    pageSize: 25,
  });
  if (!pins.ok) {
    console.warn('[design/new] pinterest list pins failed', {
      reason: pins.reason,
      boardId: firstBoard.id,
    });
    return [];
  }

  return pins.items;
}

export default async function NewDesignPage() {
  const initialPins = await loadInitialPins();

  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Design Studio
          </p>
          <h1 className="font-heading-display text-4xl font-light leading-none tracking-[-0.03em] text-foreground md:text-5xl">
            New workspace
          </h1>
        </div>

        <Wizard initialPins={initialPins} />
      </section>
    </main>
  );
}

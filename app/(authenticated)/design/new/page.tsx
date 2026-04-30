import { Wizard } from './Wizard';

import type { PinterestPin } from '@/lib/pinterest/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function NewDesignPage() {
  const initialPins: PinterestPin[] = [];

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

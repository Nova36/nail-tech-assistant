import { DesignCard } from '@/components/DesignCard';
import { LibraryEmptyState } from '@/components/LibraryEmptyState';

import type { Design } from '@/lib/types';

type Card = {
  design: Design;
  latestImageUrl: string | null;
};

type Props = {
  cards: Card[];
};

export function DesignLibrary({ cards }: Props) {
  return (
    <section data-component="DesignLibrary" className="space-y-8">
      {cards.length === 0 ? (
        <LibraryEmptyState />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {cards.map((card) => (
            <DesignCard
              key={card.design.id}
              design={card.design}
              latestImageUrl={card.latestImageUrl}
            />
          ))}
        </div>
      )}
    </section>
  );
}

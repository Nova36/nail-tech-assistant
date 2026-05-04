import { getFirestore } from 'firebase-admin/firestore';
import { redirect } from 'next/navigation';

import { DesignLibrary } from '@/components/DesignLibrary';
import { resolveImageUrl } from '@/lib/designs/imageUrl';
import { listDesignsForUser } from '@/lib/designs/list';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSessionForServerAction } from '@/lib/firebase/session';
import { generationConverter } from '@/lib/firestore/converters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const session = await getSessionForServerAction();

  if (!session?.uid) {
    redirect('/');
  }

  const designs = await listDesignsForUser(session.uid);
  const db = getFirestore(createServerFirebaseAdmin());

  const cards = await Promise.all(
    designs.map(async (design) => {
      if (!design.latestGenerationId) {
        return { design, latestImageUrl: null };
      }

      const generationSnap = await db
        .collection('generations')
        .doc(design.latestGenerationId)
        .withConverter(generationConverter)
        .get();
      const generation = generationSnap.data();
      const latestImageUrl =
        generation?.status === 'success' && generation.resultStoragePath
          ? await resolveImageUrl(generation.resultStoragePath)
          : null;

      return { design, latestImageUrl };
    })
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <header className="mb-8 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Saved designs
        </p>
        <h1 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
          Library
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Revisit your saved concepts, rename them inline, and open any design
          to continue refining it.
        </p>
      </header>
      <DesignLibrary cards={cards} />
    </main>
  );
}

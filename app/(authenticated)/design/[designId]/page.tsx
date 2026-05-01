import { getFirestore } from 'firebase-admin/firestore';
import { redirect } from 'next/navigation';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { getSessionForServerAction } from '@/lib/firebase/session';
import { designConverter } from '@/lib/firestore/converters';

import { Confirm } from './Confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DesignDetailPage({
  params,
}: {
  params: Promise<{ designId: string }>;
}) {
  const { designId } = await params;
  const session = await getSessionForServerAction();

  if (!session?.uid) {
    redirect('/');
  }

  const db = getFirestore(createServerFirebaseAdmin());
  const snap = await db
    .collection('designs')
    .doc(designId)
    .withConverter(designConverter)
    .get();

  if (!snap.exists) {
    redirect('/design/new');
  }

  const design = snap.data();

  if (!design || design.userId !== session.uid) {
    redirect('/design/new');
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <Confirm
        designId={designId}
        nailShape={design.nailShape}
        promptText={design.promptText}
        latestGenerationId={design.latestGenerationId}
      />
    </main>
  );
}

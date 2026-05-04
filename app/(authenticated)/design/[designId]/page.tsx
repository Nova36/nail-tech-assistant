import { notFound, redirect } from 'next/navigation';

import { Confirm } from '@/app/(authenticated)/design/[designId]/Confirm';
import { DesignNameField } from '@/components/DesignNameField';
import { resolveImageUrl } from '@/lib/designs/imageUrl';
import { loadDesignDetail } from '@/lib/designs/load';
import { getSessionForServerAction } from '@/lib/firebase/session';

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

  const designDetail = await loadDesignDetail({
    designId,
    userId: session.uid,
  });

  if (!designDetail || designDetail.design.userId !== session.uid) {
    notFound();
  }

  const initialImageUrl =
    designDetail.latestGeneration?.status === 'success'
      ? await resolveImageUrl(designDetail.latestGeneration.resultStoragePath)
      : null;

  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <DesignNameField
        designId={designDetail.design.id}
        initialName={designDetail.design.name}
      />
      <Confirm
        designId={designDetail.design.id}
        nailShape={designDetail.design.nailShape}
        promptText={designDetail.design.promptText}
        latestGenerationId={designDetail.design.latestGenerationId}
        initialImageUrl={initialImageUrl}
      />
    </main>
  );
}

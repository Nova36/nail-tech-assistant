import 'server-only';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { designConverter } from '@/lib/firestore/converters';

import type { Design } from '@/lib/types';

export async function listDesignsForUser(userId: string): Promise<Design[]> {
  const db = getFirestore(createServerFirebaseAdmin());

  try {
    const snap = await db
      .collection('designs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .withConverter(designConverter)
      .get();

    return snap.docs.map((doc) => doc.data());
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    console.error('[designs/list] listDesignsForUser failed', {
      code,
      message,
      userId,
    });
    throw error;
  }
}

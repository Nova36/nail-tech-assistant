import 'server-only';

import { getFirestore } from 'firebase-admin/firestore';

import { resolveImageUrl } from '@/lib/designs/imageUrl';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';

import type { ChatTurnRecord } from '@/lib/firestore/converters/chat-turns';

export type ChatTurnView = {
  id: string;
  message: string;
  status: 'pending' | 'success' | 'failed';
  generationId: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export async function loadDesignChatTurns(input: {
  designId: string;
  userId: string;
}): Promise<ChatTurnView[]> {
  try {
    const db = getFirestore(createServerFirebaseAdmin());
    const snapshot = await db
      .collection('designs')
      .doc(input.designId)
      .collection('chat_turns')
      .orderBy('createdAt', 'asc')
      .limit(5)
      .get();

    const turns = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ChatTurnRecord, 'id'>),
      }))
      .filter((turn) => {
        if (turn.userId === input.userId) {
          return true;
        }

        console.warn('[loadChatTurns] cross-user turn dropped', {
          designId: input.designId,
          turnId: turn.id,
          requestedUserId: input.userId,
          turnUserId: turn.userId,
        });
        return false;
      });

    return Promise.all(
      turns.map(async (turn) => {
        let imageUrl: string | null = null;

        if (turn.generationId) {
          const generationSnap = await db
            .collection('generations')
            .doc(turn.generationId)
            .get();
          const generation = generationSnap.exists
            ? (generationSnap.data() as { resultStoragePath?: string | null })
            : null;
          imageUrl = await resolveImageUrl(
            generation?.resultStoragePath ?? null
          );
        }

        return {
          id: turn.id,
          message: turn.message,
          status: turn.status,
          generationId: turn.generationId,
          imageUrl,
          createdAt: turn.createdAt,
        };
      })
    );
  } catch (error) {
    console.error('[loadChatTurns] failed', {
      designId: input.designId,
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

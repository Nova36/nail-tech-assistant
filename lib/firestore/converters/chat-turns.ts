import type { FirestoreDataConverter } from 'firebase-admin/firestore';

export type ChatTurnStatus = 'pending' | 'success' | 'failed';

export type ChatTurnRecord = {
  id: string;
  designId: string;
  userId: string;
  message: string;
  status: ChatTurnStatus;
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
};

const CHAT_TURN_STATUSES: readonly ChatTurnStatus[] = [
  'pending',
  'success',
  'failed',
];

function isChatTurnStatus(value: unknown): value is ChatTurnStatus {
  return (
    typeof value === 'string' &&
    (CHAT_TURN_STATUSES as readonly string[]).includes(value)
  );
}

export const chatTurnConverter: FirestoreDataConverter<ChatTurnRecord> = {
  toFirestore(chatTurn) {
    const turn = chatTurn as ChatTurnRecord;
    return {
      designId: turn.designId,
      userId: turn.userId,
      message: turn.message,
      status: turn.status,
      generationId: turn.generationId,
      createdAt: turn.createdAt,
      updatedAt: turn.updatedAt,
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    if (!isChatTurnStatus(data.status)) {
      throw new Error(
        `chatTurnConverter: invalid status: ${String(data.status)}`
      );
    }

    return {
      id: snapshot.id,
      designId: data.designId as string,
      userId: data.userId as string,
      message: data.message as string,
      status: data.status,
      generationId: (data.generationId ?? null) as string | null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  },
};

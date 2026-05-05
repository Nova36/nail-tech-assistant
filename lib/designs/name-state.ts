import 'server-only';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { designConverter } from '@/lib/firestore/converters';

export function applyName(input: { designId: string; name: unknown }): {
  designId: string;
  name: string | null;
} {
  if (input.name === null) {
    return {
      designId: input.designId,
      name: null,
    };
  }

  if (typeof input.name !== 'string') {
    throw new Error('Invalid name: must be string or null');
  }

  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) {
    return {
      designId: input.designId,
      name: null,
    };
  }

  if (trimmedName.length > 80) {
    throw new Error('Invalid name: exceeds 80 chars');
  }

  return {
    designId: input.designId,
    name: trimmedName,
  };
}

export async function persistName(input: {
  designId: string;
  name: unknown;
}): Promise<{ status: 'saved'; designId: string; name: string | null }> {
  const normalized = applyName(input);

  const db = getFirestore(createServerFirebaseAdmin());
  const designRef = db
    .collection('designs')
    .doc(normalized.designId)
    .withConverter(designConverter);

  await designRef.firestore.doc(designRef.path).update({
    name: normalized.name,
    updatedAt: new Date().toISOString(),
  });

  return {
    status: 'saved',
    designId: normalized.designId,
    name: normalized.name,
  };
}

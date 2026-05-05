import 'server-only';

import { getFirestore } from 'firebase-admin/firestore';

import { createServerFirebaseAdmin } from '@/lib/firebase/server';
import { designConverter } from '@/lib/firestore/converters';

import type { NailShape } from '@/lib/types';

const VALID_NAIL_SHAPES = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
] as const satisfies readonly NailShape[];

function isNailShape(value: unknown): value is NailShape {
  return (
    typeof value === 'string' &&
    (VALID_NAIL_SHAPES as readonly string[]).includes(value)
  );
}

export function applyShape(input: { designId: string; nailShape: NailShape }): {
  designId: string;
  nailShape: NailShape;
} {
  if (!isNailShape(input.nailShape)) {
    throw new Error(`Invalid nailShape: ${String(input.nailShape)}`);
  }

  return {
    designId: input.designId,
    nailShape: input.nailShape,
  };
}

export async function writeShapeUpdate(input: {
  designId: string;
  nailShape: NailShape;
  updatedAt: string;
}): Promise<void> {
  const db = getFirestore(createServerFirebaseAdmin());
  const designRef = db
    .collection('designs')
    .doc(input.designId)
    .withConverter(designConverter);

  await designRef.firestore.doc(designRef.path).update({
    nail_shape: input.nailShape,
    updatedAt: input.updatedAt,
  });
}

export async function persistShape(input: {
  designId: string;
  nailShape: NailShape;
}): Promise<{ status: 'updated'; nailShape: NailShape }> {
  applyShape(input);

  await writeShapeUpdate({
    designId: input.designId,
    nailShape: input.nailShape,
    updatedAt: new Date().toISOString(),
  });

  return { status: 'updated', nailShape: input.nailShape };
}

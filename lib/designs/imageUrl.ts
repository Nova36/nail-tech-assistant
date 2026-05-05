import 'server-only';

import { getServerFirebaseStorage } from '@/lib/firebase/storage';

function isStorageEmulator(): boolean {
  return Boolean(
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.STORAGE_EMULATOR_HOST
  );
}

export async function resolveImageUrl(
  storagePath: string | null
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  const bucket = getServerFirebaseStorage();

  if (isStorageEmulator()) {
    const emulatorHost =
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??
      process.env.STORAGE_EMULATOR_HOST;
    return `http://${emulatorHost}/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
  }

  const [imageUrl] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
  });

  return imageUrl;
}

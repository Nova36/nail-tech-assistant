/**
 * c3-data-model-types-converters — Firestore converter for the `generations`
 * collection.
 *
 * Pure data translator. Validates the discriminated lifecycle:
 *   status ∈ { pending, success, failure }
 *   if status === 'failure' then errorCode ∈ { refusal, rate_limit,
 *                                              network, unknown }
 *   else errorCode === null
 *
 * Other fields default null per the lifecycle:
 *   pending → resultStoragePath = null, errorCode = null, errorMessage = null
 *   success → resultStoragePath: string, errorCode = null
 *   failure → errorCode required, errorMessage typically present
 */
import type {
  Generation,
  GenerationStatus,
  GenerationErrorCode,
} from '@/lib/types';
import type { FirestoreDataConverter } from 'firebase-admin/firestore';

const GENERATION_STATUSES: readonly GenerationStatus[] = [
  'pending',
  'success',
  'failure',
];

const GENERATION_ERROR_CODES: readonly GenerationErrorCode[] = [
  'refusal',
  'rate_limit',
  'network',
  'unknown',
];

function isGenerationStatus(value: unknown): value is GenerationStatus {
  return (
    typeof value === 'string' &&
    (GENERATION_STATUSES as readonly string[]).includes(value)
  );
}

function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return (
    typeof value === 'string' &&
    (GENERATION_ERROR_CODES as readonly string[]).includes(value)
  );
}

export const generationConverter: FirestoreDataConverter<Generation> = {
  toFirestore(gen) {
    const g = gen as Generation;
    return {
      designId: g.designId,
      userId: g.userId,
      requestJson: g.requestJson,
      resultStoragePath: g.resultStoragePath,
      nailSwatchStoragePath: g.nailSwatchStoragePath,
      providerResponseMetadata: g.providerResponseMetadata,
      status: g.status,
      errorCode: g.errorCode,
      errorMessage: g.errorMessage,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    if (!isGenerationStatus(data.status)) {
      throw new Error(
        `generationConverter: invalid status: ${String(data.status)}`
      );
    }

    let errorCode: GenerationErrorCode | null = null;
    if (data.status === 'failure') {
      if (!isGenerationErrorCode(data.errorCode)) {
        throw new Error(
          `generationConverter: invalid errorCode for failure status: ${String(data.errorCode)}`
        );
      }
      errorCode = data.errorCode;
    }

    return {
      id: snapshot.id,
      designId: data.designId as string,
      userId: data.userId as string,
      requestJson: data.requestJson as unknown,
      resultStoragePath: (data.resultStoragePath ?? null) as string | null,
      nailSwatchStoragePath: (data.nailSwatchStoragePath ?? null) as
        | string
        | null,
      providerResponseMetadata: (data.providerResponseMetadata ??
        null) as unknown,
      status: data.status,
      errorCode,
      errorMessage: (data.errorMessage ?? null) as string | null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  },
};

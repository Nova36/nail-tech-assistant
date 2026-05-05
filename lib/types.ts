export type NailShape =
  | 'almond'
  | 'coffin'
  | 'square'
  | 'round'
  | 'oval'
  | 'stiletto';

export function assertUnreachableShape(s: never): never {
  throw new Error(`Unexpected NailShape: ${String(s)}`);
}

export interface AuthUser {
  uid: string;
  email: string;
}

export interface Profile {
  /** Matches Firebase Auth uid exactly per FR-A-7 */
  id: string;
}

// ─── Epic C domain types (c3-data-model-types-converters) ──────────────────

export type ReferenceSource = 'pinterest' | 'upload';

export type GenerationStatus = 'pending' | 'success' | 'failure';

export type GenerationErrorCode =
  | 'refusal'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export interface Reference {
  id: string;
  userId: string;
  source: ReferenceSource;
  sourceUrl: string | null;
  storagePath: string;
  pinterestPinId: string | null;
  createdAt: string;
}

export interface Design {
  id: string;
  userId: string;
  name: string | null;
  primaryReferenceId: string;
  /** Ordered array. Locked per design-discussion §3 + research-brief Open Q4. */
  secondaryReferenceIds: string[];
  promptText: string | null;
  nailShape: NailShape;
  latestGenerationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Generation {
  id: string;
  designId: string;
  /** Denormalized owner uid — rules check this without a get() lookup to Design. */
  userId: string;
  /** Provider-opaque pre-flight payload archive. Shape varies by provider. */
  requestJson: unknown;
  resultStoragePath: string | null;
  nailSwatchStoragePath: string | null;
  providerResponseMetadata: unknown;
  status: GenerationStatus;
  errorCode: GenerationErrorCode | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

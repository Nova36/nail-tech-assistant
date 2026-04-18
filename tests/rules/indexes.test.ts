/**
 * Structural shape guard for `firestore.indexes.json`.
 *
 * Runs in the rules Vitest lane but does NOT require the emulator. The file
 * does not exist yet (TDD red phase), so the dynamic import will reject with
 * ERR_MODULE_NOT_FOUND. Once the developer creates the file, this suite
 * validates the top-level shape plus per-entry structure so future index
 * additions cannot regress to a null trap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface IndexField {
  fieldPath: string;
  order?: 'ASCENDING' | 'DESCENDING';
  arrayConfig?: 'CONTAINS';
}

interface IndexEntry {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

interface FieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes?: unknown[];
  ttl?: boolean;
}

interface IndexesFile {
  indexes: IndexEntry[];
  fieldOverrides: FieldOverride[];
}

function loadIndexes(): IndexesFile {
  // Read from disk so the red-phase failure (file missing) surfaces inside
  // the test runner rather than at TypeScript-collection time.
  const filePath = path.resolve(process.cwd(), 'firestore.indexes.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as IndexesFile;
}

describe('firestore.indexes.json shape', () => {
  it('exposes an `indexes` array at the top level', () => {
    const data = loadIndexes();
    expect(Array.isArray(data.indexes)).toBe(true);
  });

  it('exposes a `fieldOverrides` array at the top level', () => {
    const data = loadIndexes();
    expect(Array.isArray(data.fieldOverrides)).toBe(true);
  });

  it('each index entry has the expected structural shape', () => {
    const data = loadIndexes();
    for (const entry of data.indexes) {
      expect(typeof entry.collectionGroup).toBe('string');
      expect(typeof entry.queryScope).toBe('string');
      expect(Array.isArray(entry.fields)).toBe(true);
      for (const field of entry.fields) {
        expect(typeof field.fieldPath).toBe('string');
        const hasOrder = typeof field.order === 'string';
        const hasArrayConfig = typeof field.arrayConfig === 'string';
        expect(hasOrder || hasArrayConfig).toBe(true);
      }
    }
  });

  it('each fieldOverride entry has the expected structural shape', () => {
    const data = loadIndexes();
    for (const entry of data.fieldOverrides) {
      expect(typeof entry.collectionGroup).toBe('string');
      expect(typeof entry.fieldPath).toBe('string');
    }
  });
});

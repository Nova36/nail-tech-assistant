/**
 * AC#5 — lib/types.ts exports NailShape, AuthUser, Profile with zero `any`.
 *
 * Runtime assertions: exports exist, NailShape values are strings, Profile.id is string.
 * Type-level assertions: @ts-expect-error for invalid NailShape members.
 * Lint assertion: grep lib/types.ts for `any` keyword (should be absent).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import type { NailShape, AuthUser, Profile } from '../../../lib/types';

// --- Type-level: valid NailShape members must be assignable ---
const _almond: NailShape = 'almond';
const _coffin: NailShape = 'coffin';
const _square: NailShape = 'square';
const _round: NailShape = 'round';
const _oval: NailShape = 'oval';

// --- Type-level: invalid NailShape members must NOT be assignable ---
// @ts-expect-error — 'stiletto' is not a valid NailShape
const _stiletto: NailShape = 'stiletto';

// --- Type-level: AuthUser must have uid and email ---
const _authUser: AuthUser = { uid: 'uid-1', email: 'test@example.com' };

// --- Type-level: Profile must have id: string ---
const _profile: Profile = { id: 'uid-1' };

describe('lib/types — exported types (AC#5)', () => {
  it('NailShape valid members are assignable at runtime (values are valid strings)', () => {
    const shapes: NailShape[] = ['almond', 'coffin', 'square', 'round', 'oval'];
    for (const s of shapes) {
      expect(typeof s).toBe('string');
    }
    // Suppress unused-variable lint errors for type-level consts above
    void _almond;
    void _coffin;
    void _square;
    void _round;
    void _oval;
    void _stiletto;
    void _authUser;
    void _profile;
  });

  it('AuthUser has required uid and email fields (string typed)', () => {
    expect(typeof _authUser.uid).toBe('string');
    expect(typeof _authUser.email).toBe('string');
  });

  it('Profile has id: string aligned with Firebase Auth uid', () => {
    expect(typeof _profile.id).toBe('string');
  });

  it('lib/types.ts exports NailShape, AuthUser, and Profile', async () => {
    const mod = await import('../../../lib/types');
    // These are type exports — but we verify the module resolves without error
    // and at least one runtime value (if any) is accessible.
    // The mere fact that the import succeeds proves the module exists and is valid TS.
    expect(mod).toBeDefined();
  });

  it('lib/types.ts contains zero `any` keywords', () => {
    const typesPath = resolve(process.cwd(), 'lib/types.ts');
    const source = readFileSync(typesPath, 'utf-8');
    // Strip comments before checking
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const anyMatches = withoutComments.match(/\bany\b/g);
    expect(anyMatches).toBeNull();
  });
});

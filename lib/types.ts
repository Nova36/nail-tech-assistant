export type NailShape = 'almond' | 'coffin' | 'square' | 'round' | 'oval';

export interface AuthUser {
  uid: string;
  email: string;
}

export interface Profile {
  /** Matches Firebase Auth uid exactly per FR-A-7 */
  id: string;
}

/**
 * The application's identity record — one row per Supabase Auth user,
 * created automatically by the database (see
 * supabase/migrations/20260903143905_auth_profile_lifecycle.sql). This is
 * real, RLS-governed data, unlike the display-only MockUser/MockHousehold
 * types in src/types/household.ts that the rest of the app still uses for
 * household/member/grocery data in this slice.
 */
export interface Profile {
  id: string
  email: string
  displayName: string
  createdAt: string
  updatedAt: string
}

/** Raw shape returned by `select id, email, display_name, created_at, updated_at from profiles`. */
export interface ProfileRow {
  id: string
  email: string
  display_name: string
  created_at: string
  updated_at: string
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export type SignUpResult =
  | { kind: 'signed-in' }
  | { kind: 'confirmation-required' }
  | { kind: 'error'; message: string }

export type SignInResult = { kind: 'success' } | { kind: 'error'; message: string }

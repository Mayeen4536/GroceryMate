import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { AuthStatus, Profile, SignInResult, SignUpResult } from './types'

export interface AuthContextValue {
  /** 'loading' only during initial session hydration — never re-enters this after startup. */
  status: AuthStatus
  session: Session | null
  /** The raw Supabase Auth user (id, email, metadata). Prefer `profile` for display. */
  user: User | null
  profile: Profile | null
  profileLoading: boolean
  /** Set when a signed-in session exists but the profile row couldn't be fetched. Never a fabricated profile. */
  profileError: string | null
  retryProfile: () => void
  /**
   * `redirectTo`, when given, is an internal path (e.g. `/join/:token`) —
   * never a full URL — that the confirmation email's own link should land
   * on. This is how an invite destination survives Supabase's real,
   * hosted email-confirmation step with no client-side token storage: the
   * destination is encoded in the emailed link itself, not remembered by
   * this browser. See src/invite/routes.ts and docs/INVITE_JOIN_DESIGN.md.
   */
  signUp: (email: string, password: string, displayName: string, redirectTo?: string) => Promise<SignUpResult>
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  /** The only profile field authenticated users may edit (Migration 3's column grant). */
  updateDisplayName: (next: string) => Promise<{ error?: string }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

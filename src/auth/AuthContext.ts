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
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  /** The only profile field authenticated users may edit (Migration 3's column grant). */
  updateDisplayName: (next: string) => Promise<{ error?: string }>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

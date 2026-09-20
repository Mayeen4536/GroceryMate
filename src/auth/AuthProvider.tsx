import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { normalizeAuthError } from './errors'
import { mapProfileRow, type AuthStatus, type Profile, type ProfileRow } from './types'

/**
 * Owns Supabase session + profile state for the whole app. A deliberate,
 * single exception to this codebase's usual "hook owns state, threaded
 * down as props from App.tsx" convention (see src/hooks/useMembers.ts and
 * friends): session identity is needed in places that aren't in a
 * parent-child relationship to one feature page — the route guard in
 * App.tsx, Sidebar, TopBar, and SettingsPage all need it independently.
 * Threading it as props would mean piping it through AppShell into
 * siblings that don't otherwise share props. Everywhere else in this app,
 * prefer that existing hook-in-App.tsx pattern over adding another Context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileReloadToken, setProfileReloadToken] = useState(0)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setStatus(nextSession ? 'signed-in' : 'signed-out')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Profile lookup is always keyed on the authenticated user's own id from
  // the session — never a client-selected id — matching what Migration 3's
  // profiles_select_own RLS policy already enforces server-side. This is
  // what proves that policy works from the real application, not just from
  // direct database testing.
  const userId = session?.user.id
  const lastUserIdRef = useRef(userId)
  if (userId !== lastUserIdRef.current) {
    lastUserIdRef.current = userId
    // Reset immediately on sign-out (or user switch) rather than via an
    // effect — this is React's documented "adjust state while rendering"
    // pattern for resetting derived state, not a side effect in itself:
    // https://react.dev/learn/you-might-not-need-an-effect
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function loadProfile() {
      setProfileLoading(true)
      setProfileError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at, updated_at')
        .eq('id', userId)
        .single<ProfileRow>()

      if (cancelled) return
      if (error || !data) {
        console.error('[auth] profile load failed', error)
        setProfile(null)
        setProfileError('We couldn’t load your profile.')
      } else {
        setProfile(mapProfileRow(data))
      }
      setProfileLoading(false)
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [userId, profileReloadToken])

  const retryProfile = useCallback(() => setProfileReloadToken((n) => n + 1), [])

  const signUp = useCallback(async (email: string, password: string, displayName: string, redirectTo?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        // Only set when the signup started from an invite — otherwise
        // omitted entirely, so a plain signup keeps using the project's
        // own default Site URL, exactly as before this option existed.
        ...(redirectTo ? { emailRedirectTo: `${window.location.origin}${redirectTo}` } : {}),
      },
    })
    if (error) return { kind: 'error', message: normalizeAuthError(error) } as const
    // Hosted Supabase requires email confirmation, so a successful signUp
    // call here often returns no session yet — that is success, not
    // failure, and must never be treated as a login.
    if (!data.session) return { kind: 'confirmation-required' } as const
    return { kind: 'signed-in' } as const
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { kind: 'error', message: normalizeAuthError(error) } as const
    return { kind: 'success' } as const
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updateDisplayName = useCallback(async (next: string) => {
    const trimmed = next.trim()
    if (!session?.user.id || !trimmed) return { error: 'Display name can’t be empty.' }

    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', session.user.id)
      .select('id, email, display_name, created_at, updated_at')
      .single<ProfileRow>()

    if (error || !data) {
      console.error('[auth] display name update failed', error)
      return { error: 'Couldn’t save — please try again.' }
    }
    setProfile(mapProfileRow(data))
    return {}
  }, [session])

  const value: AuthContextValue = {
    status,
    session,
    user,
    profile,
    profileLoading,
    profileError,
    retryProfile,
    signUp,
    signIn,
    signOut,
    updateDisplayName,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

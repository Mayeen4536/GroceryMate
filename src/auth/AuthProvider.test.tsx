import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => {
  let authStateCallback: ((event: string, session: Session | null) => void) | null = null

  const getSession = vi.fn()
  const onAuthStateChange = vi.fn((cb: (event: string, session: Session | null) => void) => {
    authStateCallback = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  const signUp = vi.fn()
  const signInWithPassword = vi.fn()
  const signOut = vi.fn().mockResolvedValue({ error: null })

  const selectSingle = vi.fn()
  const updateSingle = vi.fn()

  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ single: selectSingle }) }),
    update: () => ({ eq: () => ({ select: () => ({ single: updateSingle }) }) }),
  }))

  return {
    getSession,
    onAuthStateChange,
    signUp,
    signInWithPassword,
    signOut,
    selectSingle,
    updateSingle,
    from,
    emitAuthStateChange: (event: string, session: Session | null) => authStateCallback?.(event, session),
    reset() {
      authStateCallback = null
      getSession.mockReset()
      onAuthStateChange.mockClear()
      signUp.mockReset()
      signInWithPassword.mockReset()
      signOut.mockClear().mockResolvedValue({ error: null })
      selectSingle.mockReset()
      updateSingle.mockReset()
      from.mockClear()
    },
  }
})

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}))

// Imported after the mock so AuthProvider picks up the mocked client.
const { AuthProvider } = await import('./AuthProvider')
const { useAuth } = await import('./useAuth')

function makeSession(userId: string): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: userId, email: `${userId}@example.com` },
  } as unknown as Session
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

const PROFILE_ROW = {
  id: 'user-1',
  email: 'user-1@example.com',
  display_name: 'Aisha',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    mocks.reset()
  })

  it('starts in the loading state, then resolves to signed-out with no session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
  })

  it('resolves to signed-in and loads the profile keyed on the session user id', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: makeSession('user-1') } })
    mocks.selectSingle.mockResolvedValue({ data: PROFILE_ROW, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('signed-in'))
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    expect(result.current.profile).toEqual({
      id: 'user-1',
      email: 'user-1@example.com',
      displayName: 'Aisha',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    expect(result.current.profileLoading).toBe(false)
    expect(result.current.profileError).toBeNull()
  })

  it('surfaces a profile error without fabricating a profile when the fetch fails', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: makeSession('user-1') } })
    mocks.selectSingle.mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.profileError).not.toBeNull())
    expect(result.current.profile).toBeNull()
    expect(result.current.status).toBe('signed-in')
  })

  it('clears session and profile on sign-out (via an auth state change event)', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: makeSession('user-1') } })
    mocks.selectSingle.mockResolvedValue({ data: PROFILE_ROW, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    act(() => {
      mocks.emitAuthStateChange('SIGNED_OUT', null)
    })

    await waitFor(() => expect(result.current.status).toBe('signed-out'))
    expect(result.current.session).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.profileError).toBeNull()
  })

  it('signUp returns confirmation-required when signup succeeds without a session, and does not sign the user in', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: 'user-2' } }, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('signed-out'))

    let signUpResult
    await act(async () => {
      signUpResult = await result.current.signUp('new@example.com', 'password123', 'New User')
    })

    expect(signUpResult).toEqual({ kind: 'confirmation-required' })
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: { data: { display_name: 'New User' } },
    })
    expect(result.current.status).toBe('signed-out')
  })

  it('signUp returns a normalized error message on failure', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: {
        name: 'AuthApiError',
        __isAuthError: true,
        status: 422,
        code: 'user_already_exists',
        message: 'x',
      },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('signed-out'))

    let signUpResult
    await act(async () => {
      signUpResult = await result.current.signUp('taken@example.com', 'password123', '')
    })

    expect(signUpResult).toEqual({
      kind: 'error',
      message: 'An account with that email already exists. Try signing in instead.',
    })
  })
})

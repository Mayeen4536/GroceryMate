import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

/** A minimal thenable query-builder stand-in: chainable via eq/select/update, resolves via .single()/.returns()/await directly. */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    returns: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

const mocks = vi.hoisted(() => ({
  authValue: {
    status: 'signed-in' as 'signed-in' | 'signed-out' | 'loading',
    profile: {
      id: 'user-1',
      email: 'user-1@example.com',
      displayName: 'Aisha',
      createdAt: '',
      updatedAt: '',
    } as {
      id: string
      email: string
      displayName: string
      createdAt: string
      updatedAt: string
    } | null,
  },
  membershipsResult: { data: [] as unknown[] | null, error: null as unknown },
  householdResult: { data: null as unknown, error: null as unknown },
  countResult: { count: 0, error: null as unknown },
  rpcResult: { data: null as unknown, error: null as unknown },
  rpcCalls: [] as unknown[],
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => mocks.authValue,
}))

vi.mock('@/auth/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

const { HouseholdProvider } = await import('./HouseholdProvider')
const { useHousehold } = await import('./useHousehold')

function wrapper({ children }: { children: ReactNode }) {
  return <HouseholdProvider>{children}</HouseholdProvider>
}

const MEMBERSHIP_ROW = {
  id: 'member-1',
  household_id: 'household-1',
  profile_id: 'user-1',
  display_name: 'Aisha',
  role: 'owner',
  status: 'active',
}

const HOUSEHOLD_ROW = {
  id: 'household-1',
  name: 'Flat 4B',
  currency_code: 'BDT',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  mocks.authValue.status = 'signed-in'
  mocks.authValue.profile = {
    id: 'user-1',
    email: 'user-1@example.com',
    displayName: 'Aisha',
    createdAt: '',
    updatedAt: '',
  }
  mocks.membershipsResult = { data: [], error: null }
  mocks.householdResult = { data: null, error: null }
  mocks.countResult = { count: 0, error: null }
  mocks.rpcResult = { data: null, error: null }

  mocks.from.mockReset()
  mocks.rpc.mockReset()

  mocks.from.mockImplementation((table: string) => {
    if (table === 'household_members') {
      // Dispatch on the actual arguments the real code passes, not call
      // order — the plain membership lookup and the count query both hit
      // this same table, but only the count one passes a `count` option.
      return {
        select: vi.fn((_cols: string, opts?: { count?: string }) =>
          makeChain(opts?.count ? mocks.countResult : mocks.membershipsResult),
        ),
      }
    }
    if (table === 'households') {
      return { select: vi.fn(() => makeChain(mocks.householdResult)) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  mocks.rpc.mockImplementation(() => Promise.resolve(mocks.rpcResult))
})

describe('HouseholdProvider / useHousehold', () => {
  it('zero memberships → needs-setup', async () => {
    mocks.membershipsResult = { data: [], error: null }

    const { result } = renderHook(() => useHousehold(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('needs-setup'))
    expect(result.current.needsHouseholdSetup).toBe(true)
    expect(result.current.household).toBeNull()
  })

  it('exactly one active membership → household loads', async () => {
    mocks.membershipsResult = { data: [MEMBERSHIP_ROW], error: null }
    mocks.householdResult = { data: HOUSEHOLD_ROW, error: null }
    mocks.countResult = { count: 3, error: null }

    const { result } = renderHook(() => useHousehold(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.household).toEqual({
      id: 'household-1',
      name: 'Flat 4B',
      currencyCode: 'BDT',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      memberCount: 3,
    })
    expect(result.current.currentMembership).toMatchObject({
      id: 'member-1',
      role: 'owner',
      status: 'active',
    })
  })

  it('more than one active membership → unsupported, never guesses', async () => {
    mocks.membershipsResult = {
      data: [MEMBERSHIP_ROW, { ...MEMBERSHIP_ROW, id: 'member-2', household_id: 'household-2' }],
      error: null,
    }

    const { result } = renderHook(() => useHousehold(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('unsupported'))
    expect(result.current.household).toBeNull()
  })

  it('archived-only membership → archived state, not treated as needing setup', async () => {
    mocks.membershipsResult = { data: [{ ...MEMBERSHIP_ROW, status: 'archived' }], error: null }
    mocks.householdResult = { data: HOUSEHOLD_ROW, error: null }
    mocks.countResult = { count: 1, error: null }

    const { result } = renderHook(() => useHousehold(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('archived'))
    expect(result.current.needsHouseholdSetup).toBe(false)
    expect(result.current.household?.name).toBe('Flat 4B')
  })

  it('create_household success refreshes into the ready state', async () => {
    mocks.membershipsResult = { data: [], error: null }
    const { result } = renderHook(() => useHousehold(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('needs-setup'))

    // After the RPC "succeeds", the follow-up refresh should see the new membership.
    mocks.rpcResult = { data: [{ household_id: 'household-1', owner_member_id: 'member-1' }], error: null }
    mocks.membershipsResult = { data: [MEMBERSHIP_ROW], error: null }
    mocks.householdResult = { data: HOUSEHOLD_ROW, error: null }
    mocks.countResult = { count: 1, error: null }

    let createResult
    await act(async () => {
      createResult = await result.current.createHousehold('Flat 4B')
    })

    expect(createResult).toEqual({})
    expect(mocks.rpc).toHaveBeenCalledWith('create_household', { p_name: 'Flat 4B' })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.household?.name).toBe('Flat 4B')
  })

  it('create_household RPC error surfaces without changing status', async () => {
    mocks.membershipsResult = { data: [], error: null }
    const { result } = renderHook(() => useHousehold(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('needs-setup'))

    mocks.rpcResult = { data: null, error: { message: 'boom' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let createResult
    await act(async () => {
      createResult = await result.current.createHousehold('Flat 4B')
    })

    expect(createResult).toEqual({ error: expect.stringContaining('try again') })
    // Never left needs-setup on a failed RPC call.
    expect(result.current.status).toBe('needs-setup')
    spy.mockRestore()
  })

  it('create_household succeeds but the follow-up refresh fails → error state, and a second createHousehold call is never made automatically', async () => {
    mocks.membershipsResult = { data: [], error: null }
    const { result } = renderHook(() => useHousehold(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('needs-setup'))

    mocks.rpcResult = { data: [{ household_id: 'household-1', owner_member_id: 'member-1' }], error: null }
    // The refresh after creation fails (network blip, RLS hiccup, etc.).
    mocks.membershipsResult = { data: null, error: { message: 'network blip' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      await result.current.createHousehold('Flat 4B')
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(mocks.rpc).toHaveBeenCalledTimes(1) // exactly once — no automatic retry of the RPC itself
    spy.mockRestore()
  })

  it('sign-out clears household state', async () => {
    mocks.membershipsResult = { data: [MEMBERSHIP_ROW], error: null }
    mocks.householdResult = { data: HOUSEHOLD_ROW, error: null }
    mocks.countResult = { count: 1, error: null }

    const { result, rerender } = renderHook(() => useHousehold(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    mocks.authValue.status = 'signed-out'
    mocks.authValue.profile = null
    rerender()

    expect(result.current.status).toBe('loading')
    expect(result.current.household).toBeNull()
    expect(result.current.currentMembership).toBeNull()
  })

  it('switching to a different user never shows the previous user’s household, even transiently', async () => {
    mocks.membershipsResult = { data: [MEMBERSHIP_ROW], error: null }
    mocks.householdResult = { data: HOUSEHOLD_ROW, error: null }
    mocks.countResult = { count: 1, error: null }

    const { result, rerender } = renderHook(() => useHousehold(), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.household?.name).toBe('Flat 4B')

    // User B has no household of their own.
    mocks.membershipsResult = { data: [], error: null }
    mocks.authValue.profile = {
      id: 'user-2',
      email: 'user-2@example.com',
      displayName: 'Bilal',
      createdAt: '',
      updatedAt: '',
    }
    rerender()

    // Reset is synchronous (render-time), so User A's household is gone immediately.
    expect(result.current.household).toBeNull()
    await waitFor(() => expect(result.current.status).toBe('needs-setup'))
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A minimal thenable query-builder stand-in: chainable via eq/select/insert/update/order, resolves via .single()/.maybeSingle()/.returns()/await directly. */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    returns: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

const mocks = vi.hoisted(() => ({
  householdValue: { household: { id: 'household-1', name: 'Flat 4B' } as { id: string; name: string } | null },
  selectResult: { data: [] as unknown[] | null, error: null as unknown },
  insertResult: { data: null as unknown, error: null as unknown },
  updateResult: { data: null as unknown, error: null as unknown },
  from: vi.fn(),
}))

vi.mock('@/household/useHousehold', () => ({
  useHousehold: () => mocks.householdValue,
}))

vi.mock('@/auth/supabaseClient', () => ({
  supabase: { from: mocks.from },
}))

const { useHouseholdMembers } = await import('./useHouseholdMembers')

const OWNER_ROW = {
  id: 'member-1',
  household_id: 'household-1',
  profile_id: 'user-1',
  display_name: 'Aisha',
  invited_email: null,
  role: 'owner',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  archived_at: null,
}

const ROOMMATE_ROW = {
  id: 'member-2',
  household_id: 'household-1',
  profile_id: null,
  display_name: 'Bilal',
  invited_email: null,
  role: 'member',
  status: 'active',
  created_at: '2026-01-02T00:00:00Z',
  archived_at: null,
}

beforeEach(() => {
  mocks.householdValue = { household: { id: 'household-1', name: 'Flat 4B' } }
  mocks.selectResult = { data: [OWNER_ROW], error: null }
  mocks.insertResult = { data: { id: 'member-new' }, error: null }
  mocks.updateResult = { data: { id: 'member-2' }, error: null }

  mocks.from.mockReset()
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'household_members') throw new Error(`Unexpected table: ${table}`)
    return {
      select: vi.fn(() => makeChain(mocks.selectResult)),
      insert: vi.fn(() => makeChain(mocks.insertResult)),
      update: vi.fn(() => makeChain(mocks.updateResult)),
    }
  })
})

describe('useHouseholdMembers', () => {
  it('loads the current household roster on mount', async () => {
    mocks.selectResult = { data: [OWNER_ROW, ROOMMATE_ROW], error: null }

    const { result } = renderHook(() => useHouseholdMembers())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.members).toHaveLength(2)
    expect(result.current.members[0]).toMatchObject({ id: 'member-1', name: 'Aisha', role: 'owner' })
  })

  it('a query failure surfaces an error and never fabricates a roster', async () => {
    mocks.selectResult = { data: null, error: { message: 'network blip' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useHouseholdMembers())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members).toEqual([])
    expect(result.current.error).toEqual(expect.stringContaining('try again'))
    spy.mockRestore()
  })

  it('an empty household resolves to an empty, non-loading roster', async () => {
    mocks.selectResult = { data: [], error: null }

    const { result } = renderHook(() => useHouseholdMembers())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.members).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('addMember inserts an active, no-account member and refreshes the roster', async () => {
    mocks.insertResult = { data: { id: 'member-new' }, error: null }
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mocks.selectResult = { data: [OWNER_ROW, { ...ROOMMATE_ROW, id: 'member-new' }], error: null }

    let addResult
    await act(async () => {
      addResult = await result.current.addMember('Bilal')
    })

    expect(addResult).toEqual({ id: 'member-new' })
    await waitFor(() => expect(result.current.members).toHaveLength(2))
  })

  it('addMember rejects a blank name without ever touching the network', async () => {
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))
    mocks.from.mockClear()

    let addResult
    await act(async () => {
      addResult = await result.current.addMember('   ')
    })

    expect(addResult).toEqual({ error: expect.any(String) })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('archiveMember succeeds when RLS permits the update (owner acting)', async () => {
    mocks.updateResult = { data: { id: 'member-2' }, error: null }
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let archiveResult
    await act(async () => {
      archiveResult = await result.current.archiveMember('member-2')
    })

    expect(archiveResult).toEqual({})
  })

  it('archiveMember reports permission-denied when RLS silently blocks the update (null data, no error)', async () => {
    mocks.updateResult = { data: null, error: null }
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let archiveResult
    await act(async () => {
      archiveResult = await result.current.archiveMember('member-2')
    })

    expect(archiveResult).toEqual({ error: expect.any(String) })
  })

  it('reactivateMember succeeds when RLS permits the update', async () => {
    mocks.updateResult = { data: { id: 'member-2' }, error: null }
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let reactivateResult
    await act(async () => {
      reactivateResult = await result.current.reactivateMember('member-2')
    })

    expect(reactivateResult).toEqual({})
  })

  it('reactivateMember reports permission-denied on a silent RLS no-op', async () => {
    mocks.updateResult = { data: null, error: null }
    const { result } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let reactivateResult
    await act(async () => {
      reactivateResult = await result.current.reactivateMember('member-2')
    })

    expect(reactivateResult).toEqual({ error: expect.any(String) })
  })

  it('never leaks one household’s roster into another — resets synchronously on household-id change', async () => {
    mocks.selectResult = { data: [OWNER_ROW], error: null }
    const { result, rerender } = renderHook(() => useHouseholdMembers())
    await waitFor(() => expect(result.current.members).toHaveLength(1))

    mocks.selectResult = { data: [], error: null }
    mocks.householdValue = { household: { id: 'household-2', name: 'Flat 7C' } }
    rerender()

    // Reset happens during render, before the new household's own fetch resolves.
    expect(result.current.members).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('no household loaded yet → idle empty state, never queries', () => {
    mocks.householdValue = { household: null }
    mocks.from.mockClear()

    const { result } = renderHook(() => useHouseholdMembers())

    expect(result.current.members).toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

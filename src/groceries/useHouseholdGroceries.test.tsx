import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A minimal thenable query-builder stand-in: chainable via eq/order/select/insert/update/delete/in, resolves via .single()/.maybeSingle()/.returns()/await directly. */
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    returns: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

const mocks = vi.hoisted(() => ({
  householdValue: {
    household: { id: 'household-1', name: 'Flat 4B' } as { id: string; name: string } | null,
    currentMembership: { id: 'member-1', householdId: 'household-1', profileId: 'user-1', displayName: 'Aisha', role: 'owner' as const, status: 'active' as const } as {
      id: string
    } | null,
  },
  itemsResult: { data: [] as unknown[] | null, error: null as unknown },
  consumersResult: { data: [] as unknown[] | null, error: null as unknown },
  insertItemResult: { data: null as unknown, error: null as unknown },
  insertConsumersResult: { data: null as unknown, error: null as unknown },
  updateItemResult: { data: null as unknown, error: null as unknown },
  deleteItemResult: { data: null as unknown, error: null as unknown },
  from: vi.fn(),
}))

vi.mock('@/household/useHousehold', () => ({
  useHousehold: () => mocks.householdValue,
}))

vi.mock('@/auth/supabaseClient', () => ({
  supabase: { from: mocks.from },
}))

const { useHouseholdGroceries } = await import('./useHouseholdGroceries')

const ITEM_ROW = {
  id: 'item-1',
  household_id: 'household-1',
  name: 'Milk (2L)',
  category: 'dairy',
  amount_minor: 24000,
  quantity: 2,
  paid_by_member_id: 'member-1',
  created_by_member_id: 'member-1',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const CONSUMER_ROW = { grocery_item_id: 'item-1', household_member_id: 'member-1' }

beforeEach(() => {
  mocks.householdValue = {
    household: { id: 'household-1', name: 'Flat 4B' },
    currentMembership: { id: 'member-1' } as never,
  }
  mocks.itemsResult = { data: [ITEM_ROW], error: null }
  mocks.consumersResult = { data: [CONSUMER_ROW], error: null }
  mocks.insertItemResult = { data: { id: 'item-new' }, error: null }
  mocks.insertConsumersResult = { data: null, error: null }
  mocks.updateItemResult = { data: { id: 'item-1' }, error: null }
  mocks.deleteItemResult = { data: { id: 'item-1' }, error: null }

  mocks.from.mockReset()
  mocks.from.mockImplementation((table: string) => {
    if (table === 'grocery_items') {
      return {
        select: vi.fn(() => makeChain(mocks.itemsResult)),
        insert: vi.fn(() => makeChain(mocks.insertItemResult)),
        update: vi.fn(() => makeChain(mocks.updateItemResult)),
        delete: vi.fn(() => makeChain(mocks.deleteItemResult)),
      }
    }
    if (table === 'grocery_item_consumers') {
      return {
        // Both loadGroceries' household-scoped select and editGrocery's
        // item-scoped existing-consumers select hit this same mock — every
        // test here uses the same single-consumer ('member-1') fixture for
        // both, so a real dispatch on query shape isn't needed.
        select: vi.fn(() => makeChain(mocks.consumersResult)),
        insert: vi.fn(() => makeChain(mocks.insertConsumersResult)),
        delete: vi.fn(() => makeChain({ data: null, error: null })),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('useHouseholdGroceries', () => {
  it('loads the current household groceries, grouping consumers by item', async () => {
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.groceries).toHaveLength(1)
    expect(result.current.groceries[0]).toMatchObject({
      id: 'item-1',
      name: 'Milk (2L)',
      price: '240',
      paidByMemberId: 'member-1',
      sharedByMemberIds: ['member-1'],
      createdByMemberId: 'member-1',
    })
  })

  it('maps amount_minor to a decimal price string exactly', async () => {
    mocks.itemsResult = { data: [{ ...ITEM_ROW, amount_minor: 4999 }], error: null }
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groceries[0].price).toBe('49.99')
  })

  it('an empty household resolves to an empty, non-loading list', async () => {
    mocks.itemsResult = { data: [], error: null }
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groceries).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('an items query failure surfaces an error and never fabricates groceries', async () => {
    mocks.itemsResult = { data: null, error: { message: 'network blip' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groceries).toEqual([])
    expect(result.current.error).toEqual(expect.stringContaining('try again'))
    spy.mockRestore()
  })

  it('a partial relation error (items ok, consumers fail) is treated as a full load failure, never a fabricated empty consumer list', async () => {
    mocks.itemsResult = { data: [ITEM_ROW], error: null }
    mocks.consumersResult = { data: null, error: { message: 'consumers relation error' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.groceries).toEqual([])
    expect(result.current.error).toEqual(expect.stringContaining('try again'))
    spy.mockRestore()
  })

  it('addGrocery inserts the item then its consumers, and refreshes', async () => {
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let addResult
    await act(async () => {
      addResult = await result.current.addGrocery({
        name: 'Snacks',
        price: '500',
        quantity: 1,
        category: 'pantry',
        paidByMemberId: 'member-1',
        sharedByMemberIds: ['member-1', 'member-2'],
        notes: '',
      })
    })
    expect(addResult).toEqual({ id: 'item-new' })
  })

  it('addGrocery rejects an unparseable price without ever touching the network', async () => {
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))
    mocks.from.mockClear()

    let addResult
    await act(async () => {
      addResult = await result.current.addGrocery({
        name: 'Snacks',
        price: 'not-a-number',
        quantity: 1,
        category: 'pantry',
        paidByMemberId: 'member-1',
        sharedByMemberIds: ['member-1'],
        notes: '',
      })
    })
    expect(addResult).toEqual({ error: expect.any(String) })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('addGrocery rolls back (deletes) the item when the consumer insert fails, rather than leaving a consumer-less record', async () => {
    mocks.insertConsumersResult = { data: null, error: { message: 'consumer insert failed' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const deleteSpy = vi.fn(() => makeChain({ data: { id: 'item-new' }, error: null }))
    mocks.from.mockImplementation((table: string) => {
      if (table === 'grocery_items') {
        return {
          select: vi.fn(() => makeChain(mocks.itemsResult)),
          insert: vi.fn(() => makeChain(mocks.insertItemResult)),
          delete: deleteSpy,
        }
      }
      if (table === 'grocery_item_consumers') {
        return { insert: vi.fn(() => makeChain(mocks.insertConsumersResult)) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    let addResult
    await act(async () => {
      addResult = await result.current.addGrocery({
        name: 'Snacks',
        price: '500',
        quantity: 1,
        category: 'pantry',
        paidByMemberId: 'member-1',
        sharedByMemberIds: ['member-1'],
        notes: '',
      })
    })
    expect(addResult).toEqual({ error: expect.any(String) })
    expect(deleteSpy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('editGrocery succeeds when RLS permits the update (creator or owner)', async () => {
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let editResult
    await act(async () => {
      editResult = await result.current.editGrocery('item-1', {
        name: 'Milk (2L)',
        price: '250',
        quantity: 2,
        category: 'dairy',
        paidByMemberId: 'member-1',
        sharedByMemberIds: ['member-1'],
        notes: '',
      })
    })
    expect(editResult).toEqual({})
  })

  it('editGrocery reports permission-denied when RLS silently blocks the update (null data, no error)', async () => {
    mocks.updateItemResult = { data: null, error: null }
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let editResult
    await act(async () => {
      editResult = await result.current.editGrocery('item-1', {
        name: 'Milk (2L)',
        price: '250',
        quantity: 2,
        category: 'dairy',
        paidByMemberId: 'member-1',
        sharedByMemberIds: ['member-1'],
        notes: '',
      })
    })
    expect(editResult).toEqual({ error: expect.any(String) })
  })

  it('deleteGrocery succeeds when RLS permits it', async () => {
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let deleteResult
    await act(async () => {
      deleteResult = await result.current.deleteGrocery('item-1')
    })
    expect(deleteResult).toEqual({})
  })

  it('deleteGrocery reports permission-denied on a silent RLS no-op', async () => {
    mocks.deleteItemResult = { data: null, error: null }
    const { result } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let deleteResult
    await act(async () => {
      deleteResult = await result.current.deleteGrocery('item-1')
    })
    expect(deleteResult).toEqual({ error: expect.any(String) })
  })

  it('never leaks one household’s groceries into another — resets synchronously on household-id change', async () => {
    mocks.itemsResult = { data: [ITEM_ROW], error: null }
    const { result, rerender } = renderHook(() => useHouseholdGroceries())
    await waitFor(() => expect(result.current.groceries).toHaveLength(1))

    mocks.itemsResult = { data: [], error: null }
    mocks.householdValue = {
      household: { id: 'household-2', name: 'Flat 7C' },
      currentMembership: { id: 'member-9' } as never,
    }
    rerender()

    // Reset happens during render, before the new household's own fetch resolves.
    expect(result.current.groceries).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('no household loaded yet → idle empty state, never queries', () => {
    mocks.householdValue = { household: null, currentMembership: null }
    mocks.from.mockClear()

    const { result } = renderHook(() => useHouseholdGroceries())

    expect(result.current.groceries).toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GroceryItem } from '@/types/grocery'

const MILK: GroceryItem = {
  id: 'item-1',
  name: 'Milk (2L)',
  price: '240',
  quantity: 2,
  category: 'dairy',
  paidByMemberId: 'member-1',
  sharedByMemberIds: ['member-1', 'member-2'],
  createdByMemberId: 'member-1',
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const RICE: GroceryItem = {
  id: 'item-2',
  name: 'Rice',
  price: '900',
  quantity: 1,
  category: 'pantry',
  paidByMemberId: 'member-1',
  sharedByMemberIds: ['member-1'],
  createdByMemberId: 'member-1',
  notes: '',
  createdAt: '2026-01-02T00:00:00.000Z',
}

const mocks = vi.hoisted(() => ({
  groceries: [] as GroceryItem[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
  addGrocery: vi.fn(),
  editGrocery: vi.fn(),
  deleteGrocery: vi.fn(),
}))

vi.mock('@/groceries/useHouseholdGroceries', () => ({
  useHouseholdGroceries: () => ({
    groceries: mocks.groceries,
    loading: mocks.loading,
    error: mocks.error,
    refresh: mocks.refresh,
    addGrocery: mocks.addGrocery,
    editGrocery: mocks.editGrocery,
    deleteGrocery: mocks.deleteGrocery,
  }),
}))

const { useGroceries } = await import('./useGroceries')

// useGroceries calls useMediaQuery (for isDesktop) — jsdom doesn't
// implement matchMedia at all, so every hook that reaches it needs this
// minimal polyfill, same shape every other window.matchMedia consumer in
// this app expects.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

beforeEach(() => {
  mocks.groceries = [MILK, RICE]
  mocks.loading = false
  mocks.error = null
  mocks.refresh.mockReset()
  mocks.addGrocery.mockReset().mockResolvedValue({ id: 'item-new' })
  mocks.editGrocery.mockReset().mockResolvedValue({})
  // A real deleteGrocery, on success, also refreshes `groceries` to no
  // longer include the deleted row — mirrored here so a finalized delete
  // doesn't "reappear" from underneath pendingDeletes purely because the
  // mock's own backing array never changed.
  mocks.deleteGrocery.mockReset().mockImplementation(async (id: string) => {
    mocks.groceries = mocks.groceries.filter((item) => item.id !== id)
    return {}
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useGroceries', () => {
  it('passes through the real grocery list, loading, and error state untouched', () => {
    mocks.loading = true
    mocks.error = 'boom'
    const { result } = renderHook(() => useGroceries())
    expect(result.current.items).toHaveLength(2)
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe('boom')
  })

  describe('delete / undo', () => {
    beforeEach(() => vi.useFakeTimers())

    it('handleDelete hides the item immediately without calling deleteGrocery yet', () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))

      expect(result.current.items.map((i) => i.id)).toEqual(['item-2'])
      expect(result.current.pendingDeletes).toEqual([{ id: 'item-1', name: 'Milk (2L)' }])
      expect(mocks.deleteGrocery).not.toHaveBeenCalled()
    })

    it('undoDelete restores the item with no network call at all', () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))
      act(() => result.current.undoDelete('item-1'))

      expect(result.current.items.map((i) => i.id)).toEqual(['item-1', 'item-2'])
      expect(result.current.pendingDeletes).toEqual([])
      act(() => vi.runAllTimers())
      expect(mocks.deleteGrocery).not.toHaveBeenCalled()
    })

    it('the real delete only fires once the undo window actually elapses', async () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))
      expect(mocks.deleteGrocery).not.toHaveBeenCalled()

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mocks.deleteGrocery).toHaveBeenCalledWith('item-1')
      expect(result.current.pendingDeletes).toEqual([])
    })

    it('dismissDelete finalizes (and persists) the delete immediately, without waiting out the window', async () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))

      await act(async () => {
        result.current.dismissDelete('item-1')
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mocks.deleteGrocery).toHaveBeenCalledWith('item-1')
      expect(result.current.pendingDeletes).toEqual([])
    })

    it('a duplicate/late undo click after the delete already finalized is a no-op', async () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Nothing should happen — no crash, no second restore, no second delete call.
      act(() => result.current.undoDelete('item-1'))
      expect(mocks.deleteGrocery).toHaveBeenCalledTimes(1)
      expect(result.current.items.map((i) => i.id)).toEqual(['item-2'])
    })

    it('a rapid second delete click on the same item while already pending is ignored', () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))
      act(() => result.current.handleDelete('item-1'))
      expect(result.current.pendingDeletes).toHaveLength(1)
    })

    it('a failed finalize surfaces deleteError, and the item is still visible (it was never really deleted)', async () => {
      mocks.deleteGrocery.mockResolvedValue({ error: 'RLS denied it' })
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.handleDelete('item-1'))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.deleteError).toEqual({ id: 'item-1', message: 'RLS denied it' })
      expect(result.current.items.map((i) => i.id)).toEqual(['item-1', 'item-2'])
    })
  })

  describe('handleSubmit', () => {
    it('add path delegates to addGrocery, sets lastAddedId, and closes the panel on success', async () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.openAdd())

      await act(async () => {
        await result.current.handleSubmit({
          name: 'Snacks',
          price: '500',
          quantity: 1,
          category: 'pantry',
          paidByMemberId: 'member-1',
          sharedByMemberIds: ['member-1'],
          notes: '',
        })
      })

      expect(mocks.addGrocery).toHaveBeenCalled()
      expect(result.current.lastAddedId).toBe('item-new')
      expect(result.current.panelOpen).toBe(false)
    })

    it('add path keeps the panel open and surfaces the error on failure', async () => {
      mocks.addGrocery.mockResolvedValue({ error: 'Enter a valid price.' })
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.openAdd())

      let submitResult
      await act(async () => {
        submitResult = await result.current.handleSubmit({
          name: 'Snacks',
          price: 'nope',
          quantity: 1,
          category: 'pantry',
          paidByMemberId: 'member-1',
          sharedByMemberIds: ['member-1'],
          notes: '',
        })
      })

      expect(submitResult).toEqual({ error: 'Enter a valid price.' })
      expect(result.current.panelOpen).toBe(true)
    })

    it('edit path delegates to editGrocery for the item being edited, and closes on success', async () => {
      const { result } = renderHook(() => useGroceries())
      act(() => result.current.openEdit('item-2'))

      await act(async () => {
        await result.current.handleSubmit({
          name: 'Rice (updated)',
          price: '950',
          quantity: 1,
          category: 'pantry',
          paidByMemberId: 'member-1',
          sharedByMemberIds: ['member-1'],
          notes: '',
        })
      })

      expect(mocks.editGrocery).toHaveBeenCalledWith('item-2', expect.objectContaining({ name: 'Rice (updated)' }))
      expect(result.current.panelOpen).toBe(false)
    })
  })

  describe('addGenerated', () => {
    it('adds every item sequentially through the same addGrocery path, tracking the first added id', async () => {
      const { result } = renderHook(() => useGroceries())
      mocks.addGrocery
        .mockResolvedValueOnce({ id: 'gen-1' })
        .mockResolvedValueOnce({ id: 'gen-2' })

      let addResult
      await act(async () => {
        addResult = await result.current.addGenerated([
          { ...MILK, id: 'draft-1' },
          { ...RICE, id: 'draft-2' },
        ])
      })

      expect(mocks.addGrocery).toHaveBeenCalledTimes(2)
      expect(addResult).toEqual({ error: undefined, addedCount: 2 })
      expect(result.current.lastAddedId).toBe('gen-1')
    })

    it('reports the first failure but still attempts the remaining items', async () => {
      const { result } = renderHook(() => useGroceries())
      mocks.addGrocery
        .mockResolvedValueOnce({ error: 'Choose who paid for this item.' })
        .mockResolvedValueOnce({ id: 'gen-2' })

      let addResult
      await act(async () => {
        addResult = await result.current.addGenerated([
          { ...MILK, id: 'draft-1' },
          { ...RICE, id: 'draft-2' },
        ])
      })

      expect(mocks.addGrocery).toHaveBeenCalledTimes(2)
      expect(addResult).toEqual({ error: 'Choose who paid for this item.', addedCount: 1 })
      expect(result.current.lastAddedId).toBe('gen-2')
    })
  })
})

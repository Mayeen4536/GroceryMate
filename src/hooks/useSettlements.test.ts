import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSettlements } from './useSettlements'
import type { Settlement } from '@/types/settlement'

describe('useSettlements', () => {
  it('starts with an empty timeline — no fabricated payment history', () => {
    const { result } = renderHook(() => useSettlements([]))
    expect(result.current.timeline).toEqual([])
  })

  it('is settled up when there are no real transfers', () => {
    const { result } = renderHook(() => useSettlements([]))
    expect(result.current.allSettled).toBe(true)
    expect(result.current.pending).toEqual([])
  })

  it('is not settled while a real, undismissed transfer remains', () => {
    const transfers: Settlement[] = [{ id: 's-1', from: 'Alice', to: 'Bob', amount: '100' }]
    const { result } = renderHook(() => useSettlements(transfers))
    expect(result.current.allSettled).toBe(false)
    expect(result.current.pending).toHaveLength(1)
  })

  it('marking a transfer paid adds one real timeline entry describing that exact transfer', () => {
    const transfers: Settlement[] = [{ id: 's-1', from: 'Alice', to: 'Bob', amount: '100' }]
    const { result } = renderHook(() => useSettlements(transfers))

    act(() => result.current.markPaid('s-1'))

    expect(result.current.timeline).toHaveLength(1)
    expect(result.current.timeline[0].title).toContain('Alice')
    expect(result.current.timeline[0].title).toContain('Bob')
    expect(result.current.pending).toEqual([])
  })
})

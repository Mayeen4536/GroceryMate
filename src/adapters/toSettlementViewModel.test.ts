import { describe, expect, it } from 'vitest'
import { CURRENCIES } from '@/domain/Currency'
import type { MemberId } from '@/domain/ids'
import type { SettlementResult } from '@/engine'
import type { Member as UIMember } from '@/types/member'
import { toSettlementViewModel } from './toSettlementViewModel'

const BDT = CURRENCIES.BDT

function makeUIMember(id: string, name: string, status: UIMember['status'] = 'settled'): UIMember {
  return {
    id,
    name,
    email: `${id}@example.com`,
    tone: 0,
    role: 'member',
    status,
    amountPaid: '0',
    itemsAdded: 0,
    joinedLabel: 'Joined Jan 2026',
    order: 1,
  }
}

describe('toSettlementViewModel', () => {
  it('resolves member ids back to display names in transfers', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan'), makeUIMember('m-2', 'Bilal Ahmed')]
    const result: SettlementResult = {
      currency: BDT,
      memberBalances: [
        { memberId: 'm-1' as MemberId, spentMinorUnits: 30000, consumedMinorUnits: 0, netBalanceMinorUnits: 30000 },
        { memberId: 'm-2' as MemberId, spentMinorUnits: 0, consumedMinorUnits: 30000, netBalanceMinorUnits: -30000 },
      ],
      transfers: [{ from: 'm-2' as MemberId, to: 'm-1' as MemberId, amountMinorUnits: 30000 }],
    }

    const viewModel = toSettlementViewModel(result, members)

    expect(viewModel.transfers).toEqual([
      { id: 'm-2::m-1::30000', from: 'Bilal Ahmed', to: 'Aisha Khan', amount: '300' },
    ])
  })

  it('converts minor units to a major-unit numeric string, matching the manually-verifiable scenario', () => {
    // The Rice/Chicken scenario from the product spec: C owes A ৳300.
    const members = [makeUIMember('a', 'A'), makeUIMember('b', 'B'), makeUIMember('c', 'C')]
    const result: SettlementResult = {
      currency: BDT,
      memberBalances: [
        { memberId: 'a' as MemberId, spentMinorUnits: 90000, consumedMinorUnits: 60000, netBalanceMinorUnits: 30000 },
        { memberId: 'b' as MemberId, spentMinorUnits: 60000, consumedMinorUnits: 60000, netBalanceMinorUnits: 0 },
        { memberId: 'c' as MemberId, spentMinorUnits: 0, consumedMinorUnits: 30000, netBalanceMinorUnits: -30000 },
      ],
      transfers: [{ from: 'c' as MemberId, to: 'a' as MemberId, amountMinorUnits: 30000 }],
    }

    const viewModel = toSettlementViewModel(result, members)

    expect(viewModel.summary.outstanding).toBe('300')
    expect(viewModel.summary.receivers).toEqual([{ name: 'A', amount: '300' }])
    expect(viewModel.summary.owers).toEqual([{ name: 'C', amount: '300' }])
    expect(viewModel.transfers).toEqual([{ id: 'c::a::30000', from: 'C', to: 'A', amount: '300' }])

    const financialsOf = (id: string) => viewModel.memberFinancials.find((m) => m.memberId === id)!
    expect(financialsOf('a')).toMatchObject({ amountPaid: '900', amountConsumed: '600', netBalance: '300', status: 'owed' })
    expect(financialsOf('b')).toMatchObject({ amountPaid: '600', amountConsumed: '600', netBalance: '0', status: 'settled' })
    expect(financialsOf('c')).toMatchObject({ amountPaid: '0', amountConsumed: '300', netBalance: '-300', status: 'owes' })
  })

  it('keeps an invited member\'s status as "invited" even though their balance is zero', () => {
    const members = [makeUIMember('m-1', 'Fatima Noor', 'invited')]
    const result: SettlementResult = {
      currency: BDT,
      memberBalances: [
        { memberId: 'm-1' as MemberId, spentMinorUnits: 0, consumedMinorUnits: 0, netBalanceMinorUnits: 0 },
      ],
      transfers: [],
    }

    const viewModel = toSettlementViewModel(result, members)
    expect(viewModel.memberFinancials[0].status).toBe('invited')
  })

  it('produces empty summary/transfers for a fully settled household', () => {
    const members = [makeUIMember('m-1', 'Aisha Khan')]
    const result: SettlementResult = {
      currency: BDT,
      memberBalances: [
        { memberId: 'm-1' as MemberId, spentMinorUnits: 5000, consumedMinorUnits: 5000, netBalanceMinorUnits: 0 },
      ],
      transfers: [],
    }

    const viewModel = toSettlementViewModel(result, members)
    expect(viewModel.summary.outstanding).toBe('0')
    expect(viewModel.summary.receivers).toEqual([])
    expect(viewModel.summary.owers).toEqual([])
    expect(viewModel.transfers).toEqual([])
  })
})

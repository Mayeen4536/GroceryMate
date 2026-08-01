import { describe, expect, it } from 'vitest'
import type { MemberId } from '@/domain/ids'
import { minimizeTransactions } from './minimizeTransactions'
import { UnbalancedInputError } from './errors'
import type { MemberSettlementSummary } from './types'
import { summarizeTransfers } from './testHelpers'

function summary(memberId: string, netBalanceMinorUnits: number): MemberSettlementSummary {
  return {
    memberId: memberId as MemberId,
    // spent/consumed aren't used by minimizeTransactions; only the net balance is.
    spentMinorUnits: Math.max(netBalanceMinorUnits, 0),
    consumedMinorUnits: Math.max(-netBalanceMinorUnits, 0),
    netBalanceMinorUnits,
  }
}

/** Every debtor's outflow must equal their debt, and every creditor's inflow their credit. */
function expectTransfersToFullySettle(balances: readonly MemberSettlementSummary[], transfers: ReturnType<typeof minimizeTransactions>) {
  const net = summarizeTransfers(transfers)
  for (const balance of balances) {
    expect(net.get(balance.memberId) ?? 0).toBe(balance.netBalanceMinorUnits)
  }
  for (const transfer of transfers) {
    expect(transfer.amountMinorUnits).toBeGreaterThan(0)
    expect(Number.isInteger(transfer.amountMinorUnits)).toBe(true)
  }
}

describe('minimizeTransactions', () => {
  it('needs no transfers when everyone is already at zero', () => {
    const balances = [summary('a', 0), summary('b', 0)]
    expect(minimizeTransactions(balances)).toEqual([])
  })

  it('settles a simple two-person debt in one transfer', () => {
    const balances = [summary('a', -100), summary('b', 100)]
    const transfers = minimizeTransactions(balances)
    expect(transfers).toEqual([{ from: 'a', to: 'b', amountMinorUnits: 100 }])
  })

  it('settles two debtors owing one creditor in exactly two transfers', () => {
    const balances = [summary('a', -300), summary('b', -300), summary('c', 600)]
    const transfers = minimizeTransactions(balances)
    expect(transfers).toHaveLength(2)
    expectTransfersToFullySettle(balances, transfers)
  })

  it('settles one debtor owing two creditors in exactly two transfers', () => {
    const balances = [summary('a', -600), summary('b', 300), summary('c', 300)]
    const transfers = minimizeTransactions(balances)
    expect(transfers).toHaveLength(2)
    expectTransfersToFullySettle(balances, transfers)
  })

  it('finds the true minimum for a case where naive pairing could overshoot', () => {
    // a owes 400, b owes 200, c is owed 300, d is owed 300.
    // 4 non-zero balances: the true minimum is 2 transfers (a->c:300+... no single pairing
    // clears everyone in 2, so verify against the achievable lower bound instead).
    const balances = [summary('a', -400), summary('b', -200), summary('c', 300), summary('d', 300)]
    const transfers = minimizeTransactions(balances)
    expectTransfersToFullySettle(balances, transfers)
    // 4 non-zero balances can never need more than 3 transfers.
    expect(transfers.length).toBeLessThanOrEqual(3)
  })

  it('never produces more transfers than one fewer than the number of non-zero balances', () => {
    const balances = [
      summary('a', -50),
      summary('b', -75),
      summary('c', -125),
      summary('d', 100),
      summary('e', 150),
    ]
    const transfers = minimizeTransactions(balances)
    const nonZeroCount = balances.filter((b) => b.netBalanceMinorUnits !== 0).length
    expect(transfers.length).toBeLessThanOrEqual(nonZeroCount - 1)
    expectTransfersToFullySettle(balances, transfers)
  })

  it('ignores members who are already settled', () => {
    const balances = [summary('a', -100), summary('b', 0), summary('c', 100), summary('d', 0)]
    const transfers = minimizeTransactions(balances)
    expect(transfers).toEqual([{ from: 'a', to: 'c', amountMinorUnits: 100 }])
  })

  it('is deterministic no matter what order members are listed in', () => {
    const balancesA = [summary('a', -100), summary('b', -50), summary('c', 150)]
    const balancesB = [summary('c', 150), summary('a', -100), summary('b', -50)]
    expect(minimizeTransactions(balancesA)).toEqual(minimizeTransactions(balancesB))
  })

  it('throws if the balances passed in do not sum to zero', () => {
    const balances = [summary('a', -100), summary('b', 50)]
    expect(() => minimizeTransactions(balances)).toThrow(UnbalancedInputError)
  })

  it('settles a large household correctly and stays within the transaction bound', () => {
    // 40 members with a rotating pattern of balances that nets to zero overall.
    const memberCount = 40
    const balances: MemberSettlementSummary[] = []
    let runningTotal = 0
    for (let i = 0; i < memberCount - 1; i += 1) {
      // A mix of positive and negative, deliberately not all equal magnitude.
      const amount = ((i % 7) - 3) * 137
      balances.push(summary(`member-${String(i).padStart(3, '0')}`, amount))
      runningTotal += amount
    }
    // Final member absorbs whatever is needed to make the whole household net to zero.
    balances.push(summary(`member-${String(memberCount - 1).padStart(3, '0')}`, -runningTotal))

    const transfers = minimizeTransactions(balances)
    const nonZeroCount = balances.filter((b) => b.netBalanceMinorUnits !== 0).length

    expectTransfersToFullySettle(balances, transfers)
    expect(transfers.length).toBeLessThanOrEqual(Math.max(nonZeroCount - 1, 0))
  })
})

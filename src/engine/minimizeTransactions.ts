import type { MemberId } from '@/domain/ids'
import { UnbalancedInputError } from './errors'
import type { DebtTransfer, MemberSettlementSummary } from './types'

/**
 * Above this many members with a non-zero balance, finding the true
 * minimum by exhaustive search becomes too slow (the search is
 * factorial-ish in the number of non-zero balances). Below it, we can
 * afford to search exhaustively and guarantee the true minimum; above it,
 * we fall back to a fast greedy heuristic that's usually still minimal in
 * practice and is provably never worse than one transaction per member.
 */
const EXACT_SOLVER_MEMBER_LIMIT = 8

interface WorkingBalance {
  readonly id: MemberId
  amount: number
}

function compareIds(a: MemberId, b: MemberId): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Turns a set of net balances into the smallest possible set of payments
 * that brings everyone to zero. Responsibility: minimize the *number* of
 * transactions, not who "should" pay whom in any social sense — any
 * settling order is financially equivalent.
 *
 * For up to `EXACT_SOLVER_MEMBER_LIMIT` non-zero balances, this searches
 * exhaustively and returns a provably minimal set of transfers. Beyond
 * that it uses the standard greedy "largest debtor pays largest creditor"
 * approach, which always terminates in at most (non-zero balances - 1)
 * transfers — it just isn't guaranteed to find the mathematical minimum
 * in every possible input for very large households.
 *
 * Deterministic: ties are always broken by sorting on member id, so the
 * same balances produce the same transfers no matter what order the
 * members were originally listed in.
 */
export function minimizeTransactions(
  memberBalances: readonly MemberSettlementSummary[],
): readonly DebtTransfer[] {
  const total = memberBalances.reduce((sum, m) => sum + m.netBalanceMinorUnits, 0)
  if (total !== 0) throw new UnbalancedInputError(total)

  const nonZero: WorkingBalance[] = memberBalances
    .filter((m) => m.netBalanceMinorUnits !== 0)
    .map((m) => ({ id: m.memberId, amount: m.netBalanceMinorUnits }))
    .sort((a, b) => compareIds(a.id, b.id))

  if (nonZero.length === 0) return []

  return nonZero.length <= EXACT_SOLVER_MEMBER_LIMIT ? solveExact(nonZero) : solveGreedy(nonZero)
}

/** Greedy: repeatedly match the largest debtor with the largest creditor. */
function solveGreedy(balances: readonly WorkingBalance[]): DebtTransfer[] {
  const debtors = balances
    .filter((b) => b.amount < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.amount - b.amount || compareIds(a.id, b.id))
  const creditors = balances
    .filter((b) => b.amount > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount || compareIds(a.id, b.id))

  const transfers: DebtTransfer[] = []
  let debtorIndex = 0
  let creditorIndex = 0
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(-debtor.amount, creditor.amount)

    transfers.push({ from: debtor.id, to: creditor.id, amountMinorUnits: amount })
    debtor.amount += amount
    creditor.amount -= amount

    if (debtor.amount === 0) debtorIndex += 1
    if (creditor.amount === 0) creditorIndex += 1
  }
  return transfers
}

/**
 * Exhaustive search: fix the first still-unsettled balance and try
 * settling it against every opposite-sign balance in turn, recursing on
 * what's left each time and keeping whichever choice yields the fewest
 * total transfers. Each step fully zeroes out at least one balance, so
 * this always terminates and — because every possible pairing is tried —
 * it's guaranteed to find a transfer count no algorithm could beat.
 */
function solveExact(balances: readonly WorkingBalance[]): DebtTransfer[] {
  const working = balances.map((b) => ({ ...b }))
  const result = dfs(working)
  if (result === null) {
    // Can't happen when the zero-sum check above has already passed, since
    // a non-empty set of balances summing to zero always has at least one
    // debtor and one creditor left to pair against each other.
    throw new UnbalancedInputError(working.reduce((sum, b) => sum + b.amount, 0))
  }
  return result
}

function dfs(balances: WorkingBalance[]): DebtTransfer[] | null {
  const i = balances.findIndex((b) => b.amount !== 0)
  if (i === -1) return []

  let best: DebtTransfer[] | null = null
  const first = balances[i]

  for (let j = 0; j < balances.length; j += 1) {
    if (j === i) continue
    const other = balances[j]
    if (other.amount === 0) continue
    const sameSign = (first.amount < 0) === (other.amount < 0)
    if (sameSign) continue // can only settle a debt against a credit, not two of the same

    const debtor = first.amount < 0 ? first : other
    const creditor = first.amount < 0 ? other : first
    const originalDebtorAmount = debtor.amount
    const originalCreditorAmount = creditor.amount

    // Whichever side has the smaller magnitude is the one fully settled by
    // this transfer; the other carries the leftover into the recursion.
    const settleAmount = Math.min(-originalDebtorAmount, originalCreditorAmount)
    const transfer: DebtTransfer = { from: debtor.id, to: creditor.id, amountMinorUnits: settleAmount }

    debtor.amount += settleAmount
    creditor.amount -= settleAmount

    const rest = dfs(balances)

    debtor.amount = originalDebtorAmount
    creditor.amount = originalCreditorAmount

    if (rest !== null) {
      const candidate = [transfer, ...rest]
      if (best === null || candidate.length < best.length) best = candidate
    }
  }

  return best
}

import type { Currency } from '@/domain/Currency'
import type { GroceryItem } from '@/domain/GroceryItem'
import type { Member } from '@/domain/Member'
import { calculateMemberBalances } from './calculateMemberBalances'
import { minimizeTransactions } from './minimizeTransactions'
import type { SettlementResult } from './types'

/**
 * Runs the full settlement calculation for a household: how much each
 * member spent and consumed, their net balance, and the minimum set of
 * payments needed to bring everyone to zero.
 *
 * A pure function: the same members and groceries always produce the same
 * result, with no I/O, no randomness, no dates read from the system clock,
 * and no dependency on React or any other framework.
 */
export function computeSettlement(
  members: readonly Member[],
  groceries: readonly GroceryItem[],
  currency: Currency,
): SettlementResult {
  const memberBalances = calculateMemberBalances(members, groceries, currency)
  const transfers = minimizeTransactions(memberBalances)
  return { currency, memberBalances, transfers }
}

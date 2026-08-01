import { CURRENCIES } from '@/domain/Currency'
import type { Currency } from '@/domain/Currency'
import type { GroceryCategory, GroceryItem } from '@/domain/GroceryItem'
import type { Member } from '@/domain/Member'
import type { Money } from '@/domain/Money'
import type { GroceryItemId, HouseholdId, MemberId } from '@/domain/ids'

/** Fixture factories shared by the engine's test suites. Not itself a test file. */

export const TEST_HOUSEHOLD_ID = 'household-1' as HouseholdId
export const TEST_CURRENCY: Currency = CURRENCIES.BDT
export const TEST_ADDED_AT = new Date('2026-01-01T00:00:00.000Z')

export function money(minorUnits: number, currency: Currency = TEST_CURRENCY): Money {
  return { minorUnits, currency }
}

export function makeMember(id: string, name: string = id): Member {
  return {
    id: id as MemberId,
    householdId: TEST_HOUSEHOLD_ID,
    name,
    email: `${id}@example.com`,
    role: 'member',
    membershipStatus: 'active',
    joinedAt: TEST_ADDED_AT,
  }
}

export interface GroceryItemFixture {
  readonly id: string
  readonly paidBy: string
  readonly sharedBy: readonly string[]
  readonly unitPriceMinorUnits: number
  readonly quantity?: number
  readonly name?: string
  readonly category?: GroceryCategory
  readonly currency?: Currency
}

export function makeGroceryItem(fixture: GroceryItemFixture): GroceryItem {
  return {
    id: fixture.id as GroceryItemId,
    householdId: TEST_HOUSEHOLD_ID,
    name: fixture.name ?? 'Test item',
    category: fixture.category ?? 'pantry',
    unitPrice: money(fixture.unitPriceMinorUnits, fixture.currency),
    quantity: fixture.quantity ?? 1,
    paidByMemberId: fixture.paidBy as MemberId,
    sharedByMemberIds: fixture.sharedBy.map((id) => id as MemberId),
    addedAt: TEST_ADDED_AT,
  }
}

/** Sums every transfer a member sends and receives, for verifying a settlement plan. */
export function summarizeTransfers(
  transfers: ReadonlyArray<{ readonly from: MemberId; readonly to: MemberId; readonly amountMinorUnits: number }>,
): ReadonlyMap<MemberId, number> {
  const net = new Map<MemberId, number>()
  for (const transfer of transfers) {
    net.set(transfer.from, (net.get(transfer.from) ?? 0) - transfer.amountMinorUnits)
    net.set(transfer.to, (net.get(transfer.to) ?? 0) + transfer.amountMinorUnits)
  }
  return net
}

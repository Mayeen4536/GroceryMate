import type { Money } from './Money'
import type { GroceryItemId, HouseholdId, MemberId } from './ids'

export type GroceryCategory = 'produce' | 'dairy' | 'bakery' | 'pantry' | 'beverages' | 'household'

/**
 * A single grocery purchase logged by a household. Responsibility: what
 * was bought, its price and quantity, who paid, and who shares the cost.
 * It does not know about settlements — whether it's been paid back is
 * derived elsewhere from Settlement and Payment records, not stored here.
 */
export interface GroceryItem {
  readonly id: GroceryItemId
  readonly householdId: HouseholdId
  readonly name: string
  readonly category: GroceryCategory
  readonly unitPrice: Money
  readonly quantity: number
  readonly paidByMemberId: MemberId
  readonly sharedByMemberIds: readonly MemberId[]
  readonly addedAt: Date
  /** Not every item has a note, so this stays genuinely optional. */
  readonly notes?: string
}

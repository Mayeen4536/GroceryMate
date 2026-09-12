import { formatMinorUnitsInput } from '@/adapters'
import type { CategoryId, GroceryItem } from '@/types/grocery'

/** Raw shape returned by `select id, household_id, name, category, amount_minor, quantity, paid_by_member_id, created_by_member_id, notes, created_at, updated_at from grocery_items`. */
export interface GroceryItemRow {
  id: string
  household_id: string
  name: string
  category: string
  amount_minor: number
  quantity: number
  paid_by_member_id: string
  created_by_member_id: string
  notes: string | null
  created_at: string
  updated_at: string
}

/** Raw shape returned by `select grocery_item_id, household_member_id from grocery_item_consumers`. */
export interface GroceryConsumerRow {
  grocery_item_id: string
  household_member_id: string
}

/**
 * Maps one persisted `grocery_items` row plus its already-grouped consumer
 * ids into the app's UI-facing `GroceryItem`. `amount_minor` round-trips
 * through `formatMinorUnitsInput` into the same decimal-string shape every
 * existing display/form component already expects — the integer never
 * reaches a component directly, and no component re-derives it from a
 * float. `consumerIds` order is whatever the caller grouped them in
 * (insertion order from the query); nothing here re-sorts or dedupes them —
 * the composite primary key on `grocery_item_consumers` already guarantees
 * no duplicate.
 */
export function mapGroceryItemRow(row: GroceryItemRow, consumerIds: readonly string[]): GroceryItem {
  return {
    id: row.id,
    name: row.name,
    price: formatMinorUnitsInput(row.amount_minor),
    quantity: row.quantity,
    category: row.category as CategoryId,
    paidByMemberId: row.paid_by_member_id,
    sharedByMemberIds: [...consumerIds],
    createdByMemberId: row.created_by_member_id,
    notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

/** Groups a flat list of consumer rows by their grocery item, for O(1) lookup while mapping each `GroceryItemRow`. */
export function groupConsumersByGroceryItem(rows: readonly GroceryConsumerRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    const existing = grouped.get(row.grocery_item_id)
    if (existing) existing.push(row.household_member_id)
    else grouped.set(row.grocery_item_id, [row.household_member_id])
  }
  return grouped
}

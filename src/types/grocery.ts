import type { LucideIcon } from 'lucide-react'

/**
 * App-facing grocery model — real, persisted `grocery_items` identity
 * (`paidByMemberId`/`sharedByMemberIds`/`createdByMemberId` are stable
 * `household_members.id` values, never display names; see
 * docs/GROCERY_INTEGRATION.md). `price` stays a decimal string, matching
 * every existing display component's contract unchanged — the real
 * integer `amount_minor` conversion happens only at the persistence
 * boundary (`src/groceries/useHouseholdGroceries.ts`), never in this type
 * or in any UI component. No math happens in the UI layer.
 */
export type CategoryId = 'produce' | 'dairy' | 'bakery' | 'pantry' | 'beverages' | 'household'

export interface GroceryItem {
  id: string
  name: string
  price: string
  quantity: number
  category: CategoryId
  paidByMemberId: string
  sharedByMemberIds: string[]
  /** Who logged this entry — independent of who paid. Drives creator-or-owner edit/delete permission in the UI (RLS is the real authority). */
  createdByMemberId: string
  notes: string
  /** ISO timestamp — `grocery_items.created_at`. The real basis for chronological history (see docs/HISTORY_INTEGRATION.md); never a display-formatted string. */
  createdAt: string
}

export interface CategoryConfig {
  id: CategoryId
  label: string
  icon: LucideIcon
  /** Gradient gem tile classes for cards. */
  tile: string
  /** Selected chip classes for the category picker. */
  chip: string
}

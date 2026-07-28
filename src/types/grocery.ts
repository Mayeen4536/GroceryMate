import type { LucideIcon } from 'lucide-react'

/**
 * Display-only grocery model. Price stays a string on purpose: no math
 * happens in the UI layer; calculations arrive with the business logic.
 */
export type CategoryId = 'produce' | 'dairy' | 'bakery' | 'pantry' | 'beverages' | 'household'

export interface GroceryItem {
  id: string
  name: string
  price: string
  quantity: number
  category: CategoryId
  paidBy: string
  sharedBy: string[]
  notes: string
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

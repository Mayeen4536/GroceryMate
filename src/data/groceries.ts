import {
  Carrot,
  Croissant,
  CupSoda,
  House,
  Milk,
  Package,
  type LucideIcon,
} from 'lucide-react'

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

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'produce',
    label: 'Produce',
    icon: Carrot,
    tile: 'from-brand-100 to-mint-100 text-brand-700',
    chip: 'bg-mint-100 text-brand-800',
  },
  {
    id: 'dairy',
    label: 'Dairy',
    icon: Milk,
    tile: 'from-member-sky-soft to-mint-50 text-member-sky-strong',
    chip: 'bg-member-sky-soft text-member-sky-strong',
  },
  {
    id: 'bakery',
    label: 'Bakery',
    icon: Croissant,
    tile: 'from-member-gold-soft to-warning-50 text-member-gold-strong',
    chip: 'bg-member-gold-soft text-member-gold-strong',
  },
  {
    id: 'pantry',
    label: 'Pantry',
    icon: Package,
    tile: 'from-member-violet-soft to-member-sky-soft text-member-violet-strong',
    chip: 'bg-member-violet-soft text-member-violet-strong',
  },
  {
    id: 'beverages',
    label: 'Beverages',
    icon: CupSoda,
    tile: 'from-member-teal-soft to-mint-50 text-member-teal-strong',
    chip: 'bg-member-teal-soft text-member-teal-strong',
  },
  {
    id: 'household',
    label: 'Household',
    icon: House,
    tile: 'from-member-rose-soft to-member-coral-soft text-member-rose-strong',
    chip: 'bg-member-rose-soft text-member-rose-strong',
  },
]

export function categoryById(id: CategoryId): CategoryConfig {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[0]
}

/** Mock data for visual display only. */
export const initialGroceries: GroceryItem[] = [
  {
    id: 'g-1',
    name: 'Milk (2L)',
    price: '240',
    quantity: 2,
    category: 'dairy',
    paidBy: 'Aisha Khan',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-2',
    name: 'Basmati rice (5kg)',
    price: '1450',
    quantity: 1,
    category: 'pantry',
    paidBy: 'Bilal Ahmed',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-3',
    name: 'Apples (1kg)',
    price: '180',
    quantity: 1,
    category: 'produce',
    paidBy: 'Chloe Lee',
    sharedBy: ['Aisha Khan', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-4',
    name: 'Dish soap',
    price: '220',
    quantity: 1,
    category: 'household',
    paidBy: 'Aisha Khan',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: 'Lemon one please',
  },
]

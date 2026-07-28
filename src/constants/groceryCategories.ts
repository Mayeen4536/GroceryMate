import { Carrot, Croissant, CupSoda, House, Milk, Package } from 'lucide-react'
import type { CategoryConfig } from '@/types/grocery'

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

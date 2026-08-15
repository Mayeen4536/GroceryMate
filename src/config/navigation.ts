import { BarChart3, HandCoins, History, Sparkles, ShoppingBasket, Users } from 'lucide-react'
import type { NavItem } from '@/types/navigation'

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'assistant',
    label: 'Assistant',
    icon: Sparkles,
    description: 'Describe what your household needs and let AI build the list.',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    icon: ShoppingBasket,
    description: 'Every item your household added, who paid, and who shared it.',
  },
  {
    id: 'members',
    label: 'Members',
    icon: Users,
    description: 'The people sharing this household.',
  },
  {
    id: 'settlements',
    label: 'Settlements',
    icon: HandCoins,
    description: 'Who owes whom, and the simplest way to settle up.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Where the money actually goes, month by month.',
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    description: 'Past grocery sessions, saved for reference.',
  },
]

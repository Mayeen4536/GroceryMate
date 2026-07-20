import type { LucideIcon } from 'lucide-react'
import { HandCoins, History, LayoutDashboard, Sparkles, ShoppingBasket, Users } from 'lucide-react'

export type PageId = 'overview' | 'assistant' | 'groceries' | 'members' | 'settlements' | 'history'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  /** Shown under the page title while screens are placeholders. */
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: "A snapshot of your household's groceries and what needs settling.",
  },
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
    id: 'history',
    label: 'History',
    icon: History,
    description: 'Past grocery sessions, saved for reference.',
  },
]

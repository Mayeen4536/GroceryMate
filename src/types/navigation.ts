import type { LucideIcon } from 'lucide-react'

export type PageId =
  | 'overview'
  | 'assistant'
  | 'groceries'
  | 'members'
  | 'settlements'
  | 'history'
  | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
  /** Shown under the page title while screens are placeholders. */
  description: string
}

import type { LucideIcon } from 'lucide-react'
import type { CardAccent } from '@/components/ui'

export type SuggestionKind = 'text' | 'receipt' | 'image' | 'voice'

export interface SuggestionCard {
  kind: SuggestionKind
  icon: LucideIcon
  title: string
  description: string
  accent: CardAccent
}

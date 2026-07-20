import { Camera, ClipboardPaste, Mic, NotebookPen, type LucideIcon } from 'lucide-react'
import type { CardAccent } from '../components/ui'
import type { GroceryItem } from './groceries'

/** Quick-fill chips under the prompt box. */
export const EXAMPLE_PROMPTS: string[] = [
  'Plan a week of groceries for 4 people',
  "We're almost out of breakfast basics",
  'Vegetarian dinner for 6 guests this weekend',
  'Restock the cleaning supplies',
]

export type SuggestionKind = 'text' | 'receipt' | 'image' | 'voice'

export interface SuggestionCard {
  kind: SuggestionKind
  icon: LucideIcon
  title: string
  description: string
  accent: CardAccent
}

/** The four ways to talk to the assistant, each routed to its matching input above. */
export const SUGGESTIONS: SuggestionCard[] = [
  {
    kind: 'text',
    icon: NotebookPen,
    title: 'Describe your week',
    description: 'Tell GroceryMate what the household needs in plain language.',
    accent: 'brand',
  },
  {
    kind: 'receipt',
    icon: ClipboardPaste,
    title: 'Paste a receipt',
    description: 'Paste what you just bought and let AI sort it into categories.',
    accent: 'gold',
  },
  {
    kind: 'image',
    icon: Camera,
    title: 'Snap a photo',
    description: 'Upload a photo of a receipt or your pantry shelf.',
    accent: 'sky',
  },
  {
    kind: 'voice',
    icon: Mic,
    title: 'Just say it',
    description: 'Use your voice to add groceries hands-free.',
    accent: 'violet',
  },
]

/** Canned "transcript" the voice button fills in after it stops listening. */
export const VOICE_TRANSCRIPT =
  "We're almost out of milk, eggs, and bread. Add breakfast basics for the week."

export const ATTACHMENT_DEFAULTS: Record<'receipt' | 'image', string> = {
  receipt: 'Pasted receipt',
  image: 'pantry-photo.jpg',
}

/** Mock output for the generation demo. Display-only; no math happens here. */
export const MOCK_GENERATED_ITEMS: GroceryItem[] = [
  {
    id: 'ai-1',
    name: 'Milk (2L)',
    price: '240',
    quantity: 2,
    category: 'dairy',
    paidBy: '',
    sharedBy: [],
    notes: '',
  },
  {
    id: 'ai-2',
    name: 'Eggs (dozen)',
    price: '360',
    quantity: 1,
    category: 'dairy',
    paidBy: '',
    sharedBy: [],
    notes: '',
  },
  {
    id: 'ai-3',
    name: 'Brown bread',
    price: '180',
    quantity: 2,
    category: 'bakery',
    paidBy: '',
    sharedBy: [],
    notes: '',
  },
  {
    id: 'ai-4',
    name: 'Butter',
    price: '320',
    quantity: 1,
    category: 'dairy',
    paidBy: '',
    sharedBy: [],
    notes: '',
  },
  {
    id: 'ai-5',
    name: 'Orange juice (1L)',
    price: '260',
    quantity: 1,
    category: 'beverages',
    paidBy: '',
    sharedBy: [],
    notes: '',
  },
]

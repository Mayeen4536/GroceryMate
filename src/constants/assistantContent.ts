import { Camera, ClipboardPaste, Mic, NotebookPen } from 'lucide-react'
import type { SuggestionCard } from '@/types/assistant'

/** Quick-fill chips under the prompt box. */
export const EXAMPLE_PROMPTS: string[] = [
  'Plan a week of groceries for 4 people',
  "We're almost out of breakfast basics",
  'Vegetarian dinner for 6 guests this weekend',
  'Restock the cleaning supplies',
]

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

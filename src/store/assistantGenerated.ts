import type { GroceryItem } from '@/types/grocery'

/**
 * Mock output for the generation demo. Display-only; no math happens here.
 *
 * Deliberately mixed: a real receipt/description parse sometimes states who
 * paid or who it's for and sometimes doesn't, so this includes items with
 * fully-known payer/sharers alongside ones missing one or both — the review
 * step (GeneratedGroceries) must ask about exactly the missing pieces
 * rather than assuming every item is equally uncertain.
 */
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
    paidBy: 'Aisha Khan',
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
    sharedBy: ['Aisha Khan', 'Bilal Ahmed'],
    notes: '',
  },
  {
    id: 'ai-4',
    name: 'Butter',
    price: '320',
    quantity: 1,
    category: 'dairy',
    paidBy: 'Bilal Ahmed',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
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

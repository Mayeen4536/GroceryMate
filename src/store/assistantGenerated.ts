import type { GroceryItem } from '@/types/grocery'

/**
 * Mock output for the generation demo. Display-only; no math happens here.
 *
 * Every item ships with no payer or sharers at all — this used to mix in a
 * few items with both already filled in (paidBy/sharedBy naming the old
 * fixed mock roster), but that roster has no correspondence to any real
 * household's actual members (which, for a brand-new household, is just
 * its owner). Naming a real member here would either be wrong for almost
 * every household or coincidentally right for none, so nothing is ever
 * pre-filled: the review step (GeneratedGroceries) asks about every item,
 * consistent with the same "never invent who paid or shared" principle
 * this whole review step exists to enforce.
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

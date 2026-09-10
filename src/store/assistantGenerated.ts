import type { GroceryItem } from '@/types/grocery'

/**
 * Mock output for the generation demo. Display-only; no math happens here.
 *
 * Every item ships with no payer or sharers at all — a mock "AI" has no way
 * to know a real household's actual member ids, so nothing is ever
 * pre-filled: the review step (GeneratedGroceries) asks about every item,
 * consistent with the "never invent who paid or shared" principle this
 * whole review step exists to enforce. `createdByMemberId` is set once the
 * item is actually persisted (`useGroceries.addGenerated`), never here —
 * these are drafts, not yet real rows.
 */
export const MOCK_GENERATED_ITEMS: GroceryItem[] = [
  {
    id: 'ai-1',
    name: 'Milk (2L)',
    price: '240',
    quantity: 2,
    category: 'dairy',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
  },
  {
    id: 'ai-2',
    name: 'Eggs (dozen)',
    price: '360',
    quantity: 1,
    category: 'dairy',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
  },
  {
    id: 'ai-3',
    name: 'Brown bread',
    price: '180',
    quantity: 2,
    category: 'bakery',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
  },
  {
    id: 'ai-4',
    name: 'Butter',
    price: '320',
    quantity: 1,
    category: 'dairy',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
  },
  {
    id: 'ai-5',
    name: 'Orange juice (1L)',
    price: '260',
    quantity: 1,
    category: 'beverages',
    paidByMemberId: '',
    sharedByMemberIds: [],
    createdByMemberId: '',
    notes: '',
  },
]

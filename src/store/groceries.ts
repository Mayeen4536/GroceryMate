import type { GroceryItem } from '@/types/grocery'

/**
 * Mock data for visual display only — used solely by the Settings page's
 * "export data" feature (`settingsExportService.ts`), which still exports
 * its own fixed mock snapshot regardless of the real app's state (see
 * docs/GROCERY_INTEGRATION.md's "what remains local/mock" — this export
 * feature is a separate, pre-existing limitation, not part of grocery
 * persistence). `paidByMemberId`/`sharedByMemberIds` hold plain display
 * names here, not real ids — harmless, since nothing in this mock-only path
 * ever resolves them against a real roster.
 */
export const initialGroceries: GroceryItem[] = [
  {
    id: 'g-1',
    name: 'Milk (2L)',
    price: '240',
    quantity: 2,
    category: 'dairy',
    paidByMemberId: 'Aisha Khan',
    sharedByMemberIds: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    createdByMemberId: 'Aisha Khan',
    notes: '',
  },
  {
    id: 'g-2',
    name: 'Basmati rice (5kg)',
    price: '1450',
    quantity: 1,
    category: 'pantry',
    paidByMemberId: 'Bilal Ahmed',
    sharedByMemberIds: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    createdByMemberId: 'Bilal Ahmed',
    notes: '',
  },
  {
    id: 'g-3',
    name: 'Apples (1kg)',
    price: '180',
    quantity: 1,
    category: 'produce',
    paidByMemberId: 'Chloe Lee',
    sharedByMemberIds: ['Aisha Khan', 'Chloe Lee', 'Daniyal Raza'],
    createdByMemberId: 'Chloe Lee',
    notes: '',
  },
  {
    id: 'g-4',
    name: 'Dish soap',
    price: '220',
    quantity: 1,
    category: 'household',
    paidByMemberId: 'Aisha Khan',
    sharedByMemberIds: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    createdByMemberId: 'Aisha Khan',
    notes: 'Lemon one please',
  },
]

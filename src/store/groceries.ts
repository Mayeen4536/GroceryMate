import type { GroceryItem } from '@/types/grocery'

/** Mock data for visual display only. */
export const initialGroceries: GroceryItem[] = [
  {
    id: 'g-1',
    name: 'Milk (2L)',
    price: '240',
    quantity: 2,
    category: 'dairy',
    paidBy: 'Aisha Khan',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-2',
    name: 'Basmati rice (5kg)',
    price: '1450',
    quantity: 1,
    category: 'pantry',
    paidBy: 'Bilal Ahmed',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-3',
    name: 'Apples (1kg)',
    price: '180',
    quantity: 1,
    category: 'produce',
    paidBy: 'Chloe Lee',
    sharedBy: ['Aisha Khan', 'Chloe Lee', 'Daniyal Raza'],
    notes: '',
  },
  {
    id: 'g-4',
    name: 'Dish soap',
    price: '220',
    quantity: 1,
    category: 'household',
    paidBy: 'Aisha Khan',
    sharedBy: ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza'],
    notes: 'Lemon one please',
  },
]

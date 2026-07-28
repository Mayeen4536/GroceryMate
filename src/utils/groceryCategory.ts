import { CATEGORIES } from '@/constants/groceryCategories'
import type { CategoryConfig, CategoryId } from '@/types/grocery'

export function categoryById(id: CategoryId): CategoryConfig {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[0]
}

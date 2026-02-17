import { db } from './index.ts'
import type { Category } from '@/types/models.ts'

// Fixed epoch so seeded categories never win a sync merge over user actions
const SEED_EPOCH = '2024-01-01T00:00:00.000Z'

const defaultCategories: Category[] = [
  // Top-level categories
  { id: 1, name: 'Income', parentId: null, color: '#4CAF50', icon: 'trending-up', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: 2, name: 'Housing', parentId: null, color: '#F44336', icon: 'home', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: 3, name: 'Transportation', parentId: null, color: '#FF9800', icon: 'car', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
  { id: 4, name: 'Food & Dining', parentId: null, color: '#E91E63', icon: 'utensils', isSystem: true, sortOrder: 3, updatedAt: SEED_EPOCH },
  { id: 5, name: 'Shopping', parentId: null, color: '#9C27B0', icon: 'shopping-bag', isSystem: true, sortOrder: 4, updatedAt: SEED_EPOCH },
  { id: 6, name: 'Entertainment', parentId: null, color: '#673AB7', icon: 'film', isSystem: true, sortOrder: 5, updatedAt: SEED_EPOCH },
  { id: 7, name: 'Health & Fitness', parentId: null, color: '#00BCD4', icon: 'heart', isSystem: true, sortOrder: 6, updatedAt: SEED_EPOCH },
  { id: 8, name: 'Personal Care', parentId: null, color: '#FF5722', icon: 'user', isSystem: true, sortOrder: 7, updatedAt: SEED_EPOCH },
  { id: 9, name: 'Education', parentId: null, color: '#3F51B5', icon: 'book', isSystem: true, sortOrder: 8, updatedAt: SEED_EPOCH },
  { id: 10, name: 'Bills & Utilities', parentId: null, color: '#607D8B', icon: 'zap', isSystem: true, sortOrder: 9, updatedAt: SEED_EPOCH },
  { id: 11, name: 'Insurance', parentId: null, color: '#795548', icon: 'shield', isSystem: true, sortOrder: 10, updatedAt: SEED_EPOCH },
  { id: 12, name: 'Savings & Investments', parentId: null, color: '#009688', icon: 'piggy-bank', isSystem: true, sortOrder: 11, updatedAt: SEED_EPOCH },
  { id: 13, name: 'Gifts & Donations', parentId: null, color: '#CDDC39', icon: 'gift', isSystem: true, sortOrder: 12, updatedAt: SEED_EPOCH },
  { id: 14, name: 'Travel', parentId: null, color: '#2196F3', icon: 'plane', isSystem: true, sortOrder: 13, updatedAt: SEED_EPOCH },
  { id: 15, name: 'Transfers', parentId: null, color: '#9E9E9E', icon: 'repeat', isSystem: true, sortOrder: 14, updatedAt: SEED_EPOCH },

  // Income subcategories
  { id: 17, name: 'Salary', parentId: 1, color: '#66BB6A', icon: 'briefcase', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: 18, name: 'Freelance', parentId: 1, color: '#81C784', icon: 'code', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: 19, name: 'Interest', parentId: 1, color: '#A5D6A7', icon: 'percent', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
  { id: 20, name: 'Other Income', parentId: 1, color: '#C8E6C9', icon: 'plus', isSystem: true, sortOrder: 3, updatedAt: SEED_EPOCH },

  // Housing subcategories
  { id: 21, name: 'Rent / Mortgage', parentId: 2, color: '#EF5350', icon: 'key', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: 22, name: 'Home Maintenance', parentId: 2, color: '#E57373', icon: 'tool', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },

  // Food & Dining subcategories
  { id: 23, name: 'Groceries', parentId: 4, color: '#EC407A', icon: 'shopping-cart', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: 24, name: 'Restaurants', parentId: 4, color: '#F06292', icon: 'coffee', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },

  // Bills & Utilities subcategories
  { id: 25, name: 'Electricity', parentId: 10, color: '#78909C', icon: 'zap', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: 26, name: 'Internet & Phone', parentId: 10, color: '#90A4AE', icon: 'wifi', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: 27, name: 'Subscriptions', parentId: 10, color: '#B0BEC5', icon: 'tv', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
]

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return
  await db.categories.bulkAdd(defaultCategories)
}

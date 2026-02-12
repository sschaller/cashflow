import { db } from './index.ts'
import type { Category } from '@/types/models.ts'

const defaultCategories: Omit<Category, 'id'>[] = [
  // Top-level income
  { name: 'Income', parentId: null, color: '#4CAF50', icon: 'trending-up', isSystem: true, sortOrder: 0 },

  // Top-level expense categories
  { name: 'Housing', parentId: null, color: '#F44336', icon: 'home', isSystem: true, sortOrder: 1 },
  { name: 'Transportation', parentId: null, color: '#FF9800', icon: 'car', isSystem: true, sortOrder: 2 },
  { name: 'Food & Dining', parentId: null, color: '#E91E63', icon: 'utensils', isSystem: true, sortOrder: 3 },
  { name: 'Shopping', parentId: null, color: '#9C27B0', icon: 'shopping-bag', isSystem: true, sortOrder: 4 },
  { name: 'Entertainment', parentId: null, color: '#673AB7', icon: 'film', isSystem: true, sortOrder: 5 },
  { name: 'Health & Fitness', parentId: null, color: '#00BCD4', icon: 'heart', isSystem: true, sortOrder: 6 },
  { name: 'Personal Care', parentId: null, color: '#FF5722', icon: 'user', isSystem: true, sortOrder: 7 },
  { name: 'Education', parentId: null, color: '#3F51B5', icon: 'book', isSystem: true, sortOrder: 8 },
  { name: 'Bills & Utilities', parentId: null, color: '#607D8B', icon: 'zap', isSystem: true, sortOrder: 9 },
  { name: 'Insurance', parentId: null, color: '#795548', icon: 'shield', isSystem: true, sortOrder: 10 },
  { name: 'Savings & Investments', parentId: null, color: '#009688', icon: 'piggy-bank', isSystem: true, sortOrder: 11 },
  { name: 'Gifts & Donations', parentId: null, color: '#CDDC39', icon: 'gift', isSystem: true, sortOrder: 12 },
  { name: 'Travel', parentId: null, color: '#2196F3', icon: 'plane', isSystem: true, sortOrder: 13 },
  { name: 'Transfers', parentId: null, color: '#9E9E9E', icon: 'repeat', isSystem: true, sortOrder: 14 },
  { name: 'Uncategorized', parentId: null, color: '#BDBDBD', icon: 'help-circle', isSystem: true, sortOrder: 99 },
]

// Subcategories mapped by parent name
const subcategories: Record<string, Omit<Category, 'id' | 'parentId'>[]> = {
  Income: [
    { name: 'Salary', color: '#66BB6A', icon: 'briefcase', isSystem: true, sortOrder: 0 },
    { name: 'Freelance', color: '#81C784', icon: 'code', isSystem: true, sortOrder: 1 },
    { name: 'Interest', color: '#A5D6A7', icon: 'percent', isSystem: true, sortOrder: 2 },
    { name: 'Other Income', color: '#C8E6C9', icon: 'plus', isSystem: true, sortOrder: 3 },
  ],
  Housing: [
    { name: 'Rent / Mortgage', color: '#EF5350', icon: 'key', isSystem: true, sortOrder: 0 },
    { name: 'Home Maintenance', color: '#E57373', icon: 'tool', isSystem: true, sortOrder: 1 },
  ],
  'Food & Dining': [
    { name: 'Groceries', color: '#EC407A', icon: 'shopping-cart', isSystem: true, sortOrder: 0 },
    { name: 'Restaurants', color: '#F06292', icon: 'coffee', isSystem: true, sortOrder: 1 },
  ],
  'Bills & Utilities': [
    { name: 'Electricity', color: '#78909C', icon: 'zap', isSystem: true, sortOrder: 0 },
    { name: 'Internet & Phone', color: '#90A4AE', icon: 'wifi', isSystem: true, sortOrder: 1 },
    { name: 'Subscriptions', color: '#B0BEC5', icon: 'tv', isSystem: true, sortOrder: 2 },
  ],
}

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return

  // Insert top-level categories
  const parentIds = await db.categories.bulkAdd(defaultCategories, { allKeys: true })

  // Build name→id map
  const nameToId = new Map<string, number>()
  defaultCategories.forEach((cat, i) => {
    nameToId.set(cat.name, parentIds[i])
  })

  // Insert subcategories
  const subs: Omit<Category, 'id'>[] = []
  for (const [parentName, children] of Object.entries(subcategories)) {
    const parentId = nameToId.get(parentName)
    if (parentId === undefined) continue
    for (const child of children) {
      subs.push({ ...child, parentId })
    }
  }

  if (subs.length > 0) {
    await db.categories.bulkAdd(subs)
  }
}

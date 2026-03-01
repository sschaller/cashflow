import { db } from './index.ts'
import type { Category } from '@/types/models.ts'

// Fixed epoch so seeded categories never win a sync merge over user actions
const SEED_EPOCH = '2024-01-01T00:00:00.000Z'

// Deterministic UUIDs for seed categories (generated once, stable across devices)
const ID = {
  INCOME: '10000000-0000-4000-8000-000000000001',
  HOUSING: '10000000-0000-4000-8000-000000000002',
  TRANSPORTATION: '10000000-0000-4000-8000-000000000003',
  FOOD_DINING: '10000000-0000-4000-8000-000000000004',
  SHOPPING: '10000000-0000-4000-8000-000000000005',
  ENTERTAINMENT: '10000000-0000-4000-8000-000000000006',
  HEALTH_FITNESS: '10000000-0000-4000-8000-000000000007',
  PERSONAL_CARE: '10000000-0000-4000-8000-000000000008',
  EDUCATION: '10000000-0000-4000-8000-000000000009',
  BILLS_UTILITIES: '10000000-0000-4000-8000-000000000010',
  INSURANCE: '10000000-0000-4000-8000-000000000011',
  SAVINGS_INVESTMENTS: '10000000-0000-4000-8000-000000000012',
  GIFTS_DONATIONS: '10000000-0000-4000-8000-000000000013',
  TRAVEL: '10000000-0000-4000-8000-000000000014',
  TRANSFERS: '10000000-0000-4000-8000-000000000015',
  // Subcategories
  SALARY: '10000000-0000-4000-8000-000000000017',
  FREELANCE: '10000000-0000-4000-8000-000000000018',
  INTEREST: '10000000-0000-4000-8000-000000000019',
  OTHER_INCOME: '10000000-0000-4000-8000-000000000020',
  RENT_MORTGAGE: '10000000-0000-4000-8000-000000000021',
  HOME_MAINTENANCE: '10000000-0000-4000-8000-000000000022',
  GROCERIES: '10000000-0000-4000-8000-000000000023',
  RESTAURANTS: '10000000-0000-4000-8000-000000000024',
  ELECTRICITY: '10000000-0000-4000-8000-000000000025',
  INTERNET_PHONE: '10000000-0000-4000-8000-000000000026',
  SUBSCRIPTIONS: '10000000-0000-4000-8000-000000000027',
} as const

const defaultCategories: Category[] = [
  // Top-level categories
  { id: ID.INCOME, name: 'Income', parentId: null, color: '#4CAF50', icon: 'trending-up', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: ID.HOUSING, name: 'Housing', parentId: null, color: '#F44336', icon: 'home', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: ID.TRANSPORTATION, name: 'Transportation', parentId: null, color: '#FF9800', icon: 'car', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
  { id: ID.FOOD_DINING, name: 'Food & Dining', parentId: null, color: '#E91E63', icon: 'utensils', isSystem: true, sortOrder: 3, updatedAt: SEED_EPOCH },
  { id: ID.SHOPPING, name: 'Shopping', parentId: null, color: '#9C27B0', icon: 'shopping-bag', isSystem: true, sortOrder: 4, updatedAt: SEED_EPOCH },
  { id: ID.ENTERTAINMENT, name: 'Entertainment', parentId: null, color: '#673AB7', icon: 'film', isSystem: true, sortOrder: 5, updatedAt: SEED_EPOCH },
  { id: ID.HEALTH_FITNESS, name: 'Health & Fitness', parentId: null, color: '#00BCD4', icon: 'heart', isSystem: true, sortOrder: 6, updatedAt: SEED_EPOCH },
  { id: ID.PERSONAL_CARE, name: 'Personal Care', parentId: null, color: '#FF5722', icon: 'user', isSystem: true, sortOrder: 7, updatedAt: SEED_EPOCH },
  { id: ID.EDUCATION, name: 'Education', parentId: null, color: '#3F51B5', icon: 'book', isSystem: true, sortOrder: 8, updatedAt: SEED_EPOCH },
  { id: ID.BILLS_UTILITIES, name: 'Bills & Utilities', parentId: null, color: '#607D8B', icon: 'zap', isSystem: true, sortOrder: 9, updatedAt: SEED_EPOCH },
  { id: ID.INSURANCE, name: 'Insurance', parentId: null, color: '#795548', icon: 'shield', isSystem: true, sortOrder: 10, updatedAt: SEED_EPOCH },
  { id: ID.SAVINGS_INVESTMENTS, name: 'Savings & Investments', parentId: null, color: '#009688', icon: 'piggy-bank', isSystem: true, sortOrder: 11, updatedAt: SEED_EPOCH },
  { id: ID.GIFTS_DONATIONS, name: 'Gifts & Donations', parentId: null, color: '#CDDC39', icon: 'gift', isSystem: true, sortOrder: 12, updatedAt: SEED_EPOCH },
  { id: ID.TRAVEL, name: 'Travel', parentId: null, color: '#2196F3', icon: 'plane', isSystem: true, sortOrder: 13, updatedAt: SEED_EPOCH },
  { id: ID.TRANSFERS, name: 'Transfers', parentId: null, color: '#9E9E9E', icon: 'repeat', isSystem: true, sortOrder: 14, updatedAt: SEED_EPOCH },

  // Income subcategories
  { id: ID.SALARY, name: 'Salary', parentId: ID.INCOME, color: '#66BB6A', icon: 'briefcase', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: ID.FREELANCE, name: 'Freelance', parentId: ID.INCOME, color: '#81C784', icon: 'code', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: ID.INTEREST, name: 'Interest', parentId: ID.INCOME, color: '#A5D6A7', icon: 'percent', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
  { id: ID.OTHER_INCOME, name: 'Other Income', parentId: ID.INCOME, color: '#C8E6C9', icon: 'plus', isSystem: true, sortOrder: 3, updatedAt: SEED_EPOCH },

  // Housing subcategories
  { id: ID.RENT_MORTGAGE, name: 'Rent / Mortgage', parentId: ID.HOUSING, color: '#EF5350', icon: 'key', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: ID.HOME_MAINTENANCE, name: 'Home Maintenance', parentId: ID.HOUSING, color: '#E57373', icon: 'tool', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },

  // Food & Dining subcategories
  { id: ID.GROCERIES, name: 'Groceries', parentId: ID.FOOD_DINING, color: '#EC407A', icon: 'shopping-cart', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: ID.RESTAURANTS, name: 'Restaurants', parentId: ID.FOOD_DINING, color: '#F06292', icon: 'coffee', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },

  // Bills & Utilities subcategories
  { id: ID.ELECTRICITY, name: 'Electricity', parentId: ID.BILLS_UTILITIES, color: '#78909C', icon: 'zap', isSystem: true, sortOrder: 0, updatedAt: SEED_EPOCH },
  { id: ID.INTERNET_PHONE, name: 'Internet & Phone', parentId: ID.BILLS_UTILITIES, color: '#90A4AE', icon: 'wifi', isSystem: true, sortOrder: 1, updatedAt: SEED_EPOCH },
  { id: ID.SUBSCRIPTIONS, name: 'Subscriptions', parentId: ID.BILLS_UTILITIES, color: '#B0BEC5', icon: 'tv', isSystem: true, sortOrder: 2, updatedAt: SEED_EPOCH },
]

export async function seedDefaultCategories(): Promise<void> {
  const count = await db.categories.count()
  if (count > 0) return
  await db.categories.bulkAdd(defaultCategories)
}

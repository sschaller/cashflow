import { describe, it, expect } from 'vitest'
import { categorizeTransaction, recategorizeTransactions } from './categorizationEngine.ts'
import type { Transaction, Rule } from '@/types/models.ts'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: '2024-01-15',
    amount: -50.00,
    description: 'WALMART SUPERCENTER',
    normalizedDescription: 'walmart supercenter',
    accountId: 1,
    type: 'expense',
    tags: [],
    notes: '',
    hash: 'abc',
    isManualCategory: false,
    importedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

const groceryRule: Rule = {
  id: 1,
  name: 'Groceries',
  conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
  categoryId: 3,
  priority: 10,
  isEnabled: true,
}

const restaurantRule: Rule = {
  id: 2,
  name: 'Restaurants',
  conditions: [{ field: 'description', operator: 'contains', value: 'restaurant' }],
  categoryId: 4,
  priority: 20,
  isEnabled: true,
}

const highPriorityWalmart: Rule = {
  id: 3,
  name: 'Walmart Priority',
  conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
  categoryId: 5,
  priority: 5,
  isEnabled: true,
}

describe('categorizeTransaction', () => {
  it('returns categoryId when rule matches', () => {
    const result = categorizeTransaction(makeTx(), [groceryRule, restaurantRule])
    expect(result).toBe(3)
  })

  it('returns null when no rules match', () => {
    const tx = makeTx({ normalizedDescription: 'amazon purchase' })
    const result = categorizeTransaction(tx, [groceryRule, restaurantRule])
    expect(result).toBeNull()
  })

  it('respects priority ordering (lower number = higher priority)', () => {
    const result = categorizeTransaction(makeTx(), [groceryRule, highPriorityWalmart])
    expect(result).toBe(5) // highPriorityWalmart has priority 5, groceryRule has 10
  })

  it('never overwrites manual category', () => {
    const tx = makeTx({ isManualCategory: true, categoryId: 99 })
    const result = categorizeTransaction(tx, [groceryRule])
    expect(result).toBe(99)
  })

  it('handles empty rules list', () => {
    const result = categorizeTransaction(makeTx(), [])
    expect(result).toBeNull()
  })

  it('skips disabled rules', () => {
    const disabledRule: Rule = { ...groceryRule, isEnabled: false }
    const result = categorizeTransaction(makeTx(), [disabledRule])
    expect(result).toBeNull()
  })
})

describe('recategorizeTransactions', () => {
  it('returns updates for auto-categorized transactions', () => {
    const tx1 = makeTx({ id: 1, categoryId: undefined })
    const tx2 = makeTx({ id: 2, normalizedDescription: 'restaurant xyz', categoryId: undefined })
    const updates = recategorizeTransactions([tx1, tx2], [groceryRule, restaurantRule])
    expect(updates.get(1)).toBe(3)
    expect(updates.get(2)).toBe(4)
  })

  it('skips manually categorized transactions', () => {
    const tx = makeTx({ id: 1, isManualCategory: true, categoryId: 99 })
    const updates = recategorizeTransactions([tx], [groceryRule])
    expect(updates.size).toBe(0)
  })
})

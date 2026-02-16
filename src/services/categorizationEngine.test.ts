import { describe, it, expect } from 'vitest'
import { categorizeTransaction, recategorizeTransactions, applyRules, reapplyRules } from './categorizationEngine.ts'
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

const renameRule: Rule = {
  id: 4,
  name: 'Rename Walmart',
  conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
  displayDescription: 'Walmart',
  priority: 10,
  isEnabled: true,
}

const categoryAndRenameRule: Rule = {
  id: 5,
  name: 'Categorize and Rename Walmart',
  conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
  categoryId: 3,
  displayDescription: 'Walmart Grocery',
  priority: 10,
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

describe('applyRules', () => {
  it('returns categoryId from matching rule', () => {
    const result = applyRules(makeTx(), [groceryRule])
    expect(result.categoryId).toBe(3)
  })

  it('returns displayDescription from matching rule', () => {
    const result = applyRules(makeTx(), [renameRule])
    expect(result.displayDescription).toBe('Walmart')
    expect(result.categoryId).toBeUndefined()
  })

  it('returns both categoryId and displayDescription', () => {
    const result = applyRules(makeTx(), [categoryAndRenameRule])
    expect(result.categoryId).toBe(3)
    expect(result.displayDescription).toBe('Walmart Grocery')
  })

  it('combines actions from multiple rules', () => {
    // renameRule only has displayDescription, groceryRule only has categoryId
    const result = applyRules(makeTx(), [renameRule, groceryRule])
    expect(result.categoryId).toBe(3)
    expect(result.displayDescription).toBe('Walmart')
  })

  it('first matching rule wins for each action', () => {
    const secondRename: Rule = {
      ...renameRule,
      id: 10,
      displayDescription: 'WM Stores',
      priority: 20,
    }
    const result = applyRules(makeTx(), [renameRule, secondRename])
    expect(result.displayDescription).toBe('Walmart') // first match wins
  })

  it('returns empty result when no rules match', () => {
    const tx = makeTx({ normalizedDescription: 'amazon purchase' })
    const result = applyRules(tx, [groceryRule, renameRule])
    expect(result.categoryId).toBeUndefined()
    expect(result.displayDescription).toBeUndefined()
  })

  it('substitutes $1, $2 from regex capture groups', () => {
    const regexRule: Rule = {
      id: 20,
      name: 'Regex rename',
      conditions: [{ field: 'description', operator: 'regex', value: '(walmart) (supercenter)' }],
      displayDescription: 'Store: $1 - $2',
      priority: 10,
      isEnabled: true,
    }
    const result = applyRules(makeTx(), [regexRule])
    expect(result.displayDescription).toBe('Store: walmart - supercenter')
  })

  it('leaves $N as empty string when capture group does not exist', () => {
    const regexRule: Rule = {
      id: 21,
      name: 'Regex partial',
      conditions: [{ field: 'description', operator: 'regex', value: '(walmart)' }],
      displayDescription: '$1 $2',
      priority: 10,
      isEnabled: true,
    }
    const result = applyRules(makeTx(), [regexRule])
    expect(result.displayDescription).toBe('walmart ')
  })

  it('does not substitute when rule has no regex condition', () => {
    const containsRule: Rule = {
      id: 22,
      name: 'Contains with dollar',
      conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
      displayDescription: 'Store $1',
      priority: 10,
      isEnabled: true,
    }
    const result = applyRules(makeTx(), [containsRule])
    expect(result.displayDescription).toBe('Store $1')
  })
})

describe('reapplyRules', () => {
  it('updates category and displayDescription', () => {
    const tx = makeTx({ id: 1, categoryId: undefined })
    const updates = reapplyRules([tx], [categoryAndRenameRule])
    expect(updates.get(1)).toEqual({ categoryId: 3, displayDescription: 'Walmart Grocery' })
  })

  it('skips manually categorized transactions for category', () => {
    const tx = makeTx({ id: 1, isManualCategory: true, categoryId: 99 })
    const updates = reapplyRules([tx], [categoryAndRenameRule])
    const changes = updates.get(1)
    expect(changes?.categoryId).toBeUndefined()
    expect(changes?.displayDescription).toBe('Walmart Grocery')
  })

  it('skips manually described transactions for displayDescription', () => {
    const tx = makeTx({ id: 1, isManualDescription: true, displayDescription: 'My Custom Name' })
    const updates = reapplyRules([tx], [categoryAndRenameRule])
    const changes = updates.get(1)
    expect(changes?.categoryId).toBe(3)
    expect(changes?.displayDescription).toBeUndefined()
  })

  it('skips both when both are manual', () => {
    const tx = makeTx({
      id: 1,
      isManualCategory: true,
      categoryId: 99,
      isManualDescription: true,
      displayDescription: 'My Custom Name',
    })
    const updates = reapplyRules([tx], [categoryAndRenameRule])
    expect(updates.size).toBe(0)
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

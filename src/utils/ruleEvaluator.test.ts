import { describe, it, expect } from 'vitest'
import { evaluateCondition, evaluateRule, extractRegexCaptures } from './ruleEvaluator.ts'
import type { Transaction, Rule, RuleCondition } from '@/types/models.ts'

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    date: '2024-01-15',
    amount: -50.00,
    description: 'WALMART SUPERCENTER #1234',
    normalizedDescription: 'walmart supercenter #1234',
    accountId: 1,
    type: 'expense',
    tags: [],
    notes: '',
    hash: 'abc123',
    isManualCategory: false,
    importedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  }
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 1,
    name: 'Test Rule',
    conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
    categoryId: 3,
    priority: 10,
    isEnabled: true,
    ...overrides,
  }
}

describe('evaluateCondition', () => {
  const tx = makeTx()

  it('matches contains', () => {
    const cond: RuleCondition = { field: 'description', operator: 'contains', value: 'walmart' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('does not match contains with wrong value', () => {
    const cond: RuleCondition = { field: 'description', operator: 'contains', value: 'target' }
    expect(evaluateCondition(tx, cond)).toBe(false)
  })

  it('matches not_contains', () => {
    const cond: RuleCondition = { field: 'description', operator: 'not_contains', value: 'target' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches equals', () => {
    const cond: RuleCondition = { field: 'description', operator: 'equals', value: 'walmart supercenter #1234' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches starts_with', () => {
    const cond: RuleCondition = { field: 'description', operator: 'starts_with', value: 'walmart' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches ends_with', () => {
    const cond: RuleCondition = { field: 'description', operator: 'ends_with', value: '#1234' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches regex', () => {
    const cond: RuleCondition = { field: 'description', operator: 'regex', value: 'walmart.*#\\d+' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('handles invalid regex gracefully', () => {
    const cond: RuleCondition = { field: 'description', operator: 'regex', value: '[invalid' }
    expect(evaluateCondition(tx, cond)).toBe(false)
  })

  it('matches greater_than for amount', () => {
    const cond: RuleCondition = { field: 'amount', operator: 'greater_than', value: '40' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches less_than for amount', () => {
    const cond: RuleCondition = { field: 'amount', operator: 'less_than', value: '60' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('matches between for amount', () => {
    const cond: RuleCondition = { field: 'amount', operator: 'between', value: '40', valueTo: '60' }
    expect(evaluateCondition(tx, cond)).toBe(true)
  })

  it('does not match between when out of range', () => {
    const cond: RuleCondition = { field: 'amount', operator: 'between', value: '60', valueTo: '100' }
    expect(evaluateCondition(tx, cond)).toBe(false)
  })
})

describe('evaluateRule', () => {
  it('matches when all conditions pass (AND logic)', () => {
    const tx = makeTx()
    const rule = makeRule({
      conditions: [
        { field: 'description', operator: 'contains', value: 'walmart' },
        { field: 'amount', operator: 'less_than', value: '100' },
      ],
    })
    expect(evaluateRule(tx, rule)).toBe(true)
  })

  it('does not match when one condition fails', () => {
    const tx = makeTx()
    const rule = makeRule({
      conditions: [
        { field: 'description', operator: 'contains', value: 'walmart' },
        { field: 'amount', operator: 'greater_than', value: '100' },
      ],
    })
    expect(evaluateRule(tx, rule)).toBe(false)
  })

  it('returns false for disabled rules', () => {
    const tx = makeTx()
    const rule = makeRule({ isEnabled: false })
    expect(evaluateRule(tx, rule)).toBe(false)
  })

  it('returns false for rules with no conditions', () => {
    const tx = makeTx()
    const rule = makeRule({ conditions: [] })
    expect(evaluateRule(tx, rule)).toBe(false)
  })
})

describe('extractRegexCaptures', () => {
  it('returns capture groups from regex description condition', () => {
    const tx = makeTx()
    const rule = makeRule({
      conditions: [{ field: 'description', operator: 'regex', value: '(walmart) (supercenter) #(\\d+)' }],
    })
    const captures = extractRegexCaptures(tx, rule)
    expect(captures).not.toBeNull()
    expect(captures![1]).toBe('walmart')
    expect(captures![2]).toBe('supercenter')
    expect(captures![3]).toBe('1234')
  })

  it('returns null when no regex condition exists', () => {
    const tx = makeTx()
    const rule = makeRule({
      conditions: [{ field: 'description', operator: 'contains', value: 'walmart' }],
    })
    expect(extractRegexCaptures(tx, rule)).toBeNull()
  })

  it('returns null when regex does not match', () => {
    const tx = makeTx({ normalizedDescription: 'amazon purchase' })
    const rule = makeRule({
      conditions: [{ field: 'description', operator: 'regex', value: '(walmart)' }],
    })
    expect(extractRegexCaptures(tx, rule)).toBeNull()
  })

  it('skips non-description regex conditions', () => {
    const tx = makeTx()
    const rule = makeRule({
      conditions: [{ field: 'amount', operator: 'regex', value: '(50)' }],
    })
    expect(extractRegexCaptures(tx, rule)).toBeNull()
  })
})

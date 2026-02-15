import type { Transaction, Rule, RuleCondition } from '@/types/models.ts'

export function evaluateCondition(transaction: Transaction, condition: RuleCondition): boolean {
  const { field, operator, value, valueTo } = condition

  let fieldValue: string

  switch (field) {
    case 'description':
      fieldValue = transaction.normalizedDescription
      break
    case 'amount':
      fieldValue = String(Math.abs(transaction.amount))
      break
    case 'date':
      fieldValue = transaction.date
      break
    case 'accountId':
      fieldValue = String(transaction.accountId)
      break
    case 'bankCategory':
      fieldValue = transaction.bankCategory?.toLowerCase() ?? ''
      break
    default:
      return false
  }

  const lowerValue = value.toLowerCase()

  switch (operator) {
    case 'contains':
      return fieldValue.includes(lowerValue)
    case 'not_contains':
      return !fieldValue.includes(lowerValue)
    case 'equals':
      return fieldValue === lowerValue
    case 'starts_with':
      return fieldValue.startsWith(lowerValue)
    case 'ends_with':
      return fieldValue.endsWith(lowerValue)
    case 'regex':
      try {
        return new RegExp(value, 'i').test(fieldValue)
      } catch {
        return false
      }
    case 'greater_than':
      return parseFloat(fieldValue) > parseFloat(value)
    case 'less_than':
      return parseFloat(fieldValue) < parseFloat(value)
    case 'between':
      if (!valueTo) return false
      const num = parseFloat(fieldValue)
      return num >= parseFloat(value) && num <= parseFloat(valueTo)
    default:
      return false
  }
}

export function evaluateRule(transaction: Transaction, rule: Rule): boolean {
  if (!rule.isEnabled || rule.conditions.length === 0) return false
  return rule.conditions.every((condition) => evaluateCondition(transaction, condition))
}

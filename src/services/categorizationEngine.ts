import type { Transaction, Rule } from '@/types/models.ts'
import { evaluateRule } from '@/utils/ruleEvaluator.ts'

/**
 * Categorize a transaction using the given rules.
 * Rules are expected to be sorted by priority (lower number = higher priority).
 * First matching rule wins. Returns the categoryId or null if no rule matches.
 */
export function categorizeTransaction(
  transaction: Transaction,
  rules: Rule[]
): number | null {
  // Never overwrite manual assignments
  if (transaction.isManualCategory && transaction.categoryId) {
    return transaction.categoryId
  }

  // Sort rules by priority (lower = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  for (const rule of sorted) {
    if (evaluateRule(transaction, rule)) {
      return rule.categoryId
    }
  }

  return null
}

/**
 * Re-categorize multiple transactions using current rules.
 * Only updates transactions that are not manually categorized.
 */
export function recategorizeTransactions(
  transactions: Transaction[],
  rules: Rule[]
): Map<number, number | undefined> {
  const updates = new Map<number, number | undefined>()

  for (const tx of transactions) {
    if (tx.isManualCategory) continue
    const categoryId = categorizeTransaction(tx, rules)
    if (categoryId !== null && categoryId !== tx.categoryId) {
      updates.set(tx.id!, categoryId)
    }
  }

  return updates
}

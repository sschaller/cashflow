import type { Transaction, Rule } from '@/types/models.ts'
import type { RepositoryProvider } from '@/repositories/interfaces.ts'
import { evaluateRule, extractRegexCaptures } from '@/utils/ruleEvaluator.ts'

export interface RuleResult {
  categoryId?: number
  displayDescription?: string
}

/**
 * Apply rules to a transaction and return the combined actions.
 * Rules are evaluated by priority (lower number = higher priority).
 * The first matching rule that provides a categoryId wins for category.
 * The first matching rule that provides a displayDescription wins for description.
 */
export function applyRules(
  transaction: Transaction,
  rules: Rule[]
): RuleResult {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  const result: RuleResult = {}

  for (const rule of sorted) {
    if (!evaluateRule(transaction, rule)) continue

    if (result.categoryId === undefined && rule.categoryId !== undefined) {
      result.categoryId = rule.categoryId
    }
    if (result.displayDescription === undefined && rule.displayDescription) {
      let desc = rule.displayDescription
      // Substitute $1, $2, etc. from regex capture groups
      if (/\$\d/.test(desc)) {
        const captures = extractRegexCaptures(transaction, rule)
        if (captures) {
          desc = desc.replace(/\$(\d+)/g, (_, n) => captures[parseInt(n)] ?? '')
        }
      }
      result.displayDescription = desc
    }

    // Stop early if both are resolved
    if (result.categoryId !== undefined && result.displayDescription !== undefined) {
      break
    }
  }

  return result
}

/**
 * Categorize a transaction using the given rules.
 * Kept for backward compatibility — returns just the categoryId.
 */
export function categorizeTransaction(
  transaction: Transaction,
  rules: Rule[]
): number | null {
  // Never overwrite manual assignments
  if (transaction.isManualCategory && transaction.categoryId) {
    return transaction.categoryId
  }

  const result = applyRules(transaction, rules)
  return result.categoryId ?? null
}

/**
 * Re-apply rules to multiple transactions.
 * Only updates transactions that are not manually categorized/described.
 */
export function reapplyRules(
  transactions: Transaction[],
  rules: Rule[]
): Map<number, Partial<Transaction>> {
  const updates = new Map<number, Partial<Transaction>>()

  for (const tx of transactions) {
    const result = applyRules(tx, rules)
    const changes: Partial<Transaction> = {}

    if (!tx.isManualCategory && result.categoryId !== undefined && result.categoryId !== tx.categoryId) {
      changes.categoryId = result.categoryId
    }

    if (!tx.isManualDescription && result.displayDescription !== undefined && result.displayDescription !== tx.displayDescription) {
      changes.displayDescription = result.displayDescription
    }

    if (Object.keys(changes).length > 0) {
      updates.set(tx.id!, changes)
    }
  }

  return updates
}

/**
 * @deprecated Use reapplyRules instead
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

/**
 * Fetch all transactions and enabled rules, then re-apply.
 * Skips manually categorized/described transactions and respects rule priority.
 * Returns the number of updated transactions.
 */
export async function rerunRules(repos: RepositoryProvider): Promise<number> {
  const [transactions, rules] = await Promise.all([
    repos.transactions.getAll(),
    repos.rules.getEnabled(),
  ])

  const updates = reapplyRules(transactions, rules)

  for (const [id, changes] of updates) {
    await repos.transactions.update(id, changes)
  }

  return updates.size
}

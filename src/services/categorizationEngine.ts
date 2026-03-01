import type { Transaction, Rule } from '@/types/models.ts'
import type { RepositoryProvider } from '@/repositories/interfaces.ts'
import { evaluateRule, extractRegexCaptures } from '@/utils/ruleEvaluator.ts'
import { db } from '@/db/index.ts'

export interface RuleResult {
  categoryId?: string
  displayDescription?: string
}

/**
 * Apply rules to a transaction and return the combined actions.
 * Rules are evaluated by priority (lower number = higher priority).
 * The first matching rule that provides a categoryId wins for category.
 * The first matching rule that provides a displayDescription wins for description.
 * If `presorted` is true, the rules array is assumed to already be sorted by priority.
 */
export function applyRules(
  transaction: Transaction,
  rules: Rule[],
  presorted = false
): RuleResult {
  const sorted = presorted ? rules : [...rules].sort((a, b) => a.priority - b.priority)

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
): string | null {
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
): Map<string, Partial<Transaction>> {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority)
  const updates = new Map<string, Partial<Transaction>>()

  for (const tx of transactions) {
    // Skip transactions where both category and description are manually set
    if (tx.isManualCategory && tx.isManualDescription) continue

    const result = applyRules(tx, sorted, true)
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
): Map<string, string | undefined> {
  const updates = new Map<string, string | undefined>()

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
 * Writes all updates in a single IndexedDB transaction for performance.
 * Returns the number of updated transactions.
 */
export async function rerunRules(repos: RepositoryProvider): Promise<number> {
  const [transactions, rules] = await Promise.all([
    repos.transactions.getAll(),
    repos.rules.getEnabled(),
  ])

  const updates = reapplyRules(transactions, rules)

  if (updates.size > 0) {
    const now = new Date().toISOString()
    await db.transaction('rw', db.transactions, async () => {
      for (const [id, changes] of updates) {
        await db.transactions.update(id, { ...changes, updatedAt: now })
      }
    })
  }

  return updates.size
}

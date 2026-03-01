import type { Transaction, ColumnMapping, AmountConfig } from '@/types/models.ts'
import type { RepositoryProvider } from '@/repositories/interfaces.ts'
import type { ParseResult } from '@/parsers/types.ts'
import { mapRow } from '@/parsers/columnMapper.ts'
import { computeHash } from '@/utils/fileHelpers.ts'
import { applyRules } from './categorizationEngine.ts'

export interface ImportOptions {
  accountId: string
  columnMapping: ColumnMapping
  dateFormat: string
  amountConfig: AmountConfig
  importProfileId?: string
}

export interface ImportResult {
  imported: number
  duplicates: number
  errors: number
  errorMessages: string[]
}

export async function importTransactions(
  parseResult: ParseResult,
  options: ImportOptions,
  repos: RepositoryProvider
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, duplicates: 0, errors: 0, errorMessages: [] }

  const rules = await repos.rules.getEnabled()
  const now = new Date().toISOString()

  const transactionsToAdd: Omit<Transaction, 'id'>[] = []

  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i]

    try {
      const mapped = mapRow(row, options.columnMapping, options.dateFormat, options.amountConfig)
      if (!mapped) {
        result.errors++
        result.errorMessages.push(`Row ${i + 1}: Could not parse row`)
        continue
      }

      // Compute dedup hash
      const hashInput = `${mapped.date}|${mapped.amount}|${mapped.normalizedDescription}`
      const hash = await computeHash(hashInput)

      // Check for duplicates
      const existing = await repos.transactions.getByHash(hash)
      if (existing) {
        result.duplicates++
        continue
      }

      // Determine type
      const type = mapped.amount > 0 ? 'income' : mapped.amount < 0 ? 'expense' : 'expense'

      // Auto-categorize
      const tempTransaction = {
        ...mapped,
        accountId: options.accountId,
        type,
        tags: [] as string[],
        notes: '',
        bankCategory: mapped.bankCategory,
        hash,
        isManualCategory: false,
        importedAt: now,
      } as Transaction

      const ruleResult = applyRules(tempTransaction, rules)

      transactionsToAdd.push({
        date: mapped.date,
        amount: mapped.amount,
        description: mapped.description,
        normalizedDescription: mapped.normalizedDescription,
        displayDescription: ruleResult.displayDescription,
        accountId: options.accountId,
        categoryId: ruleResult.categoryId,
        type,
        tags: [],
        notes: '',
        bankCategory: mapped.bankCategory,
        hash,
        isManualCategory: false,
        importProfileId: options.importProfileId,
        importedAt: now,
      })
    } catch {
      result.errors++
      result.errorMessages.push(`Row ${i + 1}: Unexpected error`)
    }
  }

  if (transactionsToAdd.length > 0) {
    await repos.transactions.bulkAdd(transactionsToAdd)
    result.imported = transactionsToAdd.length
  }

  return result
}

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import { computeDashboardSummary, sumByCategory, monthlyTotals } from '@/utils/aggregation.ts'
import { useAccounts } from '@/hooks/useAccounts.ts'
import { useCurrencyLookup, getUniqueCurrency } from '@/hooks/useCurrencyLookup.ts'
import type { Transaction, Category } from '@/types/models.ts'

export function useDashboardData(startDate: string, endDate: string) {
  const transactions = useLiveQuery(
    () => db.transactions.where('date').between(startDate, endDate, true, true).toArray(),
    [startDate, endDate]
  )

  const categories = useLiveQuery(() => db.categories.toArray())
  const accounts = useAccounts()
  const currencyMap = useCurrencyLookup(accounts)

  return useMemo(() => {
    const txs: Transaction[] = transactions ?? []
    const cats: Category[] = categories ?? []
    const currency = txs.length > 0 ? getUniqueCurrency(txs, currencyMap) : null

    return {
      transactions: txs,
      summary: computeDashboardSummary(txs, cats),
      categoryBreakdown: sumByCategory(txs, cats),
      monthlyTotals: monthlyTotals(txs),
      loading: transactions === undefined || categories === undefined,
      currency,
    }
  }, [transactions, categories, currencyMap])
}

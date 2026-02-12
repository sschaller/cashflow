import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import { computeDashboardSummary, sumByCategory, monthlyTotals } from '@/utils/aggregation.ts'
import type { Transaction, Category } from '@/types/models.ts'

export function useDashboardData(startDate: string, endDate: string) {
  const transactions = useLiveQuery(
    () => db.transactions.where('date').between(startDate, endDate, true, true).toArray(),
    [startDate, endDate]
  )

  const categories = useLiveQuery(() => db.categories.toArray())

  return useMemo(() => {
    const txs: Transaction[] = transactions ?? []
    const cats: Category[] = categories ?? []

    return {
      transactions: txs,
      summary: computeDashboardSummary(txs, cats),
      categoryBreakdown: sumByCategory(txs.filter((t) => t.amount < 0), cats),
      monthlyTotals: monthlyTotals(txs),
      loading: transactions === undefined || categories === undefined,
    }
  }, [transactions, categories])
}

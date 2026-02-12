import { format, parseISO } from 'date-fns'
import type { Transaction, Category } from '@/types/models.ts'
import type { CategoryBreakdownItem, MonthlyTotal, DashboardSummary } from '@/types/charts.ts'

export function sumByCategory(
  transactions: Transaction[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const catMap = new Map<number, Category>()
  for (const c of categories) catMap.set(c.id!, c)

  const totals = new Map<number, { amount: number; count: number }>()

  for (const tx of transactions) {
    const catId = tx.categoryId ?? 0
    const existing = totals.get(catId) ?? { amount: 0, count: 0 }
    existing.amount += Math.abs(tx.amount)
    existing.count++
    totals.set(catId, existing)
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, v) => sum + v.amount, 0)

  return Array.from(totals.entries())
    .map(([catId, data]) => {
      const cat = catMap.get(catId)
      return {
        categoryId: catId,
        categoryName: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? '#BDBDBD',
        amount: data.amount,
        percentage: grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0,
        transactionCount: data.count,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function monthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const months = new Map<string, MonthlyTotal>()

  for (const tx of transactions) {
    const month = format(parseISO(tx.date), 'yyyy-MM')
    const existing = months.get(month) ?? { month, income: 0, expenses: 0, net: 0 }

    if (tx.amount > 0) {
      existing.income += tx.amount
    } else {
      existing.expenses += Math.abs(tx.amount)
    }
    existing.net = existing.income - existing.expenses
    months.set(month, existing)
  }

  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month))
}

export function computeDashboardSummary(
  transactions: Transaction[],
  categories: Category[]
): DashboardSummary {
  let totalIncome = 0
  let totalExpenses = 0

  for (const tx of transactions) {
    if (tx.amount > 0) {
      totalIncome += tx.amount
    } else {
      totalExpenses += Math.abs(tx.amount)
    }
  }

  const expensesByCategory = sumByCategory(
    transactions.filter((t) => t.amount < 0),
    categories
  )

  const topCategory = expensesByCategory.length > 0
    ? { name: expensesByCategory[0].categoryName, amount: expensesByCategory[0].amount }
    : null

  return {
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    topCategory,
    transactionCount: transactions.length,
  }
}

import { format, parseISO } from 'date-fns'
import type { Transaction, Category } from '@/types/models.ts'
import type { CategoryBreakdownItem, MonthlyTotal, MonthlyCategoryTotal, DashboardSummary } from '@/types/charts.ts'

export function sumByCategory(
  transactions: Transaction[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const catMap = new Map<string, Category>()
  for (const c of categories) catMap.set(c.id!, c)

  const totals = new Map<string, { amount: number; count: number }>()

  for (const tx of transactions) {
    const catId = tx.categoryId ?? '_uncategorized'
    const existing = totals.get(catId) ?? { amount: 0, count: 0 }
    existing.amount += tx.amount
    existing.count++
    totals.set(catId, existing)
  }

  // Only include categories with net spending (negative sum)
  const items = Array.from(totals.entries())
    .filter(([, data]) => data.amount < 0)
    .map(([catId, data]) => ({
      catId,
      amount: Math.abs(data.amount),
      count: data.count,
    }))

  const grandTotal = items.reduce((sum, v) => sum + v.amount, 0)

  return items
    .map(({ catId, amount, count }) => {
      const cat = catMap.get(catId)
      return {
        categoryId: catId,
        categoryName: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? '#BDBDBD',
        amount,
        percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        transactionCount: count,
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

export function monthlyCategoryTotals(
  transactions: Transaction[],
  categories: Category[]
): MonthlyCategoryTotal[] {
  const catMap = new Map<string, Category>()
  for (const c of categories) catMap.set(c.id!, c)

  const expenses = transactions.filter((t) => t.amount < 0)

  // Aggregate by month+category
  const monthCatMap = new Map<string, Map<string, number>>()
  for (const tx of expenses) {
    const month = format(parseISO(tx.date), 'yyyy-MM')
    const catId = tx.categoryId ?? '_uncategorized'
    if (!monthCatMap.has(month)) monthCatMap.set(month, new Map())
    const cats = monthCatMap.get(month)!
    cats.set(catId, (cats.get(catId) ?? 0) + Math.abs(tx.amount))
  }

  // Determine top 8 categories by total amount across all months
  const catTotals = new Map<string, number>()
  for (const cats of monthCatMap.values()) {
    for (const [catId, amount] of cats) {
      catTotals.set(catId, (catTotals.get(catId) ?? 0) + amount)
    }
  }
  const sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])
  const topCatIds = new Set(sortedCats.slice(0, 8).map(([id]) => id))

  return Array.from(monthCatMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => {
      const catEntries: MonthlyCategoryTotal['categories'] = []
      let otherAmount = 0

      for (const [catId, amount] of cats) {
        if (topCatIds.has(catId)) {
          const cat = catMap.get(catId)
          catEntries.push({
            categoryId: catId,
            categoryName: cat?.name ?? 'Uncategorized',
            color: cat?.color ?? '#BDBDBD',
            amount,
          })
        } else {
          otherAmount += amount
        }
      }

      if (otherAmount > 0) {
        catEntries.push({ categoryId: '_other', categoryName: 'Other', color: '#9E9E9E', amount: otherAmount })
      }

      catEntries.sort((a, b) => b.amount - a.amount)
      return { month, categories: catEntries }
    })
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

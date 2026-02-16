import { useState } from 'react'
import { usePageHeader } from '@/hooks/usePageHeader.ts'
import { Card } from '@/components/ui/Card.tsx'
import { SummaryCards } from '@/components/dashboard/SummaryCards.tsx'
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector.tsx'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown.tsx'
import { useDashboardData } from '@/hooks/useDashboardData.ts'
import { getDateRange } from '@/utils/dateUtils.ts'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'

export default function DashboardPage() {
  const defaultRange = getDateRange('last-3-months')
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)

  usePageHeader('Dashboard')
  const { summary, categoryBreakdown, loading, currency } = useDashboardData(startDate, endDate)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />
      </div>

      <div className="mb-6">
        <SummaryCards summary={summary} currency={currency} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Expense Breakdown</h2>
          <CategoryBreakdown items={categoryBreakdown} currency={currency} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          {summary.transactionCount === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2">No transactions yet</p>
              <p className="text-sm">Import some data to get started</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>{summary.transactionCount} transactions in selected period</p>
              <p>Income: {formatCurrencyOrPlain(summary.totalIncome, currency)}</p>
              <p>Expenses: {formatCurrencyOrPlain(summary.totalExpenses, currency)}</p>
              <p>Savings rate: {summary.totalIncome > 0 ? ((summary.netSavings / summary.totalIncome) * 100).toFixed(1) : 0}%</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

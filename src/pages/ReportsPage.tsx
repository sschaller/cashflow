import { useState, useMemo, useEffect } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData.ts'
import { useTransactions } from '@/hooks/useTransactions.ts'
import { useCategories } from '@/hooks/useCategories.ts'
import { useAccounts } from '@/hooks/useAccounts.ts'
import { useCurrencyLookup } from '@/hooks/useCurrencyLookup.ts'
import { useFilterStore } from '@/stores/useFilterStore.ts'
import { getDateRange } from '@/utils/dateUtils.ts'
import { monthlyCategoryTotals } from '@/utils/aggregation.ts'
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector.tsx'
import { Card } from '@/components/ui/Card.tsx'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart.tsx'
import { IncomeExpenseBar } from '@/components/charts/IncomeExpenseBar.tsx'
import { CategoryStackedBar } from '@/components/charts/CategoryStackedBar.tsx'
import { SankeyDiagram } from '@/components/charts/SankeyDiagram.tsx'
import { TransactionFilters } from '@/components/transactions/TransactionFilters.tsx'
import { TransactionTable } from '@/components/transactions/TransactionTable.tsx'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal.tsx'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import type { Transaction } from '@/types/models.ts'

type Tab = 'cashflow' | 'categories-total' | 'categories-time' | 'income-expenses'

const tabs: { key: Tab; label: string }[] = [
  { key: 'cashflow', label: 'Cashflow' },
  { key: 'categories-total', label: 'Categories' },
  { key: 'categories-time', label: 'Categories Over Time' },
  { key: 'income-expenses', label: 'Income vs Expenses' },
]

export default function ReportsPage() {
  const defaultRange = getDateRange('last-6-months')
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [activeTab, setActiveTab] = useState<Tab>('cashflow')
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const setFilter = useFilterStore((s) => s.setFilter)
  const setFilters = useFilterStore((s) => s.setFilters)
  const resetFilters = useFilterStore((s) => s.resetFilters)

  const categories = useCategories()
  const accounts = useAccounts()
  const currencyMap = useCurrencyLookup(accounts)

  const { transactions: dashTx, categoryBreakdown, monthlyTotals, loading, currency } = useDashboardData(startDate, endDate)
  const filteredTransactions = useTransactions()

  const monthlyCatData = useMemo(
    () => monthlyCategoryTotals(dashTx, categories),
    [dashTx, categories]
  )

  // Sync date range to filter store on mount and changes
  useEffect(() => {
    resetFilters()
    setFilters({ startDate, endDate })
  }, [startDate, endDate, resetFilters, setFilters])

  const handleDateRangeChange = (s: string, e: string) => {
    setStartDate(s)
    setEndDate(e)
  }

  const handleCategoryClick = (categoryId: number) => {
    setFilter('categoryId', categoryId)
  }

  const handleMonthClick = (month: string) => {
    const date = parseISO(month + '-01')
    const ms = format(startOfMonth(date), 'yyyy-MM-dd')
    const me = format(endOfMonth(date), 'yyyy-MM-dd')
    setFilters({ startDate: ms, endDate: me })
  }

  const handleStackedSegmentClick = (categoryId: number, month: string) => {
    const date = parseISO(month + '-01')
    const ms = format(startOfMonth(date), 'yyyy-MM-dd')
    const me = format(endOfMonth(date), 'yyyy-MM-dd')
    setFilters({ categoryId, startDate: ms, endDate: me })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Interactive charts with filterable transactions</p>
      </div>

      <div className="mb-6">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleDateRangeChange}
        />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'cashflow' && (
              <SankeyDiagram transactions={dashTx} categories={categories} currency={currency} bare />
            )}
            {activeTab === 'categories-total' && (
              <ExpensePieChart data={categoryBreakdown} currency={currency} onCategoryClick={handleCategoryClick} bare />
            )}
            {activeTab === 'categories-time' && (
              <CategoryStackedBar data={monthlyCatData} currency={currency} onSegmentClick={handleStackedSegmentClick} bare />
            )}
            {activeTab === 'income-expenses' && (
              <IncomeExpenseBar data={monthlyTotals} currency={currency} onMonthClick={handleMonthClick} bare />
            )}
          </>
        )}
      </Card>

      <div className="mb-4">
        <TransactionFilters categories={categories} accounts={accounts} />
      </div>

      <TransactionTable
        transactions={filteredTransactions}
        categories={categories}
        currencyMap={currencyMap}
        onSelect={setSelectedTx}
      />

      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        categories={categories}
        currency={selectedTx ? (currencyMap.get(selectedTx.accountId) ?? 'USD') : undefined}
      />
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardData } from '@/hooks/useDashboardData.ts'
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector.tsx'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart.tsx'
import { IncomeExpenseBar } from '@/components/charts/IncomeExpenseBar.tsx'
import { CategoryComparisonBar } from '@/components/charts/CategoryComparisonBar.tsx'
import { SankeyDiagram } from '@/components/charts/SankeyDiagram.tsx'
import { useCategories } from '@/hooks/useCategories.ts'
import { getDateRange } from '@/utils/dateUtils.ts'
import { useFilterStore } from '@/stores/useFilterStore.ts'

export default function ChartsPage() {
  const defaultRange = getDateRange('last-6-months')
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const navigate = useNavigate()
  const setFilter = useFilterStore((s) => s.setFilter)
  const categories = useCategories()

  const { transactions, categoryBreakdown, monthlyTotals, loading } = useDashboardData(startDate, endDate)

  const handleCategoryClick = (categoryId: number) => {
    setFilter('categoryId', categoryId)
    navigate('/transactions')
  }

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Charts</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Visualize your spending patterns</p>
      </div>

      <div className="mb-6">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ExpensePieChart data={categoryBreakdown} onCategoryClick={handleCategoryClick} />
        <IncomeExpenseBar data={monthlyTotals} />
        <CategoryComparisonBar data={categoryBreakdown} onCategoryClick={handleCategoryClick} />
        <SankeyDiagram transactions={transactions} categories={categories} />
      </div>
    </div>
  )
}

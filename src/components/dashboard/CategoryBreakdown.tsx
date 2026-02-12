import { formatCurrency } from '@/utils/currencyUtils.ts'
import type { CategoryBreakdownItem } from '@/types/charts.ts'

interface CategoryBreakdownProps {
  items: CategoryBreakdownItem[]
}

export function CategoryBreakdown({ items }: CategoryBreakdownProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No expense data</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.categoryId} className="group">
          <div className="mb-1 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-gray-800 dark:text-gray-200">{item.categoryName}</span>
              <span className="text-gray-400">({item.transactionCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
              <span className="text-gray-400">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

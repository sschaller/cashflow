import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { ChartContainer } from './ChartContainer.tsx'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import type { CategoryBreakdownItem } from '@/types/charts.ts'

ChartJS.register(ArcElement, Tooltip, Legend)

interface ExpensePieChartProps {
  data: CategoryBreakdownItem[]
  currency: string | null
  onCategoryClick?: (categoryId: string) => void
  bare?: boolean
}

export function ExpensePieChart({ data, currency, onCategoryClick, bare }: ExpensePieChartProps) {
  const grandTotal = data.reduce((sum, d) => sum + d.amount, 0)

  const chartData = {
    labels: data.map((d) => d.categoryName),
    datasets: [
      {
        data: data.map((d) => d.amount),
        backgroundColor: data.map((d) => d.color),
        borderColor: data.map((d) => d.color),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { label: string; parsed: number; dataset: { data: number[] } }) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const pct = ((context.parsed / total) * 100).toFixed(1)
            return ` ${context.label}: ${formatCurrencyOrPlain(context.parsed, currency)} (${pct}%)`
          },
        },
      },
    },
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0 && onCategoryClick) {
        onCategoryClick(data[elements[0].index].categoryId)
      }
    },
  }

  return (
    <ChartContainer title="Net Expenses by Category" empty={data.length === 0} bare={bare}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        <div className="h-72 w-72 shrink-0">
          <Doughnut data={chartData} options={options} />
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          {data.map((d) => {
            const pct = grandTotal > 0 ? ((d.amount / grandTotal) * 100).toFixed(1) : '0.0'
            return (
              <button
                key={d.categoryId}
                onClick={() => onCategoryClick?.(d.categoryId)}
                className="flex items-start gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{d.categoryName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrencyOrPlain(d.amount, currency)} ({pct}%)
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </ChartContainer>
  )
}

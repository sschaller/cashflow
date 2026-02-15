import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js'
import { ChartContainer } from './ChartContainer.tsx'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import type { CategoryBreakdownItem } from '@/types/charts.ts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface CategoryComparisonBarProps {
  data: CategoryBreakdownItem[]
  currency: string | null
  onCategoryClick?: (categoryId: number) => void
  bare?: boolean
}

export function CategoryComparisonBar({ data, currency, onCategoryClick, bare }: CategoryComparisonBarProps) {
  const top10 = data.slice(0, 10)

  const chartData = {
    labels: top10.map((d) => d.categoryName),
    datasets: [
      {
        data: top10.map((d) => d.amount),
        backgroundColor: top10.map((d) => d.color),
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            return ` ${formatCurrencyOrPlain(context.parsed.x ?? 0, currency)}`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatCurrencyOrPlain(Number(value), currency),
        },
      },
      y: {
        grid: { display: false },
      },
    },
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0 && onCategoryClick) {
        onCategoryClick(top10[elements[0].index].categoryId)
      }
    },
  }

  return (
    <ChartContainer title="Category Comparison" empty={top10.length === 0} bare={bare}>
      <div style={{ height: Math.max(200, top10.length * 40) }}>
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  )
}

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js'
import { ChartContainer } from './ChartContainer.tsx'
import { format, parseISO } from 'date-fns'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import type { MonthlyCategoryTotal } from '@/types/charts.ts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface CategoryStackedBarProps {
  data: MonthlyCategoryTotal[]
  currency: string | null
  onSegmentClick?: (categoryId: string, month: string) => void
  bare?: boolean
}

export function CategoryStackedBar({ data, currency, onSegmentClick, bare }: CategoryStackedBarProps) {
  // Collect all unique categories across all months
  const categoryMap = new Map<string, { name: string; color: string }>()
  for (const m of data) {
    for (const c of m.categories) {
      if (!categoryMap.has(c.categoryId)) {
        categoryMap.set(c.categoryId, { name: c.categoryName, color: c.color })
      }
    }
  }

  const categories = Array.from(categoryMap.entries())
  const labels = data.map((d) => format(parseISO(d.month + '-01'), 'MMM yyyy'))

  const datasets = categories.map(([catId, { name, color }]) => ({
    label: name,
    data: data.map((m) => {
      const cat = m.categories.find((c) => c.categoryId === catId)
      return cat?.amount ?? 0
    }),
    backgroundColor: color,
    borderRadius: 2,
  }))

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            return ` ${context.dataset.label}: ${formatCurrencyOrPlain(context.parsed.y ?? 0, currency)}`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatCurrencyOrPlain(Number(value), currency),
        },
      },
    },
    onClick: (_event: unknown, elements: Array<{ datasetIndex: number; index: number }>) => {
      if (elements.length > 0 && onSegmentClick) {
        const { datasetIndex, index } = elements[0]
        const catId = categories[datasetIndex][0]
        const month = data[index].month
        onSegmentClick(catId, month)
      }
    },
  }

  return (
    <ChartContainer title="Categories Over Time" empty={data.length === 0} bare={bare}>
      <div className="h-80">
        <Bar data={{ labels, datasets }} options={options} />
      </div>
    </ChartContainer>
  )
}

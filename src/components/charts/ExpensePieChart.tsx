import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { ChartContainer } from './ChartContainer.tsx'
import type { CategoryBreakdownItem } from '@/types/charts.ts'

ChartJS.register(ArcElement, Tooltip, Legend)

interface ExpensePieChartProps {
  data: CategoryBreakdownItem[]
  onCategoryClick?: (categoryId: number) => void
}

export function ExpensePieChart({ data, onCategoryClick }: ExpensePieChartProps) {
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
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { label: string; parsed: number; dataset: { data: number[] } }) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const pct = ((context.parsed / total) * 100).toFixed(1)
            return ` ${context.label}: $${context.parsed.toFixed(2)} (${pct}%)`
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
    <ChartContainer title="Expenses by Category" empty={data.length === 0}>
      <div className="h-80">
        <Doughnut data={chartData} options={options} />
      </div>
    </ChartContainer>
  )
}

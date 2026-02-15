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
import type { MonthlyTotal } from '@/types/charts.ts'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface IncomeExpenseBarProps {
  data: MonthlyTotal[]
  currency: string | null
  onMonthClick?: (month: string) => void
  bare?: boolean
}

export function IncomeExpenseBar({ data, currency, onMonthClick, bare }: IncomeExpenseBarProps) {
  const chartData = {
    labels: data.map((d) => format(parseISO(d.month + '-01'), 'MMM yyyy')),
    datasets: [
      {
        label: 'Income',
        data: data.map((d) => d.income),
        backgroundColor: '#4CAF50',
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: data.map((d) => d.expenses),
        backgroundColor: '#F44336',
        borderRadius: 4,
      },
    ],
  }

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
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatCurrencyOrPlain(Number(value), currency),
        },
      },
    },
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0 && onMonthClick) {
        onMonthClick(data[elements[0].index].month)
      }
    },
  }

  return (
    <ChartContainer title="Income vs Expenses" empty={data.length === 0} bare={bare}>
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  )
}

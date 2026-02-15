import { Card } from '@/components/ui/Card.tsx'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import type { DashboardSummary } from '@/types/charts.ts'

interface SummaryCardsProps {
  summary: DashboardSummary
  currency: string | null
}

export function SummaryCards({ summary, currency }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Income',
      value: formatCurrencyOrPlain(summary.totalIncome, currency),
      color: 'text-green-600',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
    },
    {
      label: 'Expenses',
      value: formatCurrencyOrPlain(summary.totalExpenses, currency),
      color: 'text-red-600',
      icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z',
    },
    {
      label: 'Net Savings',
      value: formatCurrencyOrPlain(summary.netSavings, currency),
      color: summary.netSavings >= 0 ? 'text-blue-600' : 'text-orange-600',
      icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    },
    {
      label: 'Top Category',
      value: summary.topCategory ? `${summary.topCategory.name}` : 'N/A',
      subtitle: summary.topCategory ? formatCurrencyOrPlain(summary.topCategory.amount, currency) : undefined,
      color: 'text-purple-600',
      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="flex items-center gap-4">
          <div className={`rounded-lg bg-gray-100 p-3 dark:bg-gray-700`}>
            <svg className={`h-6 w-6 ${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.subtitle}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

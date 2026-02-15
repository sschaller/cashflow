import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card.tsx'

interface ChartContainerProps {
  title: string
  children: ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  className?: string
  bare?: boolean
}

export function ChartContainer({ title, children, loading, empty, emptyMessage = 'No data available', className = '', bare }: ChartContainerProps) {
  const content = loading ? (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  ) : empty ? (
    <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
      <p>{emptyMessage}</p>
    </div>
  ) : (
    <div className="relative">{children}</div>
  )

  if (bare) return content

  return (
    <Card className={className}>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      {content}
    </Card>
  )
}

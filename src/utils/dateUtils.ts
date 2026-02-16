import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy')
}

export function formatMonth(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM yyyy')
}

export function formatMonthShort(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM')
}

export function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date()

  switch (preset) {
    case 'this-month': {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    case 'last-month': {
      const lastMonth = subMonths(now, 1)
      const start = startOfMonth(lastMonth)
      const end = endOfMonth(lastMonth)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    case 'last-3-months': {
      const start = startOfMonth(subMonths(now, 2))
      const end = endOfMonth(now)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    case 'last-6-months': {
      const start = startOfMonth(subMonths(now, 5))
      const end = endOfMonth(now)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    case 'last-12-months': {
      const start = startOfMonth(subMonths(now, 11))
      const end = endOfMonth(now)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    case 'this-year': {
      const start = startOfYear(now)
      const end = endOfYear(now)
      return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
    }
    default: {
      const yearMatch = preset.match(/^year-(\d{4})$/)
      if (yearMatch) {
        const year = new Date(Number(yearMatch[1]), 0, 1)
        return { start: format(startOfYear(year), 'yyyy-MM-dd'), end: format(endOfYear(year), 'yyyy-MM-dd') }
      }
      return { start: format(startOfMonth(subMonths(now, 11)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
    }
  }
}

export interface DateRangePreset {
  label: string
  value: string
  group: 'period' | 'year'
}

export function getDateRangePresets(): DateRangePreset[] {
  const currentYear = new Date().getFullYear()
  const periods: DateRangePreset[] = [
    { label: 'This Month', value: 'this-month', group: 'period' },
    { label: 'Last Month', value: 'last-month', group: 'period' },
    { label: '3 Months', value: 'last-3-months', group: 'period' },
    { label: '6 Months', value: 'last-6-months', group: 'period' },
    { label: '12 Months', value: 'last-12-months', group: 'period' },
  ]
  const years: DateRangePreset[] = Array.from({ length: 4 }, (_, i) => {
    const year = currentYear - i
    return { label: `${year}`, value: `year-${year}`, group: 'year' as const }
  })
  return [...periods, ...years]
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

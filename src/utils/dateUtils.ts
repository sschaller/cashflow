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
    default:
      return { start: format(startOfMonth(subMonths(now, 11)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
  }
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

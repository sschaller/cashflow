import { parse, isValid, format } from 'date-fns'
import type { ColumnMapping, AmountConfig } from '@/types/models.ts'
import type { ParsedRow } from './types.ts'

export interface MappedTransaction {
  date: string
  amount: number
  description: string
  normalizedDescription: string
  bankCategory?: string
}

const commonDateFormats = [
  'yyyy-MM-dd',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'M/d/yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'dd.MM.yyyy',
  'MM-dd-yyyy',
]

export function parseDate(value: string, dateFormat: string): string | null {
  // Try the specified format first
  const parsed = parse(value.trim(), dateFormat, new Date())
  if (isValid(parsed)) {
    return format(parsed, 'yyyy-MM-dd')
  }

  // Try ISO format directly
  const isoDate = new Date(value.trim())
  if (isValid(isoDate) && value.includes('-')) {
    return format(isoDate, 'yyyy-MM-dd')
  }

  // Try common formats
  for (const fmt of commonDateFormats) {
    const attempt = parse(value.trim(), fmt, new Date())
    if (isValid(attempt)) {
      return format(attempt, 'yyyy-MM-dd')
    }
  }

  return null
}

export function parseAmount(value: string, config: AmountConfig): number | null {
  if (!value || value.trim() === '') return null

  let cleaned = value.trim()

  // Remove thousands separator
  if (config.thousandsSeparator) {
    cleaned = cleaned.split(config.thousandsSeparator).join('')
  }

  // Replace decimal separator with .
  if (config.decimalSeparator && config.decimalSeparator !== '.') {
    cleaned = cleaned.replace(config.decimalSeparator, '.')
  }

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[^0-9.\-+]/g, '')

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function mapRow(
  row: ParsedRow,
  mapping: ColumnMapping,
  dateFormat: string,
  amountConfig: AmountConfig
): MappedTransaction | null {
  const dateStr = row[mapping.date]
  if (!dateStr) return null

  const date = parseDate(dateStr, dateFormat)
  if (!date) return null

  let amount: number | null = null

  if (amountConfig.mode === 'single') {
    amount = parseAmount(row[mapping.amount] ?? '', amountConfig)
    if (amount !== null && !amountConfig.negativeExpenses) {
      // Positive amounts are expenses in this file — flip the sign
      amount = -amount
    }
  } else {
    // Split mode: separate income/expense columns
    const amountIn = parseAmount(row[mapping.amountIn ?? ''] ?? '', amountConfig)
    const amountOut = parseAmount(row[mapping.amountOut ?? ''] ?? '', amountConfig)
    if (amountIn !== null && amountIn !== 0) {
      amount = Math.abs(amountIn)
    } else if (amountOut !== null && amountOut !== 0) {
      amount = -Math.abs(amountOut)
    } else {
      amount = 0
    }
  }

  if (amount === null) return null

  const description = row[mapping.description] ?? ''
  const rawCategory = mapping.category ? row[mapping.category]?.trim() : undefined
  const bankCategory = rawCategory || undefined

  return {
    date,
    amount,
    description: description.trim(),
    normalizedDescription: description.trim().toLowerCase(),
    bankCategory,
  }
}

// Auto-detect which columns map to date, amount, description
export function autoDetectMapping(headers: string[], sampleRows: ParsedRow[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}

  const lower = headers.map((h) => h.toLowerCase())

  // Detect date
  const dateKeywords = ['date', 'datum', 'fecha', 'data', 'transaction date', 'posted date', 'booking date']
  for (let i = 0; i < lower.length; i++) {
    if (dateKeywords.some((kw) => lower[i].includes(kw))) {
      mapping.date = headers[i]
      break
    }
  }

  // Detect amount
  const amountKeywords = ['amount', 'betrag', 'sum', 'value', 'total']
  for (let i = 0; i < lower.length; i++) {
    if (amountKeywords.some((kw) => lower[i].includes(kw))) {
      mapping.amount = headers[i]
      break
    }
  }

  // Detect description
  const descKeywords = ['description', 'memo', 'payee', 'narrative', 'details', 'reference', 'text', 'name']
  for (let i = 0; i < lower.length; i++) {
    if (descKeywords.some((kw) => lower[i].includes(kw))) {
      mapping.description = headers[i]
      break
    }
  }

  // Detect category
  const categoryKeywords = ['category', 'pfm', 'merchant category']
  for (let i = 0; i < lower.length; i++) {
    if (categoryKeywords.some((kw) => lower[i].includes(kw))) {
      mapping.category = headers[i]
      break
    }
  }

  // Validate with sample data
  if (mapping.date && sampleRows.length > 0) {
    const sampleDate = sampleRows[0][mapping.date]
    if (sampleDate && !parseDate(sampleDate, 'yyyy-MM-dd')) {
      // Try to detect date format from sample
    }
  }

  return mapping
}

export function autoDetectDateFormat(sampleValues: string[]): string {
  for (const fmt of commonDateFormats) {
    const allValid = sampleValues.slice(0, 5).every((v) => {
      const parsed = parse(v.trim(), fmt, new Date())
      return isValid(parsed)
    })
    if (allValid) return fmt
  }
  return 'yyyy-MM-dd'
}

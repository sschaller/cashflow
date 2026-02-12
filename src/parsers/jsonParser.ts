import type { Parser, ParseResult, ParsedRow } from './types.ts'

export const jsonParser: Parser = {
  name: 'JSON',
  extensions: ['.json'],

  async parse(content: string): Promise<ParseResult> {
    const errors: string[] = []

    let data: unknown
    try {
      data = JSON.parse(content)
    } catch {
      return { headers: [], rows: [], rowCount: 0, errors: ['Invalid JSON'] }
    }

    // Handle array of objects
    let rows: ParsedRow[]
    if (Array.isArray(data)) {
      rows = data.map((item) => {
        const row: ParsedRow = {}
        for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
          row[key] = String(value ?? '')
        }
        return row
      })
    } else if (typeof data === 'object' && data !== null) {
      // Try to find an array property
      const obj = data as Record<string, unknown>
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]))
      if (arrayKey) {
        const arr = obj[arrayKey] as unknown[]
        rows = arr.map((item) => {
          const row: ParsedRow = {}
          for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
            row[key] = String(value ?? '')
          }
          return row
        })
      } else {
        errors.push('No array found in JSON object')
        return { headers: [], rows: [], rowCount: 0, errors }
      }
    } else {
      errors.push('JSON must be an array or object')
      return { headers: [], rows: [], rowCount: 0, errors }
    }

    const headers = rows.length > 0 ? Object.keys(rows[0]) : []

    return {
      headers,
      rows,
      rowCount: rows.length,
      errors,
    }
  },
}

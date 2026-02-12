import Papa from 'papaparse'
import type { Parser, ParseResult, ParsedRow } from './types.ts'

export const csvParser: Parser = {
  name: 'CSV',
  extensions: ['.csv', '.tsv'],

  async parse(content: string, skipRows: number = 0): Promise<ParseResult> {
    return new Promise((resolve) => {
      const errors: string[] = []

      // Skip leading rows by stripping lines from the content
      let processedContent = content
      if (skipRows > 0) {
        const lines = content.split(/\r?\n/)
        processedContent = lines.slice(skipRows).join('\n')
      }

      const result = Papa.parse(processedContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      })

      if (result.errors.length > 0) {
        for (const err of result.errors) {
          errors.push(`Row ${err.row}: ${err.message}`)
        }
      }

      const headers = (result.meta.fields ?? []).filter((h) => h.length > 0)
      const headerCount = headers.length

      // Filter out rows that don't have enough populated columns
      // (catches junk rows at the end with fewer fields)
      const rows = (result.data as ParsedRow[]).filter((row) => {
        const populated = headers.filter((h) => row[h] !== undefined && row[h] !== '').length
        return populated >= Math.ceil(headerCount / 2)
      })

      resolve({
        headers,
        rows,
        rowCount: rows.length,
        errors,
      })
    })
  },
}

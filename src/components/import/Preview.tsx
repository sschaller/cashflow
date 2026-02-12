import type { ParseResult } from '@/parsers/types.ts'
import type { ColumnMapping, AmountConfig } from '@/types/models.ts'
import { mapRow } from '@/parsers/columnMapper.ts'
import { formatCurrency } from '@/utils/currencyUtils.ts'

interface ImportPreviewProps {
  parseResult: ParseResult
  columnMapping: ColumnMapping
  dateFormat: string
  amountConfig: AmountConfig
}

export function ImportPreview({ parseResult, columnMapping, dateFormat, amountConfig }: ImportPreviewProps) {
  const previewRows = parseResult.rows.slice(0, 20).map((row, i) => ({
    index: i,
    raw: row,
    mapped: mapRow(row, columnMapping, dateFormat, amountConfig),
  }))

  const validCount = previewRows.filter((r) => r.mapped).length
  const errorCount = previewRows.length - validCount

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing first {previewRows.length} of {parseResult.rowCount} rows.{' '}
        <span className="text-green-600">{validCount} valid</span>
        {errorCount > 0 && <>, <span className="text-red-600">{errorCount} errors</span></>}
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">#</th>
              <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Date</th>
              <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Description</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
              <th className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr key={row.index} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-3 py-2 text-gray-500">{row.index + 1}</td>
                {row.mapped ? (
                  <>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.mapped.date}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-gray-700 dark:text-gray-300">{row.mapped.description}</td>
                    <td className={`px-3 py-2 text-right font-mono ${row.mapped.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.mapped.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        OK
                      </span>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 text-gray-400" colSpan={3}>
                      Could not parse: {JSON.stringify(row.raw).slice(0, 80)}...
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Error
                      </span>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

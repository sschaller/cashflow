import type { ColumnMapping, AmountConfig, Account } from '@/types/models.ts'
import type { ParsedRow } from '@/parsers/types.ts'
import { useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'

interface ColumnMappingStepProps {
  headers: string[]
  sampleRows: ParsedRow[]
  columnMapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
  dateFormat: string
  onDateFormatChange: (format: string) => void
  amountConfig: AmountConfig
  onAmountConfigChange: (config: AmountConfig) => void
  accounts: Account[]
  selectedAccountId: number | null
  onAccountChange: (id: number | null) => void
  onCreateAccount: (name: string) => Promise<void>
}

export function ColumnMappingStep({
  headers,
  sampleRows,
  columnMapping,
  onMappingChange,
  dateFormat,
  onDateFormatChange,
  amountConfig,
  onAmountConfigChange,
  accounts,
  selectedAccountId,
  onAccountChange,
  onCreateAccount,
}: ColumnMappingStepProps) {
  const [newAccountName, setNewAccountName] = useState('')

  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
  const inputClass = selectClass

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    onMappingChange({ ...columnMapping, [field]: value })
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Map Columns</h2>

      {/* Account selection */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Account</label>
        {accounts.length > 0 ? (
          <select
            className={selectClass}
            value={selectedAccountId ?? ''}
            onChange={(e) => onAccountChange(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ) : null}
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass}
            placeholder="New account name..."
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={!newAccountName.trim()}
            onClick={async () => {
              await onCreateAccount(newAccountName.trim())
              setNewAccountName('')
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Column mapping */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date Column <span className="text-red-500">*</span>
          </label>
          <select className={selectClass} value={columnMapping.date} onChange={(e) => updateMapping('date', e.target.value)}>
            <option value="">Select...</option>
            {headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount Column <span className="text-red-500">*</span>
          </label>
          <select
            className={selectClass}
            value={amountConfig.mode === 'single' ? columnMapping.amount : ''}
            onChange={(e) => updateMapping('amount', e.target.value)}
            disabled={amountConfig.mode === 'split'}
          >
            <option value="">Select...</option>
            {headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description Column <span className="text-red-500">*</span>
          </label>
          <select className={selectClass} value={columnMapping.description} onChange={(e) => updateMapping('description', e.target.value)}>
            <option value="">Select...</option>
            {headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount mode toggle */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Format</label>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="radio"
                checked={amountConfig.mode === 'single'}
                onChange={() => onAmountConfigChange({ ...amountConfig, mode: 'single' })}
              />
              Single column
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="radio"
                checked={amountConfig.mode === 'split'}
                onChange={() => onAmountConfigChange({ ...amountConfig, mode: 'split' })}
              />
              Separate income/expense columns
            </label>
          </div>

          {amountConfig.mode === 'single' && (
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Expense sign convention</label>
              <select
                className={selectClass}
                value={amountConfig.negativeExpenses ? 'negative' : 'positive'}
                onChange={(e) => onAmountConfigChange({ ...amountConfig, negativeExpenses: e.target.value === 'negative' })}
              >
                <option value="negative">Negative amounts are expenses (e.g. -50.00)</option>
                <option value="positive">Positive amounts are expenses (e.g. 50.00)</option>
              </select>
            </div>
          )}
        </div>

        {amountConfig.mode === 'split' && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Income column</label>
              <select className={selectClass} value={columnMapping.amountIn ?? ''} onChange={(e) => updateMapping('amountIn', e.target.value)}>
                <option value="">Select...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Expense column</label>
              <select className={selectClass} value={columnMapping.amountOut ?? ''} onChange={(e) => updateMapping('amountOut', e.target.value)}>
                <option value="">Select...</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Date format */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date Format</label>
        <select className={selectClass} value={dateFormat} onChange={(e) => onDateFormatChange(e.target.value)}>
          <option value="yyyy-MM-dd">yyyy-MM-dd (2024-01-15)</option>
          <option value="MM/dd/yyyy">MM/dd/yyyy (01/15/2024)</option>
          <option value="dd/MM/yyyy">dd/MM/yyyy (15/01/2024)</option>
          <option value="M/d/yyyy">M/d/yyyy (1/15/2024)</option>
          <option value="dd-MM-yyyy">dd-MM-yyyy (15-01-2024)</option>
          <option value="dd.MM.yyyy">dd.MM.yyyy (15.01.2024)</option>
        </select>
      </div>

      {/* Sample data preview */}
      {sampleRows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Sample Data</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    {headers.map((h) => (
                      <td key={h} className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

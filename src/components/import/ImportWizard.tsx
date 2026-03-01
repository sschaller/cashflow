import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { Card } from '@/components/ui/Card.tsx'
import { FileDropzone } from '@/components/ui/FileDropzone.tsx'
import { ColumnMappingStep } from './ColumnMapping.tsx'
import { ImportPreview } from './Preview.tsx'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { getParserForFile } from '@/parsers/index.ts'
import { autoDetectMapping, autoDetectDateFormat } from '@/parsers/columnMapper.ts'
import { readFileAsText } from '@/utils/fileHelpers.ts'
import { findOptimalSkipRows } from '@/parsers/autoSkipDetect.ts'
import { importTransactions } from '@/services/importService.ts'
import type { ParseResult } from '@/parsers/types.ts'
import type { ColumnMapping, AmountConfig, Account } from '@/types/models.ts'
import type { ImportResult } from '@/services/importService.ts'
import toast from 'react-hot-toast'

const steps = ['Upload', 'Map Columns', 'Preview', 'Result']

export function ImportWizard() {
  const repos = useRepositories()
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    description: '',
  })
  const [dateFormat, setDateFormat] = useState('yyyy-MM-dd')
  const [amountConfig, setAmountConfig] = useState<AmountConfig>({
    mode: 'single',
    negativeExpenses: true,
    decimalSeparator: '.',
    thousandsSeparator: ',',
  })
  const [skipRows, setSkipRows] = useState(0)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    repos.accounts.getAll().then(setAccounts)
  }, [repos])

  const parseWithSkip = async (content: string, filename: string, skip: number) => {
    const parser = getParserForFile(filename)
    if (!parser) {
      toast.error('Unsupported file format')
      return
    }

    const result = await parser.parse(content, skip)

    if (result.errors.length > 0) {
      toast.error(`Parsing warnings: ${result.errors.length}`)
    }

    setParseResult(result)

    // Auto-detect column mapping
    const detected = autoDetectMapping(result.headers, result.rows)
    setColumnMapping((prev) => ({
      ...prev,
      ...detected,
    }))

    // Auto-detect date format
    if (detected.date && result.rows.length > 0) {
      const sampleDates = result.rows.slice(0, 5).map((r) => r[detected.date!]).filter(Boolean)
      if (sampleDates.length > 0) {
        setDateFormat(autoDetectDateFormat(sampleDates))
      }
    }
  }

  const handleFile = async (f: File) => {
    setFile(f)
    const content = await readFileAsText(f)
    setFileContent(content)
    const optimalSkip = await findOptimalSkipRows(content, f.name)
    setSkipRows(optimalSkip)
    await parseWithSkip(content, f.name, optimalSkip)
    setStep(1)
  }

  const handleSkipRowsChange = async (value: number) => {
    setSkipRows(value)
    if (fileContent && file) {
      await parseWithSkip(fileContent, file.name, value)
    }
  }

  const handleImport = async () => {
    if (!parseResult || !selectedAccountId) return

    setImporting(true)
    try {
      const result = await importTransactions(parseResult, {
        accountId: selectedAccountId,
        columnMapping,
        dateFormat,
        amountConfig,
      }, repos)
      setImportResult(result)
      setStep(3)
      toast.success(`Imported ${result.imported} transactions`)
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setStep(0)
    setFile(null)
    setFileContent(null)
    setParseResult(null)
    setImportResult(null)
    setSkipRows(0)
    setColumnMapping({ date: '', amount: '', description: '' })
  }

  const canProceed = () => {
    switch (step) {
      case 0: return !!parseResult
      case 1: return !!columnMapping.date && !!columnMapping.amount && !!columnMapping.description && !!selectedAccountId
      case 2: return true
      default: return false
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {i < step ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-sm ${i <= step ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px w-12 ${i < step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        {step === 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Upload File</h2>
            <FileDropzone onFile={handleFile} />
            {file && fileContent && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selected: <span className="font-medium">{file.name}</span> ({parseResult?.rowCount ?? 0} rows)
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Skip rows at start
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      value={skipRows}
                      onChange={(e) => handleSkipRowsChange(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Skip junk rows before the column headers
                    </span>
                  </div>
                </div>

                {/* Raw file preview */}
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Raw file preview</p>
                  <div className="max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-50 font-mono text-xs dark:border-gray-700 dark:bg-gray-900">
                    {fileContent.split(/\r?\n/).slice(0, 15).map((line, i) => (
                      <div
                        key={i}
                        className={`flex border-b border-gray-100 dark:border-gray-800 ${
                          i < skipRows ? 'bg-red-50 text-gray-400 line-through dark:bg-red-900/10' : ''
                        }`}
                      >
                        <span className="w-8 shrink-0 select-none border-r border-gray-200 px-1.5 py-1 text-right text-gray-400 dark:border-gray-700">
                          {i + 1}
                        </span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-gray-700 dark:text-gray-300">
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                  {skipRows > 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      {skipRows} row{skipRows > 1 ? 's' : ''} will be skipped (shown struck-through)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && parseResult && (
          <ColumnMappingStep
            headers={parseResult.headers}
            sampleRows={parseResult.rows.slice(0, 3)}
            columnMapping={columnMapping}
            onMappingChange={setColumnMapping}
            dateFormat={dateFormat}
            onDateFormatChange={setDateFormat}
            amountConfig={amountConfig}
            onAmountConfigChange={setAmountConfig}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
            onCreateAccount={async (name) => {
              const id = await repos.accounts.add({
                name,
                type: 'checking',
                institution: '',
                currency: 'USD',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
              const updated = await repos.accounts.getAll()
              setAccounts(updated)
              setSelectedAccountId(id)
            }}
          />
        )}

        {step === 2 && parseResult && (
          <ImportPreview
            parseResult={parseResult}
            columnMapping={columnMapping}
            dateFormat={dateFormat}
            amountConfig={amountConfig}
            currency={accounts.find((a) => a.id === selectedAccountId)?.currency}
          />
        )}

        {step === 3 && importResult && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Import Complete</h2>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>Imported: <span className="font-medium text-green-600">{importResult.imported}</span></p>
              <p>Duplicates skipped: <span className="font-medium text-yellow-600">{importResult.duplicates}</span></p>
              {importResult.errors > 0 && (
                <p>Errors: <span className="font-medium text-red-600">{importResult.errors}</span></p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="secondary"
          onClick={step === 3 ? reset : () => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          {step === 3 ? 'Import More' : 'Back'}
        </Button>

        {step < 3 && (
          <Button
            onClick={step === 2 ? handleImport : () => setStep(step + 1)}
            disabled={!canProceed() || importing}
          >
            {importing ? 'Importing...' : step === 2 ? 'Import' : 'Next'}
          </Button>
        )}
      </div>
    </div>
  )
}

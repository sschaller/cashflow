import { useState, useCallback } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { getParserForFile } from '@/parsers/index.ts'
import { readFileAsText } from '@/utils/fileHelpers.ts'
import { importTransactions, type ImportOptions, type ImportResult } from '@/services/importService.ts'
import type { ParseResult } from '@/parsers/types.ts'

interface UseImportReturn {
  parseResult: ParseResult | null
  importResult: ImportResult | null
  loading: boolean
  error: string | null
  parseFile: (file: File) => Promise<ParseResult | null>
  runImport: (parseResult: ParseResult, options: ImportOptions) => Promise<ImportResult>
  reset: () => void
}

export function useImport(): UseImportReturn {
  const repos = useRepositories()
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseFile = useCallback(async (file: File): Promise<ParseResult | null> => {
    setLoading(true)
    setError(null)

    const parser = getParserForFile(file.name)
    if (!parser) {
      setError('Unsupported file format')
      setLoading(false)
      return null
    }

    try {
      const content = await readFileAsText(file)
      const result = await parser.parse(content)
      setParseResult(result)
      setLoading(false)
      return result
    } catch {
      setError('Failed to parse file')
      setLoading(false)
      return null
    }
  }, [])

  const runImport = useCallback(async (pr: ParseResult, options: ImportOptions): Promise<ImportResult> => {
    setLoading(true)
    setError(null)

    try {
      const result = await importTransactions(pr, options, repos)
      setImportResult(result)
      setLoading(false)
      return result
    } catch {
      setError('Import failed')
      setLoading(false)
      throw new Error('Import failed')
    }
  }, [repos])

  const reset = useCallback(() => {
    setParseResult(null)
    setImportResult(null)
    setLoading(false)
    setError(null)
  }, [])

  return { parseResult, importResult, loading, error, parseFile, runImport, reset }
}

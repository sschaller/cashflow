import type { RepositoryProvider } from '@/repositories/interfaces.ts'

export interface ExportData {
  version: 1
  exportedAt: string
  accounts: unknown[]
  transactions: unknown[]
  categories: unknown[]
  rules: unknown[]
  importProfiles: unknown[]
}

export async function exportAllData(repos: RepositoryProvider): Promise<ExportData> {
  const [accounts, transactions, categories, rules, importProfiles] = await Promise.all([
    repos.accounts.getAll(),
    repos.transactions.getAll(),
    repos.categories.getAll(),
    repos.rules.getAll(),
    repos.importProfiles.getAll(),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    rules,
    importProfiles,
  }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

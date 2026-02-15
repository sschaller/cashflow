import { db } from '@/db/index.ts'

export interface ExportData {
  version: 1
  exportedAt: string
  accounts: unknown[]
  transactions: unknown[]
  categories: unknown[]
  rules: unknown[]
  importProfiles: unknown[]
}

export async function exportAllData(): Promise<ExportData> {
  // Read directly from DB so soft-deleted records (tombstones) are included
  const [accounts, transactions, categories, rules, importProfiles] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.rules.toArray(),
    db.importProfiles.toArray(),
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

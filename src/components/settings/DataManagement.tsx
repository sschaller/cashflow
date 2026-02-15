import { useRef } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { exportAllData, downloadJSON } from '@/services/exportService.ts'
import { db } from '@/db/index.ts'
import { seedDefaultCategories } from '@/db/seed.ts'
import { readFileAsText } from '@/utils/fileHelpers.ts'
import type { Account, Transaction, Category, Rule, ImportProfile } from '@/types/models.ts'
import toast from 'react-hot-toast'

export function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const data = await exportAllData()
    const date = new Date().toISOString().split('T')[0]
    downloadJSON(data, `finance-backup-${date}.json`)
    toast.success('Backup exported')
  }

  const handleImportBackup = async (file: File) => {
    try {
      const content = await readFileAsText(file)
      const data = JSON.parse(content) as {
        version: number
        accounts?: Account[]
        transactions?: Transaction[]
        categories?: Category[]
        rules?: Rule[]
        importProfiles?: ImportProfile[]
      }

      if (data.version !== 1) {
        toast.error('Unsupported backup version')
        return
      }

      // Clear existing data and restore
      await db.accounts.clear()
      await db.transactions.clear()
      await db.categories.clear()
      await db.rules.clear()
      await db.importProfiles.clear()

      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts)
      if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions)
      if (data.categories?.length) await db.categories.bulkAdd(data.categories)
      if (data.rules?.length) await db.rules.bulkAdd(data.rules)
      if (data.importProfiles?.length) await db.importProfiles.bulkAdd(data.importProfiles)

      toast.success('Backup restored')
    } catch {
      toast.error('Failed to restore backup')
    }
  }

  const handleClearAll = async () => {
    if (!confirm('This will delete ALL data. Are you sure?')) return

    await db.accounts.clear()
    await db.transactions.clear()
    await db.categories.clear()
    await db.rules.clear()
    await db.importProfiles.clear()

    // Re-seed default categories
    await seedDefaultCategories()

    toast.success('All data cleared')
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Data Management</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Export Backup</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Download all data as JSON</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleExport}>Export</Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Restore Backup</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Replace all data from a backup file</p>
          </div>
          <div>
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImportBackup(file)
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-900/10">
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-400">Clear All Data</p>
            <p className="text-xs text-red-600 dark:text-red-500">Permanently delete all data</p>
          </div>
          <Button size="sm" variant="danger" onClick={handleClearAll}>Clear</Button>
        </div>
      </div>
    </div>
  )
}

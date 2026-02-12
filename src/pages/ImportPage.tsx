import { ImportWizard } from '@/components/import/ImportWizard.tsx'

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Import Transactions</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">Import transactions from CSV or JSON files</p>
      <ImportWizard />
    </div>
  )
}

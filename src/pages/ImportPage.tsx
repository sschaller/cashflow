import { usePageHeader } from '@/hooks/usePageHeader.ts'
import { ImportWizard } from '@/components/import/ImportWizard.tsx'

export default function ImportPage() {
  usePageHeader('Import Transactions')
  return (
    <div className="mx-auto max-w-4xl">
      <ImportWizard />
    </div>
  )
}

import { usePageHeader } from '@/hooks/usePageHeader.ts'
import { Card } from '@/components/ui/Card.tsx'
import { CategoryTree } from '@/components/categories/CategoryTree.tsx'
import { RuleManager } from '@/components/categories/RuleManager.tsx'
import { RuleTestPanel } from '@/components/categories/RuleTestPanel.tsx'

export default function CategoriesPage() {
  usePageHeader('Categories & Rules')
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CategoryTree />
        </Card>
        <div className="space-y-6">
          <Card>
            <RuleManager />
          </Card>
          <Card>
            <RuleTestPanel />
          </Card>
        </div>
      </div>
    </div>
  )
}

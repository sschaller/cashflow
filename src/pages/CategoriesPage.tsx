import { Card } from '@/components/ui/Card.tsx'
import { CategoryTree } from '@/components/categories/CategoryTree.tsx'
import { RuleManager } from '@/components/categories/RuleManager.tsx'
import { RuleTestPanel } from '@/components/categories/RuleTestPanel.tsx'

export default function CategoriesPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Categories & Rules</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">Manage categories and auto-categorization rules</p>

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

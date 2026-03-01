import { useState, useEffect } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Modal } from '@/components/ui/Modal.tsx'
import { RuleForm } from './RuleForm.tsx'
import { rerunRules } from '@/services/categorizationEngine.ts'
import type { Rule, Category } from '@/types/models.ts'
import toast from 'react-hot-toast'

export function RuleManager() {
  const repos = useRepositories()
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | undefined>(undefined)

  const load = async () => {
    const [r, c] = await Promise.all([repos.rules.getAll(), repos.categories.getAllWithHierarchy()])
    setRules(r)
    setCategories(c)
  }

  useEffect(() => { load() }, [repos])

  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Unknown'

  const handleSave = async (data: Omit<Rule, 'id'>) => {
    if (editingRule?.id) {
      await repos.rules.update(editingRule.id, data)
      toast.success('Rule updated')
    } else {
      await repos.rules.add(data)
      toast.success('Rule created')
    }
    const count = await rerunRules(repos)
    if (count > 0) {
      toast.success(`Re-categorized ${count} transaction${count === 1 ? '' : 's'}`)
    }
    setShowForm(false)
    setEditingRule(undefined)
    load()
  }

  const handleDelete = async (id: string) => {
    await repos.rules.delete(id)
    toast.success('Rule deleted')
    load()
  }

  const handleToggle = async (rule: Rule) => {
    await repos.rules.update(rule.id!, { isEnabled: !rule.isEnabled })
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Categorization Rules</h3>
        <Button size="sm" onClick={() => { setEditingRule(undefined); setShowForm(true) }}>
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No rules yet. Rules automatically assign categories to imported transactions.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                rule.isEnabled
                  ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  : 'border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900'
              }`}
            >
              <button
                onClick={() => handleToggle(rule)}
                className={`h-4 w-4 shrink-0 rounded border ${
                  rule.isEnabled ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {rule.isEnabled && (
                  <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.name}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    P{rule.priority}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {rule.conditions.map((c, i) => (
                    <span key={i}>
                      {i > 0 && ' AND '}
                      {c.field} {c.operator} "{c.value}"
                      {c.valueTo ? ` to "${c.valueTo}"` : ''}
                    </span>
                  ))}
                  {rule.categoryId !== undefined && <>{' → '}{getCategoryName(rule.categoryId)}</>}
                  {rule.displayDescription && <>{' → '}<span className="italic">"{rule.displayDescription}"</span></>}
                </div>
              </div>

              <button
                className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => { setEditingRule(rule); setShowForm(true) }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                className="rounded p-1 text-gray-400 hover:text-red-500"
                onClick={() => handleDelete(rule.id!)}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingRule(undefined) }} title={editingRule ? 'Edit Rule' : 'New Rule'} size="lg">
        <RuleForm
          rule={editingRule}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingRule(undefined) }}
        />
      </Modal>
    </div>
  )
}

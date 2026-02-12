import { useState, useEffect } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { categorizeTransaction } from '@/services/categorizationEngine.ts'
import type { Transaction, Rule, Category } from '@/types/models.ts'

export function RuleTestPanel() {
  const repos = useRepositories()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('-50')
  const [result, setResult] = useState<{ categoryName: string; ruleName: string } | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    Promise.all([repos.rules.getEnabled(), repos.categories.getAll()]).then(([r, c]) => {
      setRules(r)
      setCategories(c)
    })
  }, [repos])

  const handleTest = () => {
    const testTx: Transaction = {
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(amount) || 0,
      description,
      normalizedDescription: description.toLowerCase().trim(),
      accountId: 1,
      type: parseFloat(amount) >= 0 ? 'income' : 'expense',
      tags: [],
      notes: '',
      hash: '',
      isManualCategory: false,
      importedAt: new Date().toISOString(),
    }

    const categoryId = categorizeTransaction(testTx, rules)
    if (categoryId !== null) {
      const category = categories.find((c) => c.id === categoryId)
      const matchedRule = rules.find((r) => r.categoryId === categoryId)
      setResult({
        categoryName: category?.name ?? 'Unknown',
        ruleName: matchedRule?.name ?? 'Unknown rule',
      })
    } else {
      setResult(null)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Test Rules</h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Description</label>
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., WALMART GROCERY #1234"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Amount</label>
          <input
            className={inputClass}
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleTest}>Test</Button>

        {result !== null ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-900/20">
            <span className="font-medium text-green-700 dark:text-green-400">Match: {result.categoryName}</span>
            <span className="ml-2 text-green-600 dark:text-green-500">(rule: {result.ruleName})</span>
          </div>
        ) : result === null && description ? (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            No rule matched
          </div>
        ) : null}
      </div>
    </div>
  )
}

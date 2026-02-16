import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePageHeader } from '@/hooks/usePageHeader.ts'
import { useUncategorizedTransactions } from '@/hooks/useUncategorizedTransactions.ts'
import { useCategories } from '@/hooks/useCategories.ts'
import { useAccounts } from '@/hooks/useAccounts.ts'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { CategoryPicker, type CategoryPickerHandle } from '@/components/categorize/CategoryPicker.tsx'
import { RuleForm } from '@/components/categories/RuleForm.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { formatDate } from '@/utils/dateUtils.ts'
import { formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import { rerunRules } from '@/services/categorizationEngine.ts'
import type { Rule } from '@/types/models.ts'
import toast from 'react-hot-toast'

interface UndoEntry {
  transactionId: number
  previousCategoryId: undefined
  previousIsManual: false
}

export default function CategorizePage() {
  usePageHeader('Categorize')
  const repos = useRepositories()
  const uncategorized = useUncategorizedTransactions()
  const categories = useCategories()
  const accounts = useAccounts()
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set())
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])
  const [showRuleForm, setShowRuleForm] = useState(false)
  const pickerRef = useRef<CategoryPickerHandle>(null)
  const [totalAtStart] = useState<number | null>(null)
  const totalRef = useRef<number | null>(null)

  // Track total at start — set once when we first see uncategorized transactions
  const total = totalRef.current
  if (totalRef.current === null && uncategorized.length > 0) {
    totalRef.current = uncategorized.length
  }
  const effectiveTotal = total ?? totalAtStart ?? uncategorized.length

  const currentTx = uncategorized.find((t) => !skippedIds.has(t.id!)) ?? null
  const categorizedCount = effectiveTotal - uncategorized.length
  const progressPct = effectiveTotal > 0 ? (categorizedCount / effectiveTotal) * 100 : 0

  const currentAccount = currentTx
    ? accounts.find((a) => a.id === currentTx.accountId)
    : undefined
  const accountName = currentAccount?.name ?? 'Unknown'
  const currentCurrency = currentAccount?.currency ?? 'USD'

  const handleSelect = useCallback(
    async (categoryId: number) => {
      if (!currentTx) return
      setUndoStack((prev) => [
        ...prev,
        { transactionId: currentTx.id!, previousCategoryId: undefined, previousIsManual: false },
      ])
      await repos.transactions.update(currentTx.id!, { categoryId, isManualCategory: true })
      // Remove from skipped if it was there
      setSkippedIds((prev) => {
        const next = new Set(prev)
        next.delete(currentTx.id!)
        return next
      })
      const catName = categories.find((c) => c.id === categoryId)?.name ?? 'Unknown'
      toast.success(`Categorized as "${catName}"`)
    },
    [currentTx, repos.transactions, categories],
  )

  const handleSkip = useCallback(() => {
    if (!currentTx) return
    setSkippedIds((prev) => new Set(prev).add(currentTx.id!))
  }, [currentTx])

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return
    const entry = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    await repos.transactions.update(entry.transactionId, {
      categoryId: undefined,
      isManualCategory: false,
    })
    toast.success('Undo successful')
  }, [undoStack, repos.transactions])

  const handleSaveRule = async (rule: Omit<Rule, 'id'>) => {
    await repos.rules.add(rule)
    toast.success('Rule created')
    const count = await rerunRules(repos)
    if (count > 0) {
      toast.success(`Re-categorized ${count} transaction${count === 1 ? '' : 's'}`)
    }
    setShowRuleForm(false)
  }

  // Pre-fill rule from current transaction
  const prefillRule: Rule | undefined =
    showRuleForm && currentTx
      ? ({
          id: undefined,
          name: '',
          conditions: [
            {
              field: 'description',
              operator: 'contains',
              value: currentTx.normalizedDescription.split(/\s+/).slice(0, 3).join(' '),
            },
          ],
          categoryId: categories[0]?.id ?? 0,
          priority: 100,
          isEnabled: true,
        } as unknown as Rule)
      : undefined

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      // Allow shortcuts in search only for number keys
      const isSearchInput = target.hasAttribute('data-category-search')

      if (e.key === 'Escape') {
        setShowRuleForm(false)
        return
      }

      // Ctrl/Cmd+Z for undo — works even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }

      // Suppress other shortcuts when typing in non-search inputs or using modifier keys
      if (isInput && !isSearchInput) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Letter keys auto-focus the search input
      if (/^[a-z]$/i.test(e.key) && !isInput) {
        pickerRef.current?.focusSearch()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  // All done state
  if (uncategorized.length === 0 && effectiveTotal > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 text-6xl">&#10003;</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">All done!</h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          All {effectiveTotal} transactions have been categorized.
        </p>
        <Link to="/">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  // Empty state — no uncategorized transactions to begin with
  if (uncategorized.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          No uncategorized transactions
        </h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Import some transactions or they'll appear here when rules don't match.
        </p>
        <Link to="/import">
          <Button>Go to Import</Button>
        </Link>
      </div>
    )
  }

  // All remaining are skipped
  if (!currentTx) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          All remaining skipped
        </h1>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          {uncategorized.length} transactions were skipped.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setSkippedIds(new Set())}>
            Review Skipped
          </Button>
          <Link to="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {categorizedCount} of {effectiveTotal} categorized
        </p>
        <div className="flex gap-2">
          {undoStack.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleUndo}>
              Undo
              <kbd className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                ⌘Z
              </kbd>
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Transaction card */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentTx.displayDescription ?? currentTx.description}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(currentTx.date)} &middot; {accountName} ({currentCurrency})
            </p>
            {currentTx.bankCategory && (
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Bank: {currentTx.bankCategory}
              </p>
            )}
          </div>
          <p
            className={`text-xl font-bold font-mono ${
              currentTx.amount >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrencyOrPlain(currentTx.amount, null)}
          </p>
        </div>
      </div>

      {/* Rule form or category picker */}
      {showRuleForm ? (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Create Rule from Transaction
          </h2>
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">Creating a rule based on:</p>
            <p className="font-medium text-gray-900 dark:text-white">{currentTx.description}</p>
          </div>
          <RuleForm
            rule={prefillRule}
            categories={categories}
            onSave={handleSaveRule}
            onCancel={() => setShowRuleForm(false)}
          />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Choose a category
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRuleForm(true)}>
                Create Rule
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
            </div>
          </div>
          <CategoryPicker ref={pickerRef} key={currentTx.id} categories={categories} onSelect={handleSelect} />
        </div>
      )}
    </div>
  )
}

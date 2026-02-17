import { useFilterStore } from '@/stores/useFilterStore.ts'
import type { Category, Account } from '@/types/models.ts'
import { Button } from '@/components/ui/Button.tsx'

interface TransactionFiltersProps {
  categories: Category[]
  accounts: Account[]
}

export function TransactionFilters({ categories, accounts }: TransactionFiltersProps) {
  const filters = useFilterStore((s) => s.filters)
  const setFilter = useFilterStore((s) => s.setFilter)
  const resetFilters = useFilterStore((s) => s.resetFilters)

  const selectClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        className={`w-64 ${selectClass}`}
        placeholder="Search transactions..."
        value={filters.search ?? ''}
        onChange={(e) => setFilter('search', e.target.value || undefined)}
      />

      <select
        className={selectClass}
        value={filters.type ?? ''}
        onChange={(e) => setFilter('type', (e.target.value || undefined) as 'income' | 'expense' | 'transfer' | undefined)}
      >
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
        <option value="transfer">Transfer</option>
      </select>

      <select
        className={selectClass}
        value={filters.categoryId ?? ''}
        onChange={(e) => setFilter('categoryId', e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All categories</option>
        <option value="0">Uncategorized</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.accountId ?? ''}
        onChange={(e) => setFilter('accountId', e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}

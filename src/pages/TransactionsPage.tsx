import { useState, useEffect } from 'react'
import { usePageHeader } from '@/hooks/usePageHeader.ts'
import { useTransactions } from '@/hooks/useTransactions.ts'
import { useCategories } from '@/hooks/useCategories.ts'
import { useAccounts } from '@/hooks/useAccounts.ts'
import { useCurrencyLookup } from '@/hooks/useCurrencyLookup.ts'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { useUIStore } from '@/stores/useUIStore.ts'
import { useFilterStore } from '@/stores/useFilterStore.ts'
import { TransactionTable } from '@/components/transactions/TransactionTable.tsx'
import { TransactionFilters } from '@/components/transactions/TransactionFilters.tsx'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { rerunRules } from '@/services/categorizationEngine.ts'
import type { Transaction } from '@/types/models.ts'
import toast from 'react-hot-toast'

export default function TransactionsPage() {
  const repos = useRepositories()
  const transactions = useTransactions()
  const categories = useCategories()
  const accounts = useAccounts()
  const currencyMap = useCurrencyLookup(accounts)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  usePageHeader('Transactions')

  const startDate = useUIStore((s) => s.dateRangeStart)
  const endDate = useUIStore((s) => s.dateRangeEnd)
  const setFilters = useFilterStore((s) => s.setFilters)
  const resetFilters = useFilterStore((s) => s.resetFilters)

  useEffect(() => {
    setFilters({ startDate, endDate })
    return () => resetFilters()
  }, [startDate, endDate, setFilters, resetFilters])

  const handleCategoryChange = async (transactionId: string, categoryId: string | undefined) => {
    await repos.transactions.update(transactionId, { categoryId, isManualCategory: true })
  }

  const handleReRunRules = async () => {
    const count = await rerunRules(repos)
    toast.success(`Updated ${count} transactions`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{transactions.length} transactions</p>
        <Button variant="secondary" size="sm" onClick={handleReRunRules}>
          Re-run Rules
        </Button>
      </div>

      <div className="mb-4">
        <TransactionFilters categories={categories} accounts={accounts} />
      </div>

      <TransactionTable
        transactions={transactions}
        categories={categories}
        currencyMap={currencyMap}
        onSelect={setSelectedTx}
        onCategoryChange={handleCategoryChange}
      />

      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        categories={categories}
        currency={selectedTx ? (currencyMap.get(selectedTx.accountId) ?? 'USD') : undefined}
      />
    </div>
  )
}

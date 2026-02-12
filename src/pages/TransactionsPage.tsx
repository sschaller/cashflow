import { useState, useEffect } from 'react'
import { useTransactions } from '@/hooks/useTransactions.ts'
import { useCategories } from '@/hooks/useCategories.ts'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { TransactionTable } from '@/components/transactions/TransactionTable.tsx'
import { TransactionFilters } from '@/components/transactions/TransactionFilters.tsx'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { recategorizeTransactions } from '@/services/categorizationEngine.ts'
import type { Transaction, Account } from '@/types/models.ts'
import toast from 'react-hot-toast'

export default function TransactionsPage() {
  const repos = useRepositories()
  const transactions = useTransactions()
  const categories = useCategories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  useEffect(() => {
    repos.accounts.getAll().then(setAccounts)
  }, [repos])

  const handleReRunRules = async () => {
    const rules = await repos.rules.getEnabled()
    const updates = recategorizeTransactions(transactions, rules)

    let count = 0
    for (const [id, categoryId] of updates) {
      await repos.transactions.update(id, { categoryId })
      count++
    }

    toast.success(`Updated ${count} transactions`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{transactions.length} transactions</p>
        </div>
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
        onSelect={setSelectedTx}
      />

      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        categories={categories}
      />
    </div>
  )
}

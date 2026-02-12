import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { formatDate } from '@/utils/dateUtils.ts'
import { formatCurrency } from '@/utils/currencyUtils.ts'
import type { Transaction, Category } from '@/types/models.ts'
import toast from 'react-hot-toast'

interface TransactionDetailModalProps {
  transaction: Transaction | null
  onClose: () => void
  categories: Category[]
}

export function TransactionDetailModal({ transaction, onClose, categories }: TransactionDetailModalProps) {
  const repos = useRepositories()
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.categoryId)
      setNotes(transaction.notes)
      setTags(transaction.tags.join(', '))
    }
  }, [transaction])

  if (!transaction) return null

  const handleSave = async () => {
    const isManualCategory = categoryId !== transaction.categoryId
    await repos.transactions.update(transaction.id!, {
      categoryId,
      notes,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      isManualCategory: isManualCategory || transaction.isManualCategory,
    })
    toast.success('Transaction updated')
    onClose()
  }

  const handleDelete = async () => {
    await repos.transactions.delete(transaction.id!)
    toast.success('Transaction deleted')
    onClose()
  }

  const selectClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

  return (
    <Modal isOpen={!!transaction} onClose={onClose} title="Transaction Details" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Date</span>
            <p className="font-medium text-gray-900 dark:text-white">{formatDate(transaction.date)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Amount</span>
            <p className={`font-medium font-mono ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(transaction.amount)}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Description</span>
            <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
          <select
            className={selectClass}
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId !== null ? '  ' : ''}{c.name}
              </option>
            ))}
          </select>
          {transaction.isManualCategory && (
            <p className="mt-1 text-xs text-blue-500">Manually categorized (won't be overwritten by rules)</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            className={`${selectClass} h-20 resize-none`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
          <input
            className={selectClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated tags..."
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import { useFilterStore } from '@/stores/useFilterStore.ts'

export function useTransactions() {
  const filters = useFilterStore((s) => s.filters)

  const transactions = useLiveQuery(async () => {
    let collection = db.transactions.orderBy('date')

    let results = await collection.reverse().toArray()

    if (filters.accountId !== undefined) {
      results = results.filter((t) => t.accountId === filters.accountId)
    }
    if (filters.categoryId !== undefined) {
      if (filters.categoryId === 0) {
        results = results.filter((t) => t.categoryId == null)
      } else {
        results = results.filter((t) => t.categoryId === filters.categoryId)
      }
    }
    if (filters.type) {
      results = results.filter((t) => t.type === filters.type)
    }
    if (filters.startDate) {
      results = results.filter((t) => t.date >= filters.startDate!)
    }
    if (filters.endDate) {
      results = results.filter((t) => t.date <= filters.endDate!)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter((t) => t.normalizedDescription.includes(search))
    }

    return results
  }, [filters])

  return transactions ?? []
}

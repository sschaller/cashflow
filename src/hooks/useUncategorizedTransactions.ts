import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import type { Transaction } from '@/types/models.ts'

export function useUncategorizedTransactions(): Transaction[] {
  const transactions = useLiveQuery(async () => {
    const all = await db.transactions.orderBy('date').reverse().toArray()
    return all.filter((t) => t.categoryId === undefined)
  })
  return transactions ?? []
}

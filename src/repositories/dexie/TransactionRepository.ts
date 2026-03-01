import { db } from '@/db/index.ts'
import type { Transaction } from '@/types/models.ts'
import type { ITransactionRepository, TransactionFilters } from '@/repositories/interfaces.ts'

export class DexieTransactionRepository implements ITransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return db.transactions.toArray()
  }

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id)
  }

  async add(item: Omit<Transaction, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    await db.transactions.add({ ...item, id } as Transaction)
    return id
  }

  async bulkAdd(items: Omit<Transaction, 'id'>[]): Promise<string[]> {
    const withIds = items.map(item => ({ ...item, id: crypto.randomUUID() })) as Transaction[]
    await db.transactions.bulkAdd(withIds)
    return withIds.map(item => item.id!)
  }

  async update(id: string, changes: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id)
  }

  async count(): Promise<number> {
    return db.transactions.count()
  }

  async getByAccountId(accountId: string): Promise<Transaction[]> {
    return db.transactions.where('accountId').equals(accountId).toArray()
  }

  async getByCategoryId(categoryId: string): Promise<Transaction[]> {
    return db.transactions.where('categoryId').equals(categoryId).toArray()
  }

  async getByDateRange(start: string, end: string): Promise<Transaction[]> {
    return db.transactions.where('date').between(start, end, true, true).toArray()
  }

  async getByHash(hash: string): Promise<Transaction | undefined> {
    return db.transactions.where('hash').equals(hash).first()
  }

  async getFiltered(filters: TransactionFilters): Promise<Transaction[]> {
    let collection = db.transactions.toCollection()

    if (filters.accountId !== undefined) {
      collection = db.transactions.where('accountId').equals(filters.accountId)
    }

    let results = await collection.toArray()

    if (filters.categoryId !== undefined) {
      results = results.filter(t => t.categoryId === filters.categoryId)
    }
    if (filters.type) {
      results = results.filter(t => t.type === filters.type)
    }
    if (filters.startDate) {
      results = results.filter(t => t.date >= filters.startDate!)
    }
    if (filters.endDate) {
      results = results.filter(t => t.date <= filters.endDate!)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter(t =>
        t.normalizedDescription.includes(search) ||
        (t.displayDescription && t.displayDescription.toLowerCase().includes(search))
      )
    }
    if (filters.minAmount !== undefined) {
      results = results.filter(t => Math.abs(t.amount) >= filters.minAmount!)
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter(t => Math.abs(t.amount) <= filters.maxAmount!)
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(t => filters.tags!.some(tag => t.tags.includes(tag)))
    }

    return results.sort((a, b) => b.date.localeCompare(a.date))
  }
}

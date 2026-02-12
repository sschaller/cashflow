import { db } from '@/db/index.ts'
import type { Transaction } from '@/types/models.ts'
import type { ITransactionRepository, TransactionFilters } from '@/repositories/interfaces.ts'

export class DexieTransactionRepository implements ITransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return db.transactions.toArray()
  }

  async getById(id: number): Promise<Transaction | undefined> {
    return db.transactions.get(id)
  }

  async add(item: Omit<Transaction, 'id'>): Promise<number> {
    return db.transactions.add(item as Transaction)
  }

  async bulkAdd(items: Omit<Transaction, 'id'>[]): Promise<number[]> {
    const ids = await db.transactions.bulkAdd(items as Transaction[], { allKeys: true })
    return ids
  }

  async update(id: number, changes: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, changes)
  }

  async delete(id: number): Promise<void> {
    await db.transactions.delete(id)
  }

  async count(): Promise<number> {
    return db.transactions.count()
  }

  async getByAccountId(accountId: number): Promise<Transaction[]> {
    return db.transactions.where('accountId').equals(accountId).toArray()
  }

  async getByCategoryId(categoryId: number): Promise<Transaction[]> {
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
      results = results.filter(t => t.normalizedDescription.includes(search))
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

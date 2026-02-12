import { db } from '@/db/index.ts'
import type { Account } from '@/types/models.ts'
import type { IAccountRepository } from '@/repositories/interfaces.ts'

export class DexieAccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    return db.accounts.toArray()
  }

  async getById(id: number): Promise<Account | undefined> {
    return db.accounts.get(id)
  }

  async add(item: Omit<Account, 'id'>): Promise<number> {
    return db.accounts.add(item as Account)
  }

  async bulkAdd(items: Omit<Account, 'id'>[]): Promise<number[]> {
    return db.accounts.bulkAdd(items as Account[], { allKeys: true })
  }

  async update(id: number, changes: Partial<Account>): Promise<void> {
    await db.accounts.update(id, changes)
  }

  async delete(id: number): Promise<void> {
    await db.accounts.delete(id)
  }

  async count(): Promise<number> {
    return db.accounts.count()
  }

  async getActive(): Promise<Account[]> {
    return db.accounts.where('isActive').equals(1).toArray()
  }
}

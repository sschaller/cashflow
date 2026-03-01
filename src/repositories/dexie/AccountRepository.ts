import { db } from '@/db/index.ts'
import type { Account } from '@/types/models.ts'
import type { IAccountRepository } from '@/repositories/interfaces.ts'

export class DexieAccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    return db.accounts.toArray()
  }

  async getById(id: string): Promise<Account | undefined> {
    return db.accounts.get(id)
  }

  async add(item: Omit<Account, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    await db.accounts.add({ ...item, id } as Account)
    return id
  }

  async bulkAdd(items: Omit<Account, 'id'>[]): Promise<string[]> {
    const withIds = items.map(item => ({ ...item, id: crypto.randomUUID() })) as Account[]
    await db.accounts.bulkAdd(withIds)
    return withIds.map(item => item.id!)
  }

  async update(id: string, changes: Partial<Account>): Promise<void> {
    await db.accounts.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await db.accounts.delete(id)
  }

  async count(): Promise<number> {
    return db.accounts.count()
  }

  async getActive(): Promise<Account[]> {
    return db.accounts.where('isActive').equals(1).toArray()
  }
}

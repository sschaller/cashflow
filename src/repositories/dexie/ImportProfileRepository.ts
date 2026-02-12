import { db } from '@/db/index.ts'
import type { ImportProfile } from '@/types/models.ts'
import type { IImportProfileRepository } from '@/repositories/interfaces.ts'

export class DexieImportProfileRepository implements IImportProfileRepository {
  async getAll(): Promise<ImportProfile[]> {
    return db.importProfiles.toArray()
  }

  async getById(id: number): Promise<ImportProfile | undefined> {
    return db.importProfiles.get(id)
  }

  async add(item: Omit<ImportProfile, 'id'>): Promise<number> {
    return db.importProfiles.add(item as ImportProfile)
  }

  async bulkAdd(items: Omit<ImportProfile, 'id'>[]): Promise<number[]> {
    return db.importProfiles.bulkAdd(items as ImportProfile[], { allKeys: true })
  }

  async update(id: number, changes: Partial<ImportProfile>): Promise<void> {
    await db.importProfiles.update(id, changes)
  }

  async delete(id: number): Promise<void> {
    await db.importProfiles.delete(id)
  }

  async count(): Promise<number> {
    return db.importProfiles.count()
  }

  async getByAccountId(accountId: number): Promise<ImportProfile[]> {
    return db.importProfiles.where('accountId').equals(accountId).toArray()
  }
}

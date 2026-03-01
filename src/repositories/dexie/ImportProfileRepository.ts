import { db } from '@/db/index.ts'
import type { ImportProfile } from '@/types/models.ts'
import type { IImportProfileRepository } from '@/repositories/interfaces.ts'

export class DexieImportProfileRepository implements IImportProfileRepository {
  async getAll(): Promise<ImportProfile[]> {
    return db.importProfiles.toArray()
  }

  async getById(id: string): Promise<ImportProfile | undefined> {
    return db.importProfiles.get(id)
  }

  async add(item: Omit<ImportProfile, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    await db.importProfiles.add({ ...item, id } as ImportProfile)
    return id
  }

  async bulkAdd(items: Omit<ImportProfile, 'id'>[]): Promise<string[]> {
    const withIds = items.map(item => ({ ...item, id: crypto.randomUUID() })) as ImportProfile[]
    await db.importProfiles.bulkAdd(withIds)
    return withIds.map(item => item.id!)
  }

  async update(id: string, changes: Partial<ImportProfile>): Promise<void> {
    await db.importProfiles.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await db.importProfiles.delete(id)
  }

  async count(): Promise<number> {
    return db.importProfiles.count()
  }

  async getByAccountId(accountId: string): Promise<ImportProfile[]> {
    return db.importProfiles.where('accountId').equals(accountId).toArray()
  }
}

import { db } from '@/db/index.ts'
import type { Category } from '@/types/models.ts'
import type { ICategoryRepository } from '@/repositories/interfaces.ts'

export class DexieCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    return db.categories.orderBy('sortOrder').filter(c => !c._deleted).toArray()
  }

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id)
  }

  async add(item: Omit<Category, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    await db.categories.add({ ...item, id } as Category)
    return id
  }

  async bulkAdd(items: Omit<Category, 'id'>[]): Promise<string[]> {
    const withIds = items.map(item => ({ ...item, id: crypto.randomUUID() })) as Category[]
    await db.categories.bulkAdd(withIds)
    return withIds.map(item => item.id!)
  }

  async update(id: string, changes: Partial<Category>): Promise<void> {
    await db.categories.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await db.categories.update(id, { _deleted: true })
  }

  async count(): Promise<number> {
    return db.categories.filter(c => !c._deleted).count()
  }

  async getTopLevel(): Promise<Category[]> {
    return db.categories.filter(c => c.parentId === null && !c._deleted).toArray()
      .then(results => results.sort((a, b) => a.sortOrder - b.sortOrder))
  }

  async getChildren(parentId: string): Promise<Category[]> {
    return db.categories.where('parentId').equals(parentId).filter(c => !c._deleted).sortBy('sortOrder')
  }

  async getAllWithHierarchy(): Promise<Category[]> {
    return db.categories.orderBy('sortOrder').filter(c => !c._deleted).toArray()
  }
}

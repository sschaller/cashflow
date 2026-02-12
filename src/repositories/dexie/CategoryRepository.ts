import { db } from '@/db/index.ts'
import type { Category } from '@/types/models.ts'
import type { ICategoryRepository } from '@/repositories/interfaces.ts'

export class DexieCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    return db.categories.orderBy('sortOrder').toArray()
  }

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id)
  }

  async add(item: Omit<Category, 'id'>): Promise<number> {
    return db.categories.add(item as Category)
  }

  async bulkAdd(items: Omit<Category, 'id'>[]): Promise<number[]> {
    return db.categories.bulkAdd(items as Category[], { allKeys: true })
  }

  async update(id: number, changes: Partial<Category>): Promise<void> {
    await db.categories.update(id, changes)
  }

  async delete(id: number): Promise<void> {
    await db.categories.delete(id)
  }

  async count(): Promise<number> {
    return db.categories.count()
  }

  async getTopLevel(): Promise<Category[]> {
    return db.categories.where('parentId').equals(0).or('parentId').equals('').toArray()
      .then(results => {
        // Also get items where parentId is null (stored as 0 in IndexedDB)
        return db.categories.filter(c => c.parentId === null).toArray()
          .then(nullParents => {
            const ids = new Set(results.map(r => r.id))
            const combined = [...results]
            for (const item of nullParents) {
              if (!ids.has(item.id)) combined.push(item)
            }
            return combined.sort((a, b) => a.sortOrder - b.sortOrder)
          })
      })
  }

  async getChildren(parentId: number): Promise<Category[]> {
    return db.categories.where('parentId').equals(parentId).sortBy('sortOrder')
  }

  async getAllWithHierarchy(): Promise<Category[]> {
    return db.categories.orderBy('sortOrder').toArray()
  }
}

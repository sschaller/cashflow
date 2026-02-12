import { db } from '@/db/index.ts'
import type { Rule } from '@/types/models.ts'
import type { IRuleRepository } from '@/repositories/interfaces.ts'

export class DexieRuleRepository implements IRuleRepository {
  async getAll(): Promise<Rule[]> {
    return db.rules.orderBy('priority').toArray()
  }

  async getById(id: number): Promise<Rule | undefined> {
    return db.rules.get(id)
  }

  async add(item: Omit<Rule, 'id'>): Promise<number> {
    return db.rules.add(item as Rule)
  }

  async bulkAdd(items: Omit<Rule, 'id'>[]): Promise<number[]> {
    return db.rules.bulkAdd(items as Rule[], { allKeys: true })
  }

  async update(id: number, changes: Partial<Rule>): Promise<void> {
    await db.rules.update(id, changes)
  }

  async delete(id: number): Promise<void> {
    await db.rules.delete(id)
  }

  async count(): Promise<number> {
    return db.rules.count()
  }

  async getEnabled(): Promise<Rule[]> {
    return db.rules.where('isEnabled').equals(1).sortBy('priority')
  }

  async getByCategoryId(categoryId: number): Promise<Rule[]> {
    return db.rules.where('categoryId').equals(categoryId).toArray()
  }
}

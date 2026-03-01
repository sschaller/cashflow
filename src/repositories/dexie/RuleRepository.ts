import { db } from '@/db/index.ts'
import type { Rule } from '@/types/models.ts'
import type { IRuleRepository } from '@/repositories/interfaces.ts'

export class DexieRuleRepository implements IRuleRepository {
  async getAll(): Promise<Rule[]> {
    return db.rules.orderBy('priority').toArray()
  }

  async getById(id: string): Promise<Rule | undefined> {
    return db.rules.get(id)
  }

  async add(item: Omit<Rule, 'id'>): Promise<string> {
    const id = crypto.randomUUID()
    await db.rules.add({ ...item, id } as Rule)
    return id
  }

  async bulkAdd(items: Omit<Rule, 'id'>[]): Promise<string[]> {
    const withIds = items.map(item => ({ ...item, id: crypto.randomUUID() })) as Rule[]
    await db.rules.bulkAdd(withIds)
    return withIds.map(item => item.id!)
  }

  async update(id: string, changes: Partial<Rule>): Promise<void> {
    await db.rules.update(id, changes)
  }

  async delete(id: string): Promise<void> {
    await db.rules.delete(id)
  }

  async count(): Promise<number> {
    return db.rules.count()
  }

  async getEnabled(): Promise<Rule[]> {
    return db.rules.filter((r) => r.isEnabled).sortBy('priority')
  }

  async getByCategoryId(categoryId: string): Promise<Rule[]> {
    return db.rules.where('categoryId').equals(categoryId).toArray()
  }
}

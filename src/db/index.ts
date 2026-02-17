import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Account, Transaction, Category, Rule, ImportProfile } from '@/types/models.ts'

export class FinanceDB extends Dexie {
  accounts!: Table<Account, number>
  transactions!: Table<Transaction, number>
  categories!: Table<Category, number>
  rules!: Table<Rule, number>
  importProfiles!: Table<ImportProfile, number>

  constructor() {
    super('FinanceDB')

    this.version(1).stores({
      accounts: '++id, name, type, isActive',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId',
      categories: '++id, parentId, name, sortOrder',
      rules: '++id, categoryId, priority, isEnabled',
      importProfiles: '++id, name, accountId',
    })

    // Version 2: add updatedAt for sync support
    this.version(2).stores({
      accounts: '++id, name, type, isActive, updatedAt',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId, updatedAt',
      categories: '++id, parentId, name, sortOrder, updatedAt',
      rules: '++id, categoryId, priority, isEnabled, updatedAt',
      importProfiles: '++id, name, accountId, updatedAt',
    }).upgrade(tx => {
      const now = new Date().toISOString()
      return Promise.all([
        tx.table('transactions').toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = record.importedAt || now
        }),
        tx.table('categories').toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now
        }),
        tx.table('rules').toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now
        }),
        tx.table('importProfiles').toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = now
        }),
        tx.table('accounts').toCollection().modify(record => {
          if (!record.updatedAt) record.updatedAt = record.createdAt || now
        }),
      ])
    })

    // Version 3: deduplicate categories created by non-deterministic seeding
    this.version(3).stores({
      accounts: '++id, name, type, isActive, updatedAt',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId, updatedAt',
      categories: '++id, parentId, name, sortOrder, updatedAt',
      rules: '++id, categoryId, priority, isEnabled, updatedAt',
      importProfiles: '++id, name, accountId, updatedAt',
    }).upgrade(async tx => {
      const categories = await tx.table('categories').toArray()
      const idRemap = new Map<number, number>()
      const toDelete: number[] = []

      // Dedup top-level categories by name
      const topByName = new Map<string, { id: number; name: string; parentId: number | null }>()
      for (const cat of categories) {
        if (cat.parentId !== null) continue
        const existing = topByName.get(cat.name)
        if (!existing) {
          topByName.set(cat.name, cat)
        } else {
          const [keep, discard] = existing.id < cat.id ? [existing, cat] : [cat, existing]
          topByName.set(cat.name, keep)
          idRemap.set(discard.id, keep.id)
          toDelete.push(discard.id)
        }
      }

      // Dedup subcategories by (name, remapped parentId)
      const subByKey = new Map<string, { id: number }>()
      for (const cat of categories) {
        if (cat.parentId === null) continue
        const remappedParent = idRemap.get(cat.parentId) ?? cat.parentId
        const key = `${remappedParent}:${cat.name}`
        const existing = subByKey.get(key)
        if (!existing) {
          subByKey.set(key, cat)
        } else {
          const [keep, discard] = existing.id < cat.id ? [existing, cat] : [cat, existing]
          subByKey.set(key, keep)
          idRemap.set(discard.id, keep.id)
          toDelete.push(discard.id)
        }
      }

      if (idRemap.size === 0) return

      // Remap parentId in subcategories pointing to deduplicated parents
      await tx.table('categories').toCollection().modify(record => {
        if (record.parentId !== null && idRemap.has(record.parentId)) {
          record.parentId = idRemap.get(record.parentId)
        }
      })

      // Remap categoryId in transactions and rules
      await tx.table('transactions').toCollection().modify(record => {
        if (record.categoryId != null && idRemap.has(record.categoryId)) {
          record.categoryId = idRemap.get(record.categoryId)
        }
      })
      await tx.table('rules').toCollection().modify(record => {
        if (record.categoryId != null && idRemap.has(record.categoryId)) {
          record.categoryId = idRemap.get(record.categoryId)
        }
      })

      // Delete duplicate categories
      await tx.table('categories').bulkDelete(toDelete)
    })

    // Version 4: add displayDescription to transactions and rules (no index changes needed)
    this.version(4).stores({
      accounts: '++id, name, type, isActive, updatedAt',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId, updatedAt',
      categories: '++id, parentId, name, sortOrder, updatedAt',
      rules: '++id, categoryId, priority, isEnabled, updatedAt',
      importProfiles: '++id, name, accountId, updatedAt',
    })

    // Version 5: remove system Uncategorized category, clear orphaned categoryIds
    this.version(5).stores({
      accounts: '++id, name, type, isActive, updatedAt',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId, updatedAt',
      categories: '++id, parentId, name, sortOrder, updatedAt',
      rules: '++id, categoryId, priority, isEnabled, updatedAt',
      importProfiles: '++id, name, accountId, updatedAt',
    }).upgrade(async tx => {
      const cats = await tx.table('categories').toArray()
      const uncatIds = cats.filter((c: Category) => c.isSystem && c.name === 'Uncategorized').map((c: Category) => c.id!)
      const validCatIds = new Set(cats.map((c: Category) => c.id!))

      // Clear categoryId on transactions pointing to Uncategorized or non-existent categories
      await tx.table('transactions').toCollection().modify((t: Transaction) => {
        if (t.categoryId != null && (uncatIds.includes(t.categoryId) || !validCatIds.has(t.categoryId))) {
          delete (t as Record<string, unknown>).categoryId
        }
      })

      // Delete the Uncategorized category records
      if (uncatIds.length > 0) {
        await tx.table('categories').bulkDelete(uncatIds)
      }
    })

    // Auto-set updatedAt on every write
    const tables = [this.accounts, this.transactions, this.categories, this.rules, this.importProfiles]
    for (const table of tables) {
      table.hook('creating', (_primKey, obj) => {
        if (!obj.updatedAt) {
          obj.updatedAt = new Date().toISOString()
        }
      })
      table.hook('updating', (modifications) => {
        if (!('updatedAt' in modifications)) {
          return { ...modifications, updatedAt: new Date().toISOString() }
        }
        return modifications
      })
    }
  }
}

export const db = new FinanceDB()

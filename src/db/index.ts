import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { Account, Transaction, Category, Rule, ImportProfile } from '@/types/models.ts'

// --- Change notification system (Phase 4) ---

type ChangeListener = () => void
const changeListeners: Set<ChangeListener> = new Set()
let syncApplying = false

export function onDatabaseChange(listener: ChangeListener): () => void {
  changeListeners.add(listener)
  return () => { changeListeners.delete(listener) }
}

export function setSyncApplying(flag: boolean): void {
  syncApplying = flag
}

function notifyChange(): void {
  if (syncApplying) return
  for (const listener of changeListeners) {
    listener()
  }
}

// --- Database ---

export class FinanceDB extends Dexie {
  accounts!: Table<Account, string>
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  rules!: Table<Rule, string>
  importProfiles!: Table<ImportProfile, string>

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
      const uncatIds = cats.filter((c: { isSystem: boolean; name: string; id: number }) => c.isSystem && c.name === 'Uncategorized').map((c: { id: number }) => c.id)
      const validCatIds = new Set(cats.map((c: { id: number }) => c.id))

      // Clear categoryId on transactions pointing to Uncategorized or non-existent categories
      await tx.table('transactions').toCollection().modify((t: { categoryId?: number }) => {
        if (t.categoryId != null && (uncatIds.includes(t.categoryId) || !validCatIds.has(t.categoryId))) {
          delete (t as unknown as Record<string, unknown>).categoryId
        }
      })

      // Delete the Uncategorized category records
      if (uncatIds.length > 0) {
        await tx.table('categories').bulkDelete(uncatIds)
      }
    })

    // Version 6: Migrate from auto-increment numeric IDs to string UUIDs
    // Keep ++id schema — Dexie doesn't support changing primary keys.
    // The ++ auto-increment is harmless since our repos always provide UUID ids.
    this.version(6).stores({
      accounts: '++id, name, type, isActive, updatedAt',
      transactions: '++id, [accountId+date], [categoryId+date], hash, date, type, accountId, categoryId, updatedAt',
      categories: '++id, parentId, name, sortOrder, updatedAt',
      rules: '++id, categoryId, priority, isEnabled, updatedAt',
      importProfiles: '++id, name, accountId, updatedAt',
    }).upgrade(async tx => {
      // Build a global oldId → UUID map for all tables
      const idMaps = {
        accounts: new Map<number, string>(),
        categories: new Map<number, string>(),
        rules: new Map<number, string>(),
        importProfiles: new Map<number, string>(),
        transactions: new Map<number, string>(),
      }

      // Read all records from all tables
      const [accounts, transactions, categories, rules, importProfiles] = await Promise.all([
        tx.table('accounts').toArray(),
        tx.table('transactions').toArray(),
        tx.table('categories').toArray(),
        tx.table('rules').toArray(),
        tx.table('importProfiles').toArray(),
      ])

      // Generate UUIDs for all records
      for (const rec of accounts) {
        idMaps.accounts.set(rec.id, crypto.randomUUID())
      }
      for (const rec of categories) {
        idMaps.categories.set(rec.id, crypto.randomUUID())
      }
      for (const rec of rules) {
        idMaps.rules.set(rec.id, crypto.randomUUID())
      }
      for (const rec of importProfiles) {
        idMaps.importProfiles.set(rec.id, crypto.randomUUID())
      }
      for (const rec of transactions) {
        idMaps.transactions.set(rec.id, crypto.randomUUID())
      }

      // Clear all tables
      await Promise.all([
        tx.table('accounts').clear(),
        tx.table('transactions').clear(),
        tx.table('categories').clear(),
        tx.table('rules').clear(),
        tx.table('importProfiles').clear(),
      ])

      // Re-insert with remapped IDs and FKs
      if (accounts.length) {
        await tx.table('accounts').bulkAdd(accounts.map((rec: Record<string, unknown>) => ({
          ...rec,
          id: idMaps.accounts.get(rec.id as number),
        })))
      }

      if (categories.length) {
        await tx.table('categories').bulkAdd(categories.map((rec: Record<string, unknown>) => ({
          ...rec,
          id: idMaps.categories.get(rec.id as number),
          parentId: rec.parentId != null ? (idMaps.categories.get(rec.parentId as number) ?? null) : null,
        })))
      }

      if (rules.length) {
        await tx.table('rules').bulkAdd(rules.map((rec: Record<string, unknown>) => ({
          ...rec,
          id: idMaps.rules.get(rec.id as number),
          categoryId: rec.categoryId != null ? idMaps.categories.get(rec.categoryId as number) : undefined,
        })))
      }

      if (importProfiles.length) {
        await tx.table('importProfiles').bulkAdd(importProfiles.map((rec: Record<string, unknown>) => ({
          ...rec,
          id: idMaps.importProfiles.get(rec.id as number),
          accountId: idMaps.accounts.get(rec.accountId as number) ?? rec.accountId,
        })))
      }

      if (transactions.length) {
        await tx.table('transactions').bulkAdd(transactions.map((rec: Record<string, unknown>) => ({
          ...rec,
          id: idMaps.transactions.get(rec.id as number),
          accountId: idMaps.accounts.get(rec.accountId as number) ?? rec.accountId,
          categoryId: rec.categoryId != null ? idMaps.categories.get(rec.categoryId as number) : undefined,
          importProfileId: rec.importProfileId != null ? idMaps.importProfiles.get(rec.importProfileId as number) : undefined,
        })))
      }
    })

    // Auto-set updatedAt on every write + notify change listeners
    const tables = [this.accounts, this.transactions, this.categories, this.rules, this.importProfiles]
    for (const table of tables) {
      table.hook('creating', (_primKey, obj) => {
        if (!obj.updatedAt) {
          obj.updatedAt = new Date().toISOString()
        }
        notifyChange()
      })
      table.hook('updating', (modifications) => {
        notifyChange()
        if (!('updatedAt' in modifications)) {
          return { ...modifications, updatedAt: new Date().toISOString() }
        }
        return modifications
      })
    }
  }
}

export const db = new FinanceDB()

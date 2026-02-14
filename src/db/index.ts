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

    // Auto-set updatedAt on every write
    const tables = [this.accounts, this.transactions, this.categories, this.rules, this.importProfiles]
    for (const table of tables) {
      table.hook('creating', (_primKey, obj) => {
        obj.updatedAt = new Date().toISOString()
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

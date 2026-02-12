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
  }
}

export const db = new FinanceDB()

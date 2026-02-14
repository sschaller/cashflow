import type { Account, Transaction, Category, Rule, ImportProfile } from './models.ts'

export interface SyncSnapshot {
  version: number
  syncVersion: number
  timestamp: string
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  rules: Rule[]
  importProfiles: ImportProfile[]
}

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'error'
  | 'needs-passphrase'
  | 'needs-auth'

import type { AccountType, TransactionType, ImportFormat, RuleOperator, RuleField } from './enums.ts'

export interface Account {
  id?: number
  name: string
  type: AccountType
  institution: string
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _syncVersion?: number
  _deleted?: boolean
}

export interface Transaction {
  id?: number
  date: string
  amount: number
  description: string
  normalizedDescription: string
  displayDescription?: string
  accountId: number
  categoryId?: number
  type: TransactionType
  tags: string[]
  notes: string
  bankCategory?: string
  hash: string
  isManualCategory: boolean
  isManualDescription?: boolean
  importProfileId?: number
  importedAt: string
  updatedAt?: string
  _syncVersion?: number
  _deleted?: boolean
}

export interface Category {
  id?: number
  name: string
  parentId: number | null
  color: string
  icon: string
  isSystem: boolean
  sortOrder: number
  updatedAt?: string
  _syncVersion?: number
  _deleted?: boolean
}

export interface RuleCondition {
  field: RuleField
  operator: RuleOperator
  value: string
  valueTo?: string
}

export interface Rule {
  id?: number
  name: string
  conditions: RuleCondition[]
  categoryId?: number
  displayDescription?: string
  priority: number
  isEnabled: boolean
  updatedAt?: string
  _syncVersion?: number
  _deleted?: boolean
}

export interface ColumnMapping {
  date: string
  amount: string
  description: string
  amountIn?: string
  amountOut?: string
  category?: string
  notes?: string
}

export interface AmountConfig {
  mode: 'single' | 'split'
  negativeExpenses: boolean
  decimalSeparator: string
  thousandsSeparator: string
}

export interface ImportProfile {
  id?: number
  name: string
  format: ImportFormat
  accountId: number
  columnMapping: ColumnMapping
  dateFormat: string
  amountConfig: AmountConfig
  skipRows: number
  encoding: string
  updatedAt?: string
  _syncVersion?: number
  _deleted?: boolean
}

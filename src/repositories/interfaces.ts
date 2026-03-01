import type { Account, Transaction, Category, Rule, ImportProfile } from '@/types/models.ts'

export interface IRepository<T> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | undefined>
  add(item: Omit<T, 'id'>): Promise<string>
  bulkAdd(items: Omit<T, 'id'>[]): Promise<string[]>
  update(id: string, changes: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
  count(): Promise<number>
}

export interface ITransactionRepository extends IRepository<Transaction> {
  getByAccountId(accountId: string): Promise<Transaction[]>
  getByCategoryId(categoryId: string): Promise<Transaction[]>
  getByDateRange(start: string, end: string): Promise<Transaction[]>
  getByHash(hash: string): Promise<Transaction | undefined>
  getFiltered(filters: TransactionFilters): Promise<Transaction[]>
}

export interface ICategoryRepository extends IRepository<Category> {
  getTopLevel(): Promise<Category[]>
  getChildren(parentId: string): Promise<Category[]>
  getAllWithHierarchy(): Promise<Category[]>
}

export interface IAccountRepository extends IRepository<Account> {
  getActive(): Promise<Account[]>
}

export interface IRuleRepository extends IRepository<Rule> {
  getEnabled(): Promise<Rule[]>
  getByCategoryId(categoryId: string): Promise<Rule[]>
}

export interface IImportProfileRepository extends IRepository<ImportProfile> {
  getByAccountId(accountId: string): Promise<ImportProfile[]>
}

export interface TransactionFilters {
  accountId?: string
  categoryId?: string
  type?: 'income' | 'expense' | 'transfer'
  startDate?: string
  endDate?: string
  search?: string
  minAmount?: number
  maxAmount?: number
  tags?: string[]
}

export interface RepositoryProvider {
  transactions: ITransactionRepository
  categories: ICategoryRepository
  accounts: IAccountRepository
  rules: IRuleRepository
  importProfiles: IImportProfileRepository
}

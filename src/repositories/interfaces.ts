import type { Account, Transaction, Category, Rule, ImportProfile } from '@/types/models.ts'

export interface IRepository<T> {
  getAll(): Promise<T[]>
  getById(id: number): Promise<T | undefined>
  add(item: Omit<T, 'id'>): Promise<number>
  bulkAdd(items: Omit<T, 'id'>[]): Promise<number[]>
  update(id: number, changes: Partial<T>): Promise<void>
  delete(id: number): Promise<void>
  count(): Promise<number>
}

export interface ITransactionRepository extends IRepository<Transaction> {
  getByAccountId(accountId: number): Promise<Transaction[]>
  getByCategoryId(categoryId: number): Promise<Transaction[]>
  getByDateRange(start: string, end: string): Promise<Transaction[]>
  getByHash(hash: string): Promise<Transaction | undefined>
  getFiltered(filters: TransactionFilters): Promise<Transaction[]>
}

export interface ICategoryRepository extends IRepository<Category> {
  getTopLevel(): Promise<Category[]>
  getChildren(parentId: number): Promise<Category[]>
  getAllWithHierarchy(): Promise<Category[]>
}

export interface IAccountRepository extends IRepository<Account> {
  getActive(): Promise<Account[]>
}

export interface IRuleRepository extends IRepository<Rule> {
  getEnabled(): Promise<Rule[]>
  getByCategoryId(categoryId: number): Promise<Rule[]>
}

export interface IImportProfileRepository extends IRepository<ImportProfile> {
  getByAccountId(accountId: number): Promise<ImportProfile[]>
}

export interface TransactionFilters {
  accountId?: number
  categoryId?: number
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

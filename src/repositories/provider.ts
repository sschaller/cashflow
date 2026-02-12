import type { RepositoryProvider } from './interfaces.ts'
import { DexieTransactionRepository } from './dexie/TransactionRepository.ts'
import { DexieCategoryRepository } from './dexie/CategoryRepository.ts'
import { DexieAccountRepository } from './dexie/AccountRepository.ts'
import { DexieRuleRepository } from './dexie/RuleRepository.ts'
import { DexieImportProfileRepository } from './dexie/ImportProfileRepository.ts'

export function createLocalProvider(): RepositoryProvider {
  return {
    transactions: new DexieTransactionRepository(),
    categories: new DexieCategoryRepository(),
    accounts: new DexieAccountRepository(),
    rules: new DexieRuleRepository(),
    importProfiles: new DexieImportProfileRepository(),
  }
}

// Singleton for the app
let _provider: RepositoryProvider | null = null

export function getProvider(): RepositoryProvider {
  if (!_provider) {
    _provider = createLocalProvider()
  }
  return _provider
}

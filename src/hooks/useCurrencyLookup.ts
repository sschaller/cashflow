import { useMemo } from 'react'
import type { Account, Transaction } from '@/types/models.ts'

export function useCurrencyLookup(accounts: Account[]): Map<string, string> {
  return useMemo(() => {
    const map = new Map<string, string>()
    for (const a of accounts) {
      if (a.id != null) map.set(a.id, a.currency)
    }
    return map
  }, [accounts])
}

export function getUniqueCurrency(
  transactions: Transaction[],
  currencyMap: Map<string, string>,
): string | null {
  const currencies = new Set<string>()
  for (const t of transactions) {
    currencies.add(currencyMap.get(t.accountId) ?? 'USD')
  }
  return currencies.size === 1 ? currencies.values().next().value! : null
}

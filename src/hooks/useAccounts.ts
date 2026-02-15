import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import type { Account } from '@/types/models.ts'

export function useAccounts(): Account[] {
  const accounts = useLiveQuery(() => db.accounts.toArray())
  return accounts ?? []
}

import { useSyncStore } from '@/stores/useSyncStore.ts'

export function useSync() {
  const status = useSyncStore((s) => s.status)
  const isSyncEnabled = useSyncStore((s) => s.isSyncEnabled)
  const isReady = useSyncStore((s) => s.isAuthenticated && s.cryptoKey !== null)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const lastError = useSyncStore((s) => s.lastError)
  const syncNow = useSyncStore((s) => s.syncNow)

  return { status, isSyncEnabled, isReady, lastSyncAt, lastError, syncNow }
}

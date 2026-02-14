import { useEffect, useRef, type ReactNode } from 'react'
import { useSyncStore } from '@/stores/useSyncStore.ts'

interface SyncProviderProps {
  children: ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const isSyncEnabled = useSyncStore((s) => s.isSyncEnabled)
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const cryptoKey = useSyncStore((s) => s.cryptoKey)
  const autoSyncInterval = useSyncStore((s) => s.autoSyncInterval)
  const syncNow = useSyncStore((s) => s.syncNow)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isSyncEnabled && isAuthenticated && cryptoKey) {
      // Sync immediately when ready
      syncNow()

      // Periodic sync
      intervalRef.current = setInterval(syncNow, autoSyncInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isSyncEnabled, isAuthenticated, cryptoKey, autoSyncInterval, syncNow])

  return <>{children}</>
}
